/**
 * Serviço de orçamentos e cotações do MatCom.
 *
 * Concentra as regras puras de:
 * - cálculo de subtotal/total com desconto;
 * - validade e expiração da proposta;
 * - indicadores do painel de cotações;
 * - conversão de orçamento em comanda de pré-venda para a Fila do Caixa,
 *   validando a validade e o saldo disponível no galpão.
 *
 * Nenhuma função aqui acessa banco, Prisma ou React — tudo é determinístico
 * para permitir testes unitários e reuso em Server Actions.
 */

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

export type StatusOrcamento =
  | "ABERTO"
  | "CONVERTIDO"
  | "EXPIRADO"
  | "CANCELADO";

export type CondicaoPagamentoOrcamento = "PIX" | "CARTAO_12X" | "CREDIARIO";

export type UnidadeMedida = "M2" | "KG" | "UN" | "CX";

export type StatusComanda = "AGUARDANDO_CAIXA";

export interface ClienteOrcamento {
  id: string;
  nome: string;
  documento: string;
}

export interface ItemOrcamento {
  produtoId: string;
  descricao: string;
  unidade: UnidadeMedida;
  quantidade: number;
  /** Preço unitário da tabela (varejo/atacado) no momento da proposta. */
  precoTabela: number;
  /** Desconto comercial concedido no item, em percentual (0–100). */
  descontoPercent?: number;
}

export interface Orcamento {
  id: string;
  numero: string;
  /** `null` representa o Cliente Balcão, sem cadastro identificado. */
  cliente: ClienteOrcamento | null;
  vendedor: string;
  /** Data de emissão no formato ISO `YYYY-MM-DD`. */
  dataEmissao: string;
  validadeDias: number;
  condicaoPagamento: CondicaoPagamentoOrcamento;
  observacoes?: string;
  status: StatusOrcamento;
  itens: ItemOrcamento[];
}

export interface PosicaoEstoque {
  produtoId: string;
  descricao?: string;
  saldoDisponivel: number;
}

export interface ItemComandaPreVenda {
  produtoId: string;
  descricao: string;
  unidade: UnidadeMedida;
  quantidade: number;
  precoUnitario: number;
  descontoPercent: number;
  subtotal: number;
}

export interface ComandaPreVenda {
  id: string;
  numero: string;
  orcamentoNumero: string;
  clienteNome: string;
  clienteDocumento: string | null;
  vendedor: string;
  condicaoPagamento: CondicaoPagamentoOrcamento;
  total: number;
  status: StatusComanda;
  origem: "ORCAMENTO";
  criadaEm: string;
  itens: ItemComandaPreVenda[];
}

export interface ItemSemEstoque {
  produtoId: string;
  descricao: string;
  solicitado: number;
  disponivel: number;
}

export type ResultadoConversao =
  | {
      ok: true;
      comanda: ComandaPreVenda;
      avisos: string[];
    }
  | {
      ok: false;
      erros: string[];
      itensSemEstoque: ItemSemEstoque[];
    };

export interface IndicadoresOrcamentos {
  totalNoMes: number;
  convertidosNoMes: number;
  taxaConversaoPercent: number;
  valorTotalCotado: number;
  prestesAExpirar: number;
}

/** Quantos dias antes do vencimento um orçamento entra no alerta. */
export const DIAS_ALERTA_EXPIRACAO = 3;

const MS_POR_DIA = 86_400_000;

/* -------------------------------------------------------------------------- */
/*                             Utilitários internos                           */
/* -------------------------------------------------------------------------- */

function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

function normalizarData(valor: string | Date): Date {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      throw new Error("Data de referência inválida.");
    }

    return new Date(
      Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()),
    );
  }

  const somenteData = valor.slice(0, 10);
  const data = new Date(`${somenteData}T00:00:00.000Z`);

  if (Number.isNaN(data.getTime())) {
    throw new Error(`Data inválida: ${valor}.`);
  }

  return data;
}

function validarQuantidade(quantidade: number): void {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error(`Quantidade inválida: ${quantidade}.`);
  }
}

/* -------------------------------------------------------------------------- */
/*                         1. Subtotal e total do orçamento                   */
/* -------------------------------------------------------------------------- */

/**
 * Calcula o subtotal de um item aplicando o desconto percentual.
 * O resultado é arredondado em duas casas para bater com o valor de tela.
 */
export function calcularSubtotalItem(item: ItemOrcamento): number {
  validarQuantidade(item.quantidade);

  if (!Number.isFinite(item.precoTabela) || item.precoTabela < 0) {
    throw new Error(`Preço de tabela inválido: ${item.precoTabela}.`);
  }

  const desconto = item.descontoPercent ?? 0;

  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
    throw new Error(`Desconto inválido: ${desconto}.`);
  }

  const bruto = item.quantidade * item.precoTabela;
  return arredondar(bruto * (1 - desconto / 100));
}

