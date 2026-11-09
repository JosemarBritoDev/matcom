/**
 * Motor de estoque dinâmico do MatCom.
 *
 * Estoque Mínimo =
 *   (Venda Média Diária dos últimos 90 dias × Tempo de Reposição em dias)
 *   + Margem de Segurança
 *
 * A Margem de Segurança é calculada em dias de venda e varia conforme a
 * Curva ABC: A = 15 dias, B = 7 dias, C = 3 dias.
 */

export type CurvaAbc = "A" | "B" | "C";

export type StatusEstoque = "CRITICO" | "REPOR" | "OK";

export const MARGEM_SEGURANCA_DIAS: Readonly<Record<CurvaAbc, number>> = {
  A: 15,
  B: 7,
  C: 3,
};

export interface ParametrosEstoqueDinamico {
  /** Média de vendas por dia nos últimos 90 dias. */
  vendaMediaDiaria: number;
  /** Prazo de reposição informado pelo fornecedor, em dias. */
  tempoReposicaoDias: number;
  curvaAbc: CurvaAbc;
  /** Saldo físico disponível no momento do cálculo. */
  estoqueAtual: number;
}

export interface ResultadoEstoqueDinamico {
  margemSegurancaDias: number;
  /** Unidades reservadas como margem de segurança. */
  estoqueSeguranca: number;
  /** Demanda estimada durante o prazo de reposição. */
  demandaDuranteReposicao: number;
  estoqueMinimo: number;
  /** Limiar operacional que dispara a reposição. */
  pontoPedido: number;
  status: StatusEstoque;
  /** Quantidade sugerida para recompor o estoque mínimo. */
  sugestaoCompra: number;
}

function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

function validarNumeroNaoNegativo(valor: number, campo: string): void {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`Valor inválido para ${campo}: ${valor}.`);
  }
}

function classificarStatus(
  estoqueAtual: number,
  pontoPedido: number,
): StatusEstoque {
  if (estoqueAtual <= 0) {
    return "CRITICO";
  }

  if (estoqueAtual <= pontoPedido * 0.5) {
    return "CRITICO";
  }

  if (estoqueAtual <= pontoPedido) {
    return "REPOR";
  }

  return "OK";
}

/**
 * Calcula o estoque mínimo dinâmico, o ponto de pedido e a sugestão de compra.
 *
 * O ponto de pedido é arredondado para cima para funcionar como limiar
 * operacional inteiro de disparo da reposição.
 */
export function calcularEstoqueMinimoDinamico(
  parametros: ParametrosEstoqueDinamico,
): ResultadoEstoqueDinamico {
  const {
    vendaMediaDiaria,
    tempoReposicaoDias,
    curvaAbc,
    estoqueAtual,
  } = parametros;

  validarNumeroNaoNegativo(vendaMediaDiaria, "venda média diária");
  validarNumeroNaoNegativo(tempoReposicaoDias, "tempo de reposição");
  validarNumeroNaoNegativo(estoqueAtual, "estoque atual");

  const margemSegurancaDias = MARGEM_SEGURANCA_DIAS[curvaAbc];

  if (margemSegurancaDias === undefined) {
    throw new Error(`Curva ABC inválida: ${curvaAbc}.`);
  }

  const demandaDuranteReposicao = vendaMediaDiaria * tempoReposicaoDias;
  const estoqueSeguranca = vendaMediaDiaria * margemSegurancaDias;
  const estoqueMinimo = arredondar(
    demandaDuranteReposicao + estoqueSeguranca,
  );
  const pontoPedido = Math.ceil(estoqueMinimo);
  const status = classificarStatus(estoqueAtual, pontoPedido);

  const sugestaoCompra =
    status === "OK" ? 0 : Math.max(0, Math.ceil(estoqueMinimo - estoqueAtual));

  return {
    margemSegurancaDias,
    estoqueSeguranca: arredondar(estoqueSeguranca),
    demandaDuranteReposicao: arredondar(demandaDuranteReposicao),
    estoqueMinimo,
    pontoPedido,
    status,
    sugestaoCompra,
  };
}