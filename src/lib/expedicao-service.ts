/**
 * Serviço de Expedição & Separação de Galpão do MatCom.
 *
 * Concentra as regras puras de:
 * - classificação dos materiais pesados vendidos no caixa;
 * - checklist de conferência item a item no pátio;
 * - transições de status da comanda (aguardando → separação → pronto → saída);
 * - indicadores do dashboard de expedição;
 * - montagem e agrupamento do romaneio de carga por rota de bairro.
 *
 * Nenhuma função aqui acessa banco, Prisma ou React — tudo é determinístico
 * para permitir testes unitários e reuso futuro em Server Actions.
 */

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

export type StatusExpedicao =
  | "AGUARDANDO_SEPARACAO"
  | "EM_SEPARACAO"
  | "PRONTO"
  | "CONCLUIDO";

export type ModalidadeEntrega = "RETIRADA" | "ENTREGA";

export type CategoriaMaterial =
  | "CIMENTO"
  | "AREIA"
  | "TIJOLO"
  | "FERRO"
  | "TUBO"
  | "ARGAMASSA"
  | "OUTRO";

export interface ItemSeparacao {
  id: string;
  descricao: string;
  /** Thumbnail otimizado (WebP ~40 KB) exibido na conferência. */
  imagemUrl?: string;
  categoria: CategoriaMaterial;
  unidade: string;
  quantidade: number;
  /** Localização física no galpão/pátio (corredor, baia, pallet). */
  localizacao: string;
  conferido: boolean;
  observacao?: string;
}

export interface ComandaExpedicao {
  id: string;
  numero: string;
  cliente: string;
  documento?: string | null;
  vendedor: string;
  modalidade: ModalidadeEntrega;
  status: StatusExpedicao;
  bairro: string;
  endereco: string;
  referencia?: string;
  pesoKg: number;
  volumes: number;
  /** Data/hora em que o caixa liquidou a comanda (ISO). */
  pagoEm: string;
  iniciadaEm?: string | null;
  prontaEm?: string | null;
  concluidaEm?: string | null;
  /** Entrega que saiu do galpão e está na rota do caminhão. */
  emTransito?: boolean;
  /** Retirada concluída no balcão pelo cliente. */
  retiradaRealizada?: boolean;
  motorista?: string | null;
  veiculo?: string | null;
  itens: ItemSeparacao[];
  observacoes?: string;
}

export interface IndicadoresExpedicao {
  comandasAbertasParaSeparacao: number;
  separacoesEmAndamento: number;
  entregasEmTransito: number;
  retiradasNoBalcaoHoje: number;
}

export interface ResultadoMovimentacao {
  ok: boolean;
  comanda: ComandaExpedicao;
  mensagem: string;
  /** Indica que o checklist completo promoveu a comanda para PRONTO. */
  promovidaParaPronto: boolean;
}

export interface ConfiguracaoRomaneio {
  motorista: string;
  veiculo: string;
  geradoEm?: string | Date;
}

export interface RotaRomaneio {
  bairro: string;
  comandas: ComandaExpedicao[];
  pesoKg: number;
  volumes: number;
}

export interface RomaneioCarga {
  motorista: string;
  veiculo: string;
  geradoEm: string;
  comandas: ComandaExpedicao[];
  rotas: RotaRomaneio[];
  totalComandas: number;
  totalPesoKg: number;
  totalVolumes: number;
}

export type ResultadoRomaneio =
  | { ok: true; romaneio: RomaneioCarga }
  | { ok: false; erros: string[] };

/* -------------------------------------------------------------------------- */
/*                                  Rótulos                                   */
/* -------------------------------------------------------------------------- */

export const ROTULOS_STATUS: Record<StatusExpedicao, string> = {
  AGUARDANDO_SEPARACAO: "Aguardando Separação",
  EM_SEPARACAO: "Em Separação no Galpão",
  PRONTO: "Pronto para Retirada / Carregamento",
  CONCLUIDO: "Concluído",
};