/** Soma os subtotais dos itens já com desconto aplicado. */
export function calcularTotalOrcamento(itens: ItemOrcamento[]): number {
  return arredondar(
    itens.reduce((total, item) => total + calcularSubtotalItem(item), 0),
  );
}

/* -------------------------------------------------------------------------- */
/*                          2. Validade do orçamento                          */
/* -------------------------------------------------------------------------- */

/**
 * Retorna os dias restantes até o vencimento.
 *
 * `0` significa que o orçamento vence hoje; valores negativos indicam que o
 * prazo já passou. A conta é feita em datas puras (meia-noite UTC) para não
 * sofrer variação de fuso horário.
 */
export function calcularDiasRestantes(
  dataEmissao: string,
  validadeDias: number,
  referencia: string | Date = new Date(),
): number {
  if (!Number.isFinite(validadeDias) || validadeDias < 0) {
    throw new Error(`Validade inválida: ${validadeDias}.`);
  }

  const emissao = normalizarData(dataEmissao);
  const vencimento = new Date(
    emissao.getTime() + Math.trunc(validadeDias) * MS_POR_DIA,
  );
  const diaReferencia = normalizarData(referencia);

  return Math.round(
    (vencimento.getTime() - diaReferencia.getTime()) / MS_POR_DIA,
  );
}

/**
 * Resolve o status exibido: um orçamento ABERTO cujo prazo passou aparece
 * como EXPIRADO sem precisar de mutação no registro.
 */
export function statusEfetivoOrcamento(
  orcamento: Orcamento,
  referencia: string | Date = new Date(),
): StatusOrcamento {
  if (orcamento.status !== "ABERTO") {
    return orcamento.status;
  }

  const diasRestantes = calcularDiasRestantes(
    orcamento.dataEmissao,
    orcamento.validadeDias,
    referencia,
  );

  return diasRestantes < 0 ? "EXPIRADO" : "ABERTO";
}

export function orcamentoEstaExpirado(
  orcamento: Orcamento,
  referencia: string | Date = new Date(),
): boolean {
  return statusEfetivoOrcamento(orcamento, referencia) === "EXPIRADO";
}

/* -------------------------------------------------------------------------- */
/*                       3. Indicadores do cabeçalho                          */
/* -------------------------------------------------------------------------- */

/**
 * Consolida os indicadores do painel.
 *
 * - Total no mês considera a data de emissão no mês de referência.
 * - Taxa de conversão = convertidos / total emitido no mês.
 * - Valor cotado soma propostas ABERTAS e CONVERTIDAS do mês.
 * - Prestes a expirar conta propostas ABERTAS com até 3 dias de validade,
 *   independentemente do mês de emissão.
 */
export function calcularIndicadoresOrcamentos(
  orcamentos: Orcamento[],
  referencia: string | Date = new Date(),
): IndicadoresOrcamentos {
  const diaReferencia = normalizarData(referencia);

  const doMes = orcamentos.filter((orcamento) => {
    const emissao = normalizarData(orcamento.dataEmissao);
    return (
      emissao.getUTCFullYear() === diaReferencia.getUTCFullYear() &&
      emissao.getUTCMonth() === diaReferencia.getUTCMonth()
    );
  });

  const convertidosNoMes = doMes.filter(
    (orcamento) => orcamento.status === "CONVERTIDO",
  ).length;

  const valorTotalCotado = doMes
    .filter(
      (orcamento) =>
        orcamento.status === "ABERTO" || orcamento.status === "CONVERTIDO",
    )
    .reduce(
      (total, orcamento) => total + calcularTotalOrcamento(orcamento.itens),
      0,
    );

  const prestesAExpirar = orcamentos.filter((orcamento) => {
    if (statusEfetivoOrcamento(orcamento, referencia) !== "ABERTO") {
      return false;
    }

    const diasRestantes = calcularDiasRestantes(
      orcamento.dataEmissao,
      orcamento.validadeDias,
      referencia,
    );

    return diasRestantes >= 0 && diasRestantes <= DIAS_ALERTA_EXPIRACAO;
  }).length;

  return {
    totalNoMes: doMes.length,
    convertidosNoMes,
    taxaConversaoPercent:
      doMes.length > 0
        ? arredondar((convertidosNoMes / doMes.length) * 100, 1)
        : 0,
    valorTotalCotado: arredondar(valorTotalCotado),
    prestesAExpirar,
  };
}

