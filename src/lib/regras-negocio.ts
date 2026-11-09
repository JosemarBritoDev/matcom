/**
 * Regras de negócio invariantes do MatCom SaaS.
 *
 * Este módulo concentra as decisões que NÃO podem divergir entre PDV,
 * Fila do Caixa, Aprovações, Compras/NF-e e Financeiro/DRE.
 * Toda função aqui é pura e determinística para permitir testes unitários
 * e reutilização em Server Actions / Route Handlers.
 */

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

export type PapelOperacional =
  | "SUPER_ADMIN"
  | "GERENTE_LOJA"
  | "VENDEDOR"
  | "CAIXA"
  | "ALMOXARIFE"
  | "LOGISTICA"
  | "FINANCEIRO"
  | "COMPRADOR";

export type StatusAprovacao = "APROVADO" | "PENDENTE" | "REJEITADO";

export type TabelaPreco = "VAREJO" | "ATACADO";

export type TipoCadastro = "SIMPLIFICADO" | "COMPLETO";

export type StatusContaCliente = "ATIVO" | "BLOQUEADO";

const PAPEIS_GESTORES: ReadonlySet<PapelOperacional> = new Set([
  "GERENTE_LOJA",
  "SUPER_ADMIN",
]);

const LIMITE_DESCONTO_VENDEDOR_PADRAO = 10;

/* -------------------------------------------------------------------------- */
/*                             Utilitários internos                           */
/* -------------------------------------------------------------------------- */

function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

function numeroValido(valor: number): boolean {
  return Number.isFinite(valor);
}

/* -------------------------------------------------------------------------- */
/*                   1. Trava antifraude — desconto gerencial                 */
/* -------------------------------------------------------------------------- */

export interface SolicitacaoDesconto {
  /** Usuário que pediu o desconto (vendedor, caixa, etc.). */
  solicitanteId: string;
  /** Usuário que está tentando aprovar. */
  aprovadorId: string;
  papelAprovador: PapelOperacional;
  /** Percentual de desconto solicitado sobre o subtotal. */
  descontoSolicitadoPercent: number;
  /** Limite máximo que o operacional pode conceder sem gerente. */
  limiteVendedorPercent?: number;
}

export interface DecisaoDesconto {
  aprovado: boolean;
  requerGerente: boolean;
  motivo: string;
}

/**
 * Avalia se um desconto pode ser aplicado.
 *
 * Invariantes:
 * - Desconto acima do limite do vendedor exige GERENTE_LOJA ou SUPER_ADMIN.
 * - Ninguém aprova a própria solicitação (segregação de funções).
 * - Vendedor/operacional nunca aprova desconto acima do próprio limite.
 */
export function avaliarSolicitacaoDesconto(
  solicitacao: SolicitacaoDesconto,
): DecisaoDesconto {
  const {
    solicitanteId,
    aprovadorId,
    papelAprovador,
    descontoSolicitadoPercent,
    limiteVendedorPercent = LIMITE_DESCONTO_VENDEDOR_PADRAO,
  } = solicitacao;

  if (
    !numeroValido(descontoSolicitadoPercent) ||
    descontoSolicitadoPercent < 0 ||
    descontoSolicitadoPercent > 100
  ) {
    return {
      aprovado: false,
      requerGerente: false,
      motivo: "Percentual de desconto inválido.",
    };
  }

  if (!numeroValido(limiteVendedorPercent) || limiteVendedorPercent < 0) {
    return {
      aprovado: false,
      requerGerente: false,
      motivo: "Limite de desconto configurado é inválido.",
    };
  }

  if (descontoSolicitadoPercent <= limiteVendedorPercent) {
    return {
      aprovado: true,
      requerGerente: false,
      motivo:
        "Desconto dentro do limite operacional; não exige aprovação do Gerente.",
    };
  }

  if (solicitanteId === aprovadorId) {
    return {
      aprovado: false,
      requerGerente: true,
      motivo:
        "O solicitante não pode aprovar a própria solicitação (segregação de funções).",
    };
  }

  if (!PAPEIS_GESTORES.has(papelAprovador)) {
    return {
      aprovado: false,
      requerGerente: true,
      motivo:
        "Somente GERENTE_LOJA ou SUPER_ADMIN podem aprovar desconto acima do limite.",
    };
  }

  return {
    aprovado: true,
    requerGerente: true,
    motivo: "Desconto acima do limite aprovado por gestor autorizado.",
  };
}

/* -------------------------------------------------------------------------- */
/*                   1b. Trava antifraude — sangria de caixa                  */
/* -------------------------------------------------------------------------- */

export interface SolicitacaoSangria {
  valor: number;
  motivo: string;
  /** PIN digitado pelo operador no momento da sangria. */
  pinInformado: string;
  /** PIN vigente do Gerente, configurado no tenant. */
  pinGerente: string;
}