export const ROTULOS_MODALIDADE: Record<ModalidadeEntrega, string> = {
  RETIRADA: "Retirada no balcão",
  ENTREGA: "Entrega no caminhão",
};

export const ROTULOS_CATEGORIA: Record<CategoriaMaterial, string> = {
  CIMENTO: "Cimento",
  AREIA: "Areia",
  TIJOLO: "Tijolo",
  FERRO: "Ferro",
  TUBO: "Tubo",
  ARGAMASSA: "Argamassa",
  OUTRO: "Outro",
};

/** Categorias consideradas material pesado para a expedição de galpão. */
export const CATEGORIAS_MATERIAL_PESADO: readonly CategoriaMaterial[] = [
  "CIMENTO",
  "AREIA",
  "TIJOLO",
  "FERRO",
  "TUBO",
];

/* -------------------------------------------------------------------------- */
/*                             Utilitários internos                           */
/* -------------------------------------------------------------------------- */

function paraData(valor: string | Date): Date | null {
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Chave `YYYY-MM-DD` no fuso local, usada para recortes de "hoje". */
function chaveDia(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

function paraISO(valor?: string | Date): string {
  const data =
    valor === undefined
      ? new Date()
      : valor instanceof Date
        ? valor
        : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    throw new Error(`Data inválida: ${String(valor)}.`);
  }

  return data.toISOString();
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clonarComanda(comanda: ComandaExpedicao): ComandaExpedicao {
  return {
    ...comanda,
    itens: comanda.itens.map((item) => ({ ...item })),
  };
}

function falha(
  comanda: ComandaExpedicao,
  mensagem: string,
): ResultadoMovimentacao {
  return {
    ok: false,
    comanda,
    mensagem,
    promovidaParaPronto: false,
  };
}

function sucesso(
  comanda: ComandaExpedicao,
  mensagem: string,
  promovidaParaPronto = false,
): ResultadoMovimentacao {
  return {
    ok: true,
    comanda,
    mensagem,
    promovidaParaPronto,
  };
}

/* -------------------------------------------------------------------------- */
/*                        1. Classificação dos materiais                      */
/* -------------------------------------------------------------------------- */

/**
 * Classifica a descrição de um produto nas categorias operacionais do galpão.
 * A ordem das regras importa: "Tubo PVC" precisa cair em TUBO e não em OUTRO.
 */
export function classificarMaterial(descricao: string): CategoriaMaterial {
  const texto = normalizarTexto(descricao);

  if (/\bcimento\b/.test(texto)) return "CIMENTO";
  if (/\bareia\b/.test(texto)) return "AREIA";
  if (/\btijolo|\bbloco|\bceramica\b/.test(texto)) return "TIJOLO";
  if (
    /\bferro|\bvergalhao|\baco\b|\barame\b|\btela soldada|\bbarra\b/.test(texto)
  ) {
    return "FERRO";
  }
  if (/\btubo|\bpvc\b|\bconector|\bjoelho|\bconexao\b/.test(texto)) {
    return "TUBO";
  }
  if (/\bargamassa|\brejunte\b/.test(texto)) return "ARGAMASSA";

  return "OUTRO";
}

export function ehMaterialPesado(categoria: CategoriaMaterial): boolean {
  return CATEGORIAS_MATERIAL_PESADO.includes(categoria);
}

export function comandaTemMaterialPesado(comanda: ComandaExpedicao): boolean {
  return comanda.itens.some(
    (item) =>
      ehMaterialPesado(item.categoria) ||
      ehMaterialPesado(classificarMaterial(item.descricao)),
  );
}

/* -------------------------------------------------------------------------- */
/*                          2. Checklist de separação                         */
/* -------------------------------------------------------------------------- */

export function itensConferidos(
  comanda: ComandaExpedicao,
): ItemSeparacao[] {
  return comanda.itens.filter((item) => item.conferido);
}

export function itensPendentes(comanda: ComandaExpedicao): ItemSeparacao[] {
  return comanda.itens.filter((item) => !item.conferido);
}

/** Percentual inteiro de itens conferidos (0 a 100). */
export function calcularProgressoConferencia(
  comanda: ComandaExpedicao,
): number {
  if (comanda.itens.length === 0) return 0;

  return Math.round(
    (itensConferidos(comanda).length / comanda.itens.length) * 100,
  );
}

export function checklistCompleto(comanda: ComandaExpedicao): boolean {
  return (
    comanda.itens.length > 0 &&
    comanda.itens.every((item) => item.conferido)
  );
}

/* -------------------------------------------------------------------------- */
/*                        3. Transições da comanda                            */
/* -------------------------------------------------------------------------- */

/**
 * Inicia a separação de uma comanda paga que está aguardando o conferente.
 * Somente `AGUARDANDO_SEPARACAO` pode ser iniciada.
 */
export function iniciarSeparacao(
  comanda: ComandaExpedicao,
  agora?: string | Date,
): ResultadoMovimentacao {
  const atual = clonarComanda(comanda);

  if (atual.itens.length === 0) {
    return falha(atual, "A comanda não possui itens para separar.");
  }

  if (atual.status !== "AGUARDANDO_SEPARACAO") {
    return falha(
      atual,
      `A comanda ${atual.numero} está em "${ROTULOS_STATUS[atual.status]}" e não pode iniciar uma nova separação.`,
    );
  }

  atual.status = "EM_SEPARACAO";
  atual.iniciadaEm = paraISO(agora);
  atual.prontaEm = null;
  atual.concluidaEm = null;
  atual.emTransito = false;
  atual.retiradaRealizada = false;

  return sucesso(
    atual,
    `Separação da comanda ${atual.numero} iniciada no galpão.`,
  );
}

/**
 * Marca/desmarca um item do checklist. Quando o último item pendente é
 * conferido, a comanda é promovida automaticamente para `PRONTO`.
 */
export function conferirItem(
  comanda: ComandaExpedicao,
  itemId: string,
  conferido = true,
  agora?: string | Date,
): ResultadoMovimentacao {
  const atual = clonarComanda(comanda);

  if (atual.status === "AGUARDANDO_SEPARACAO") {
    return falha(
      atual,
      "Inicie a separação antes de conferir os itens no pátio.",
    );
  }

  if (atual.status === "CONCLUIDO") {
    return falha(
      atual,
      "A comanda já foi concluída e não permite alteração no checklist.",
    );
  }

  if (atual.status === "PRONTO") {
    return falha(
      atual,
      "A comanda já está pronta. Reimprima o romaneio ou confirme a saída do galpão.",
    );
  }

  const item = atual.itens.find((registro) => registro.id === itemId);

  if (!item) {
    return falha(atual, `Item ${itemId} não encontrado na comanda ${atual.numero}.`);
  }

  if (item.conferido === conferido) {
    return sucesso(
      atual,
      `O item ${item.descricao} já estava ${conferido ? "conferido" : "pendente"}.`,
    );
  }

  item.conferido = conferido;

  const completo = checklistCompleto(atual);

  if (completo) {
    atual.status = "PRONTO";
    atual.prontaEm = paraISO(agora);
  } else {
    atual.status = "EM_SEPARACAO";
    atual.prontaEm = null;
  }

  return sucesso(
    atual,
    completo
      ? `Checklist completo. Comanda ${atual.numero} pronta para retirada/carregamento.`
      : `Item ${item.descricao} ${conferido ? "conferido" : "reaberto"}.`,
    completo,
  );
}

/** Atalho operacional para o conferente marcar toda a comanda de uma vez. */
export function conferirTodosItens(
  comanda: ComandaExpedicao,
  agora?: string | Date,
): ResultadoMovimentacao {
  const atual = clonarComanda(comanda);

  if (atual.status !== "EM_SEPARACAO") {
    return falha(
      atual,
      `Somente comandas em separação podem ter o checklist completo. Status atual: "${ROTULOS_STATUS[atual.status]}".`,
    );
  }

  if (atual.itens.length === 0) {
    return falha(atual, "A comanda não possui itens para conferir.");
  }

  atual.itens = atual.itens.map((item) => ({ ...item, conferido: true }));
  atual.status = "PRONTO";
  atual.prontaEm = paraISO(agora);

  return sucesso(
    atual,
    `Checklist completo. Comanda ${atual.numero} pronta para retirada/carregamento.`,
    true,
  );
}

/**
 * Confirma a saída física do galpão:
 * - retirada vira `CONCLUIDO` com `retiradaRealizada`;
 * - entrega vira `CONCLUIDO` com `emTransito`, alimentando o card de caminhão.
 */
export function confirmarSaidaGalpao(
  comanda: ComandaExpedicao,
  agora?: string | Date,
): ResultadoMovimentacao {
  const atual = clonarComanda(comanda);

  if (atual.status !== "PRONTO") {
    return falha(
      atual,
      `A comanda precisa estar PRONTA para confirmar a saída. Status atual: "${ROTULOS_STATUS[atual.status]}".`,
    );
  }

  if (!checklistCompleto(atual)) {
    return falha(
      atual,
      "O checklist de separação ainda possui itens pendentes. Conclua a conferência antes da saída.",
    );
  }

  atual.status = "CONCLUIDO";
  atual.concluidaEm = paraISO(agora);

  if (atual.modalidade === "RETIRADA") {
    atual.retiradaRealizada = true;
    atual.emTransito = false;

    return sucesso(
      atual,
      `Retirada da comanda ${atual.numero} realizada no balcão.`,
    );
  }

  atual.retiradaRealizada = false;
  atual.emTransito = true;

  return sucesso(
    atual,
    `Saída da comanda ${atual.numero} confirmada. Carga em trânsito${atual.motorista ? ` com ${atual.motorista}` : ""}.`,
  );
}

/* -------------------------------------------------------------------------- */
/*                         4. Indicadores do dashboard                        */
/* -------------------------------------------------------------------------- */

/**
 * Consolida os quatro indicadores do topo da tela.
 *
 * "Retiradas no balcão concluídas hoje" usa a data de conclusão no fuso local
 * e ignora retiradas de dias anteriores. A referência é injetável para manter
 * o cálculo determinístico nos testes.
 */
export function calcularIndicadoresExpedicao(
  comandas: ReadonlyArray<ComandaExpedicao>,
  referencia: string | Date = new Date(),
): IndicadoresExpedicao {
  const dataReferencia = paraData(referencia);
  const diaReferencia = dataReferencia ? chaveDia(dataReferencia) : null;

  return {
    comandasAbertasParaSeparacao: comandas.filter(
      (comanda) => comanda.status === "AGUARDANDO_SEPARACAO",
    ).length,
    separacoesEmAndamento: comandas.filter(
      (comanda) => comanda.status === "EM_SEPARACAO",
    ).length,
    entregasEmTransito: comandas.filter(
      (comanda) =>
        comanda.modalidade === "ENTREGA" && comanda.emTransito === true,
    ).length,
    retiradasNoBalcaoHoje: comandas.filter((comanda) => {
      if (
        comanda.modalidade !== "RETIRADA" ||
        comanda.retiradaRealizada !== true ||
        !diaReferencia ||
        !comanda.concluidaEm
      ) {
        return false;
      }

      const dataConclusao = paraData(comanda.concluidaEm);
      return dataConclusao !== null && chaveDia(dataConclusao) === diaReferencia;
    }).length,
  };
}

export function contarComandasPorStatus(
  comandas: ReadonlyArray<ComandaExpedicao>,
): Record<StatusExpedicao, number> {
  const contagem: Record<StatusExpedicao, number> = {
    AGUARDANDO_SEPARACAO: 0,
    EM_SEPARACAO: 0,
    PRONTO: 0,
    CONCLUIDO: 0,
  };

  for (const comanda of comandas) {
    contagem[comanda.status] += 1;
  }

  return contagem;
}

export function filtrarComandasPorStatus(
  comandas: ReadonlyArray<ComandaExpedicao>,
  status: StatusExpedicao,
): ComandaExpedicao[] {
  return comandas.filter((comanda) => comanda.status === status);
}

/* -------------------------------------------------------------------------- */
/*                          5. Romaneio de carga                              */
/* -------------------------------------------------------------------------- */

/**
 * Monta o romaneio de carga a partir das comandas prontas selecionadas.
 *
 * Validações:
 * - precisa haver ao menos uma comanda;
 * - todas precisam estar `PRONTO` (não se imprime romaneio de carga incompleta);
 * - motorista e veículo são obrigatórios;
 * - as comandas são agrupadas por bairro (rota) e ordenadas por número.
 */
export function montarRomaneio(
  comandas: ReadonlyArray<ComandaExpedicao>,
  configuracao: ConfiguracaoRomaneio,
): ResultadoRomaneio {
  const erros: string[] = [];
  const motorista = configuracao.motorista.trim();
  const veiculo = configuracao.veiculo.trim().toUpperCase();

  if (!motorista) {
    erros.push("Informe o motorista responsável pela carga.");
  }

  if (!veiculo) {
    erros.push("Informe a placa do veículo/caminhão.");
  }

  const unicas = Array.from(
    new Map(comandas.map((comanda) => [comanda.id, comanda])).values(),
  );

  if (unicas.length === 0) {
    erros.push("Selecione ao menos uma comanda pronta para o romaneio.");
  }

  const naoProntas = unicas.filter((comanda) => comanda.status !== "PRONTO");

  if (naoProntas.length > 0) {
    erros.push(
      `Somente comandas prontas podem entrar no romaneio: ${naoProntas
        .map((comanda) => comanda.numero)
        .join(", ")}.`,
    );
  }

  if (erros.length > 0) {
    return { ok: false, erros };
  }

  const porBairro = new Map<string, ComandaExpedicao[]>();

  for (const comanda of unicas) {
    const bairro = comanda.bairro.trim() || "Sem bairro";
    const lista = porBairro.get(bairro) ?? [];
    lista.push(comanda);
    porBairro.set(bairro, lista);
  }

  const rotas: RotaRomaneio[] = Array.from(porBairro.entries())
    .sort(([bairroA], [bairroB]) => bairroA.localeCompare(bairroB, "pt-BR"))
    .map(([bairro, lista]) => {
      const ordenadas = [...lista].sort((a, b) =>
        a.numero.localeCompare(b.numero, "pt-BR"),
      );

      return {
        bairro,
        comandas: ordenadas,
        pesoKg: arredondar(
          ordenadas.reduce((total, comanda) => total + comanda.pesoKg, 0),
        ),
        volumes: ordenadas.reduce(
          (total, comanda) => total + comanda.volumes,
          0,
        ),
      };
    });

  const ordenadas = [...unicas].sort((a, b) =>
    a.numero.localeCompare(b.numero, "pt-BR"),
  );

  return {
    ok: true,
    romaneio: {
      motorista,
      veiculo,
      geradoEm: paraISO(configuracao.geradoEm),
      comandas: ordenadas,
      rotas,
      totalComandas: ordenadas.length,
      totalPesoKg: arredondar(
        ordenadas.reduce((total, comanda) => total + comanda.pesoKg, 0),
      ),
      totalVolumes: ordenadas.reduce(
        (total, comanda) => total + comanda.volumes,
        0,
      ),
    },
  };
}