/* -------------------------------------------------------------------------- */
/*                     4. Conversão em comanda de pré-venda                   */
/* -------------------------------------------------------------------------- */

function numeroComanda(orcamento: Orcamento): string {
  if (/ORC/i.test(orcamento.numero)) {
    return orcamento.numero.replace(/ORC/i, "PV");
  }

  const digitos = orcamento.numero.replace(/\D/g, "");
  return digitos ? `#PV-${digitos}` : `#PV-${orcamento.id}`;
}

/**
 * Converte um orçamento em comanda de pré-venda para a Fila do Caixa.
 *
 * Bloqueios invariaveis:
 * - orçamento cancelado, já convertido, expirado ou sem itens;
 * - item sem saldo suficiente no galpão (estoque é conferido, mas o orçamento
 *   em si não reserva estoque — a reserva só nasce na comanda).
 *
 * Em caso de sucesso a comanda nasce com status `AGUARDANDO_CAIXA`, pronto
 * para o operador de caixa liquidar.
 */
export function converterOrcamentoEmVenda(
  orcamento: Orcamento,
  posicoesEstoque: ReadonlyArray<PosicaoEstoque>,
  referencia: string | Date = new Date(),
): ResultadoConversao {
  if (orcamento.status === "CONVERTIDO") {
    return {
      ok: false,
      erros: [`O orçamento ${orcamento.numero} já foi convertido em venda.`],
      itensSemEstoque: [],
    };
  }

  if (orcamento.status === "CANCELADO") {
    return {
      ok: false,
      erros: [`O orçamento ${orcamento.numero} está cancelado.`],
      itensSemEstoque: [],
    };
  }

  if (statusEfetivoOrcamento(orcamento, referencia) === "EXPIRADO") {
    const dias = calcularDiasRestantes(
      orcamento.dataEmissao,
      orcamento.validadeDias,
      referencia,
    );

    return {
      ok: false,
      erros: [
        `O orçamento ${orcamento.numero} expirou há ${Math.abs(dias)} dia(s). Emita uma nova proposta antes de converter.`,
      ],
      itensSemEstoque: [],
    };
  }

  if (orcamento.itens.length === 0) {
    return {
      ok: false,
      erros: ["O orçamento não possui itens para converter."],
      itensSemEstoque: [],
    };
  }

  const saldoPorProduto = new Map<string, number>();

  for (const posicao of posicoesEstoque) {
    saldoPorProduto.set(posicao.produtoId, posicao.saldoDisponivel);
  }

  const erros: string[] = [];
  const itensSemEstoque: ItemSemEstoque[] = [];
  const itensComanda: ItemComandaPreVenda[] = [];

  for (const item of orcamento.itens) {
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) {
      erros.push(
        `Item "${item.descricao}" possui quantidade inválida (${item.quantidade}).`,
      );
      continue;
    }

    const disponivel = saldoPorProduto.get(item.produtoId) ?? 0;

    if (disponivel < item.quantidade) {
      itensSemEstoque.push({
        produtoId: item.produtoId,
        descricao: item.descricao,
        solicitado: item.quantidade,
        disponivel,
      });
    }

    itensComanda.push({
      produtoId: item.produtoId,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      precoUnitario: item.precoTabela,
      descontoPercent: item.descontoPercent ?? 0,
      subtotal: calcularSubtotalItem(item),
    });
  }

  if (itensSemEstoque.length > 0) {
    const faltantes = itensSemEstoque
      .map(
        (item) =>
          `${item.descricao} (solicitado ${item.solicitado}, disponível ${item.disponivel})`,
      )
      .join("; ");

    erros.push(`Estoque insuficiente no galpão: ${faltantes}.`);
  }

  if (erros.length > 0) {
    return { ok: false, erros, itensSemEstoque };
  }

  const diaReferencia = normalizarData(referencia);
  const avisos: string[] = [];

  if (!orcamento.cliente) {
    avisos.push(
      "Venda de balcão sem cliente identificado; a comanda seguirá sem CPF/CNPJ.",
    );
  }

  return {
    ok: true,
    avisos,
    comanda: {
      id: `comanda-${orcamento.id}`,
      numero: numeroComanda(orcamento),
      orcamentoNumero: orcamento.numero,
      clienteNome: orcamento.cliente?.nome ?? "Cliente Balcão",
      clienteDocumento: orcamento.cliente?.documento ?? null,
      vendedor: orcamento.vendedor,
      condicaoPagamento: orcamento.condicaoPagamento,
      total: calcularTotalOrcamento(orcamento.itens),
      status: "AGUARDANDO_CAIXA",
      origem: "ORCAMENTO",
      criadaEm: diaReferencia.toISOString(),
      itens: itensComanda,
    },
  };
}