export interface AutorizacaoSangria {
  autorizada: boolean;
  motivo: string;
}

/**
 * Valida sangria de caixa. Sem PIN de Gerente válido, a operação é bloqueada.
 */
export function validarSangria(
  solicitacao: SolicitacaoSangria,
): AutorizacaoSangria {
  const { valor, motivo, pinInformado, pinGerente } = solicitacao;

  if (!numeroValido(valor) || valor <= 0) {
    return { autorizada: false, motivo: "Informe um valor válido para a sangria." };
  }

  if (!motivo.trim()) {
    return { autorizada: false, motivo: "Informe o motivo da sangria." };
  }

  if (!pinGerente.trim()) {
    return {
      autorizada: false,
      motivo: "Nenhum PIN de Gerente está configurado para autorizar a sangria.",
    };
  }

  if (!pinInformado.trim() || pinInformado !== pinGerente) {
    return {
      autorizada: false,
      motivo:
        "Sangria bloqueada: PIN de Gerente ausente ou incorreto. Operação não autorizada.",
    };
  }

  return {
    autorizada: true,
    motivo: "Sangria autorizada pelo PIN de Gerente.",
  };
}

/* -------------------------------------------------------------------------- */
/*                       2. Crediário / compra a prazo                        */
/* -------------------------------------------------------------------------- */

export interface ClienteCrediario {
  tipoCadastro: TipoCadastro;
  statusConta: StatusContaCliente;
  limiteCredito: number;
  /** Saldo já utilizado no crediário. */
  saldoDevedor?: number;
  pendenciasFinanceiras?: boolean;
}

export interface SolicitacaoCrediario {
  cliente: ClienteCrediario;
  valorCompra: number;
}

export interface ResultadoCrediario {
  permitido: boolean;
  limiteDisponivel: number;
  motivo: string;
}

/**
 * Decide se o cliente pode comprar a prazo/fiado.
 *
 * Invariantes:
 * - Cadastro SIMPLIFICADO nunca compra a prazo/fiado.
 * - Conta bloqueada ou com pendência financeira não compra a prazo.
 * - O valor da compra não pode ultrapassar o limite disponível.
 */
export function avaliarCompraCrediario(
  solicitacao: SolicitacaoCrediario,
): ResultadoCrediario {
  const { cliente, valorCompra } = solicitacao;
  const saldoDevedor = cliente.saldoDevedor ?? 0;
  const limiteDisponivel = Math.max(0, cliente.limiteCredito - saldoDevedor);

  if (cliente.tipoCadastro === "SIMPLIFICADO") {
    return {
      permitido: false,
      limiteDisponivel,
      motivo:
        "Cliente com cadastro SIMPLIFICADO não pode comprar a prazo/fiado. Conclua o cadastro completo.",
    };
  }

  if (cliente.statusConta === "BLOQUEADO") {
    return {
      permitido: false,
      limiteDisponivel,
      motivo: "Conta do cliente está bloqueada para compras a prazo.",
    };
  }

  if (cliente.pendenciasFinanceiras) {
    return {
      permitido: false,
      limiteDisponivel,
      motivo: "Cliente possui pendências financeiras em aberto.",
    };
  }

  if (!numeroValido(valorCompra) || valorCompra <= 0) {
    return {
      permitido: false,
      limiteDisponivel,
      motivo: "Valor da compra inválido para lançamento no crediário.",
    };
  }

  if (valorCompra > limiteDisponivel) {
    return {
      permitido: false,
      limiteDisponivel,
      motivo:
        "Limite de crediário insuficiente. Solicite aprovação do Gerente.",
    };
  }

  return {
    permitido: true,
    limiteDisponivel,
    motivo: "Compra a prazo liberada dentro do limite do cliente.",
  };
}

/* -------------------------------------------------------------------------- */
/*                   3. Estoque & NF-e — custo médio ponderado                */
/* -------------------------------------------------------------------------- */

export interface EntradaEstoque {
  estoqueAtual: number;
  custoMedioAtual: number;
  quantidadeEntrada: number;
  custoUnitarioEntrada: number;
}

/**
 * Recalcula o custo médio ponderado na entrada de estoque (NF-e).
 *
 * Formula: (estoqueAtual * custoMedioAtual + quantidadeEntrada * custoEntrada)
 *          / (estoqueAtual + quantidadeEntrada)
 */
export function calcularCustoMedioPonderado(entrada: EntradaEstoque): number {
  const {
    estoqueAtual,
    custoMedioAtual,
    quantidadeEntrada,
    custoUnitarioEntrada,
  } = entrada;

  const valoresValidos = [
    estoqueAtual,
    custoMedioAtual,
    quantidadeEntrada,
    custoUnitarioEntrada,
  ].every(numeroValido);

  if (!valoresValidos) {
    throw new Error("Valores inválidos para cálculo de custo médio ponderado.");
  }

  if (estoqueAtual < 0 || custoMedioAtual < 0 || quantidadeEntrada < 0 || custoUnitarioEntrada < 0) {
    throw new Error("Valores negativos não são permitidos no cálculo de custo médio.");
  }

  const quantidadeTotal = estoqueAtual + quantidadeEntrada;

  if (quantidadeTotal === 0) {
    return 0;
  }

  const custoTotal =
    estoqueAtual * custoMedioAtual + quantidadeEntrada * custoUnitarioEntrada;

  return arredondar(custoTotal / quantidadeTotal, 4);
}

