import {
  calcularDre,
  type DadosDre,
  type ResultadoDre,
} from "@/lib/regras-negocio";
import type { PapelSessao } from "@/lib/session";

export const FORMAS_PAGAMENTO_DRE = [
  "Dinheiro",
  "PIX",
  "Cartão de Crédito",
  "Crediário/Fiado",
] as const;

export type FormaPagamentoDre = (typeof FORMAS_PAGAMENTO_DRE)[number];
export type PagamentosDre = Record<FormaPagamentoDre, number>;

export interface ResumoDre {
  periodo: string;
  faturamentoBruto: number;
  cogs: number;
  despesasOperacionais: number;
  resultado: ResultadoDre;
  pagamentos: PagamentosDre;
}

export interface DemonstrativoDre {
  mensal: ResumoDre;
  trimestre: ResumoDre;
}

const TENANT_DEMONSTRACAO_ID = "tenant-matcom";

const DADOS_MENSAIS_DEMONSTRATIVOS: Array<
  DadosDre & { pagamentos: PagamentosDre }
> = [
  {
    faturamentoBruto: 128450.8,
    cogs: 82100.2,
    despesasOperacionais: 18600,
    pagamentos: {
      Dinheiro: 12000,
      PIX: 48200,
      "Cartão de Crédito": 39150.8,
      "Crediário/Fiado": 29100,
    },
  },
  {
    faturamentoBruto: 136800,
    cogs: 87200,
    despesasOperacionais: 19450,
    pagamentos: {
      Dinheiro: 14000,
      PIX: 51000,
      "Cartão de Crédito": 42000,
      "Crediário/Fiado": 29800,
    },
  },
  {
    faturamentoBruto: 119900,
    cogs: 75850,
    despesasOperacionais: 17800,
    pagamentos: {
      Dinheiro: 11000,
      PIX: 44500,
      "Cartão de Crédito": 36200,
      "Crediário/Fiado": 28200,
    },
  },
];

export function podeAcessarDre(
  papel: PapelSessao | null | undefined,
): boolean {
  return (
    papel === "FINANCEIRO" ||
    papel === "GERENTE_LOJA" ||
    papel === "SUPER_ADMIN"
  );
}

function validarPeriodo(periodo: string): { ano: number; mes: number } {
  const partes = /^(\d{4})-(\d{2})$/.exec(periodo);
  const ano = Number(partes?.[1]);
  const mes = Number(partes?.[2]);

  if (!partes || mes < 1 || mes > 12) {
    throw new Error("Período inválido. Use o formato AAAA-MM.");
  }

  return { ano, mes };
}

function montarResumo(
  periodo: string,
  dados: DadosDre & { pagamentos: PagamentosDre },
): ResumoDre {
  return {
    periodo,
    faturamentoBruto: dados.faturamentoBruto,
    cogs: dados.cogs,
    despesasOperacionais: dados.despesasOperacionais,
    resultado: calcularDre(dados),
    pagamentos: { ...dados.pagamentos },
  };
}

function agregarMeses(
  periodo: string,
  meses: Array<DadosDre & { pagamentos: PagamentosDre }>,
): ResumoDre {
  const dadosAgregados = meses.reduce<DadosDre & { pagamentos: PagamentosDre }>(
    (total, mes) => ({
      faturamentoBruto: total.faturamentoBruto + mes.faturamentoBruto,
      cogs: total.cogs + mes.cogs,
      despesasOperacionais:
        total.despesasOperacionais + mes.despesasOperacionais,
      pagamentos: FORMAS_PAGAMENTO_DRE.reduce(
        (pagamentos, forma) => ({
          ...pagamentos,
          [forma]: pagamentos[forma] + mes.pagamentos[forma],
        }),
        { Dinheiro: 0, PIX: 0, "Cartão de Crédito": 0, "Crediário/Fiado": 0 },
      ),
    }),
    {
      faturamentoBruto: 0,
      cogs: 0,
      despesasOperacionais: 0,
      pagamentos: {
        Dinheiro: 0,
        PIX: 0,
        "Cartão de Crédito": 0,
        "Crediário/Fiado": 0,
      },
    },
  );

  return montarResumo(periodo, dadosAgregados);
}

function rotuloMes(ano: number, mes: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, 1)));
}

export function obterDemonstrativoDre(
  tenantId: string,
  periodo: string,
): DemonstrativoDre | null {
  if (!tenantId.trim()) {
    throw new Error("Tenant obrigatório para consultar a DRE.");
  }

  const { ano, mes } = validarPeriodo(periodo);
  if (tenantId !== TENANT_DEMONSTRACAO_ID) return null;

  const dadosMes = DADOS_MENSAIS_DEMONSTRATIVOS[(mes - 1) % 3];
  const mensal = montarResumo(rotuloMes(ano, mes), dadosMes);
  const trimestre = Math.ceil(mes / 3);
  const primeiroMesTrimestre = (trimestre - 1) * 3 + 1;
  const dadosTrimestre = Array.from({ length: 3 }, (_, indice) => {
    const mesTrimestre = primeiroMesTrimestre + indice;
    return DADOS_MENSAIS_DEMONSTRATIVOS[(mesTrimestre - 1) % 3];
  });

  return {
    mensal,
    trimestre: agregarMeses(`T${trimestre} ${ano}`, dadosTrimestre),
  };
}