/* -------------------------------------------------------------------------- */
/*                 3b. Estoque & Vendas — preço de atacado                    */
/* -------------------------------------------------------------------------- */

export interface ContextoPrecoVenda {
  /** Tabela contratada/solicitada pelo cliente. */
  tabelaCliente: TabelaPreco;
  /** Situação da tabela de atacado (APROVADO/PENDENTE/REJEITADO). */
  statusTabela: StatusAprovacao;
  tipoCadastro: TipoCadastro;
  quantidade: number;
  quantidadeMinimaAtacado: number;
  precoVarejo: number;
  precoAtacado: number;
}

export interface PrecoVendaAplicado {
  tabelaAplicada: TabelaPreco;
  precoUnitario: number;
  motivo: string;
}

/**
 * Resolve o preço unitário de venda.
 *
 * O atacado só é aplicado quando TODOS os critérios são verdadeiros:
 * cliente na tabela ATACADO, status APROVADO, cadastro COMPLETO e
 * quantidade >= quantidade mínima de atacado.
 */
export function resolverPrecoVenda(
  contexto: ContextoPrecoVenda,
): PrecoVendaAplicado {
  const {
    tabelaCliente,
    statusTabela,
    tipoCadastro,
    quantidade,
    quantidadeMinimaAtacado,
    precoVarejo,
    precoAtacado,
  } = contexto;

  const varejo: PrecoVendaAplicado = {
    tabelaAplicada: "VAREJO",
    precoUnitario: arredondar(precoVarejo, 2),
    motivo: "Preço de varejo aplicado.",
  };

  if (
    !numeroValido(quantidade) ||
    quantidade <= 0 ||
    !numeroValido(quantidadeMinimaAtacado) ||
    quantidadeMinimaAtacado <= 0
  ) {
    return varejo;
  }

  if (tabelaCliente !== "ATACADO") {
    return varejo;
  }

  if (statusTabela !== "APROVADO") {
    return {
      ...varejo,
      motivo:
        "Tabela de atacado não aprovada; preço de varejo aplicado até liberação do Gerente.",
    };
  }

  if (tipoCadastro === "SIMPLIFICADO") {
    return {
      ...varejo,
      motivo:
        "Cliente com cadastro simplificado não acessa preço de atacado.",
    };
  }

  if (quantidade < quantidadeMinimaAtacado) {
    return {
      ...varejo,
      motivo: `Quantidade abaixo do mínimo de atacado (${quantidadeMinimaAtacado}).`,
    };
  }

  return {
    tabelaAplicada: "ATACADO",
    precoUnitario: arredondar(precoAtacado, 2),
    motivo: "Preço de atacado aprovado e aplicado pela quantidade mínima.",
  };
}

/* -------------------------------------------------------------------------- */
/*                      4. Financeiro — DRE gerencial                         */
/* -------------------------------------------------------------------------- */

export interface DadosDre {
  faturamentoBruto: number;
  /** Custo dos produtos/serviços vendidos. */
  cogs: number;
  despesasOperacionais: number;
}

export interface ResultadoDre {
  lucroBruto: number;
  lucroOperacional: number;
  margemBrutaPercent: number;
  margemOperacionalPercent: number;
}

/**
 * Calcula a DRE simplificada:
 * Lucro Operacional = Faturamento Bruto - COGS - Despesas Operacionais.
 */
export function calcularDre(dados: DadosDre): ResultadoDre {
  const { faturamentoBruto, cogs, despesasOperacionais } = dados;

  if (
    ![faturamentoBruto, cogs, despesasOperacionais].every(numeroValido)
  ) {
    throw new Error("Valores inválidos para cálculo da DRE.");
  }

  const lucroBruto = faturamentoBruto - cogs;
  const lucroOperacional = lucroBruto - despesasOperacionais;
  const margemBrutaPercent =
    faturamentoBruto > 0 ? (lucroBruto / faturamentoBruto) * 100 : 0;
  const margemOperacionalPercent =
    faturamentoBruto > 0 ? (lucroOperacional / faturamentoBruto) * 100 : 0;

  return {
    lucroBruto: arredondar(lucroBruto, 2),
    lucroOperacional: arredondar(lucroOperacional, 2),
    margemBrutaPercent: arredondar(margemBrutaPercent, 2),
    margemOperacionalPercent: arredondar(margemOperacionalPercent, 2),
  };
}