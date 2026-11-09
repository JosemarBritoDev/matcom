import { describe, expect, it } from "@jest/globals";

import {
  MARGEM_SEGURANCA_DIAS,
  calcularEstoqueMinimoDinamico,
  type CurvaAbc,
} from "@/lib/estoque-dinamico";

describe("estoque dinâmico — margem de segurança por Curva ABC", () => {
  it("define 15 dias de margem para a Classe A", () => {
    expect(MARGEM_SEGURANCA_DIAS.A).toBe(15);
  });

  it("define 7 dias de margem para a Classe B", () => {
    expect(MARGEM_SEGURANCA_DIAS.B).toBe(7);
  });

  it("define 3 dias de margem para a Classe C", () => {
    expect(MARGEM_SEGURANCA_DIAS.C).toBe(3);
  });
});

describe("estoque dinâmico — fórmula do estoque mínimo", () => {
  it("calcula Classe A: (4 vendas/dia × 5 dias) + 15 dias de margem = 80", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 4,
      tempoReposicaoDias: 5,
      curvaAbc: "A",
      estoqueAtual: 30,
    });

    expect(resultado.margemSegurancaDias).toBe(15);
    expect(resultado.demandaDuranteReposicao).toBe(20);
    expect(resultado.estoqueSeguranca).toBe(60);
    expect(resultado.estoqueMinimo).toBe(80);
    expect(resultado.pontoPedido).toBe(80);
  });

  it("calcula Classe B: (2 vendas/dia × 10 dias) + 7 dias de margem = 34", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 2,
      tempoReposicaoDias: 10,
      curvaAbc: "B",
      estoqueAtual: 50,
    });

    expect(resultado.demandaDuranteReposicao).toBe(20);
    expect(resultado.estoqueSeguranca).toBe(14);
    expect(resultado.estoqueMinimo).toBe(34);
    expect(resultado.pontoPedido).toBe(34);
  });

  it("calcula Classe C: (1 venda/dia × 3 dias) + 3 dias de margem = 6", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 1,
      tempoReposicaoDias: 3,
      curvaAbc: "C",
      estoqueAtual: 2,
    });

    expect(resultado.demandaDuranteReposicao).toBe(3);
    expect(resultado.estoqueSeguranca).toBe(3);
    expect(resultado.estoqueMinimo).toBe(6);
    expect(resultado.pontoPedido).toBe(6);
  });

  it("arredonda valores fracionados para duas casas decimais", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 1.333,
      tempoReposicaoDias: 4,
      curvaAbc: "B",
      estoqueAtual: 0,
    });

    // 1.333 × 4 = 5.332 | margem = 1.333 × 7 = 9.331 | total = 14.663
    expect(resultado.estoqueMinimo).toBe(14.66);
    expect(resultado.pontoPedido).toBe(15);
  });

  it("retorna estoque mínimo zero quando não há venda média", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 0,
      tempoReposicaoDias: 8,
      curvaAbc: "A",
      estoqueAtual: 12,
    });

    expect(resultado.estoqueMinimo).toBe(0);
    expect(resultado.pontoPedido).toBe(0);
    expect(resultado.status).toBe("OK");
    expect(resultado.sugestaoCompra).toBe(0);
  });
});

describe("estoque dinâmico — status e sugestão de compra", () => {
  it("marca como CRÍTICO quando o estoque é zero", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 3,
      tempoReposicaoDias: 5,
      curvaAbc: "A",
      estoqueAtual: 0,
    });

    expect(resultado.status).toBe("CRITICO");
    expect(resultado.sugestaoCompra).toBe(60);
  });

  it("marca como CRÍTICO quando o saldo está na metade ou abaixo do ponto de pedido", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 4,
      tempoReposicaoDias: 5,
      curvaAbc: "A",
      estoqueAtual: 40,
    });

    expect(resultado.pontoPedido).toBe(80);
    expect(resultado.status).toBe("CRITICO");
    expect(resultado.sugestaoCompra).toBe(40);
  });

  it("marca como REPOR quando o saldo está abaixo do ponto de pedido", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 4,
      tempoReposicaoDias: 5,
      curvaAbc: "A",
      estoqueAtual: 79,
    });

    expect(resultado.status).toBe("REPOR");
    expect(resultado.sugestaoCompra).toBe(1);
  });

  it("marca como OK quando o saldo supera o ponto de pedido", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 4,
      tempoReposicaoDias: 5,
      curvaAbc: "A",
      estoqueAtual: 81,
    });

    expect(resultado.status).toBe("OK");
    expect(resultado.sugestaoCompra).toBe(0);
  });

  it("arredonda a sugestão de compra para cima", () => {
    const resultado = calcularEstoqueMinimoDinamico({
      vendaMediaDiaria: 1.333,
      tempoReposicaoDias: 4,
      curvaAbc: "B",
      estoqueAtual: 10,
    });

    // Mínimo 14,66 - 10 = 4,66 → 5 unidades
    expect(resultado.sugestaoCompra).toBe(5);
  });
});

describe("estoque dinâmico — validação de parâmetros", () => {
  it("rejeita venda média negativa", () => {
    expect(() =>
      calcularEstoqueMinimoDinamico({
        vendaMediaDiaria: -1,
        tempoReposicaoDias: 5,
        curvaAbc: "A",
        estoqueAtual: 10,
      }),
    ).toThrow(/venda média diária/i);
  });

  it("rejeita tempo de reposição inválido", () => {
    expect(() =>
      calcularEstoqueMinimoDinamico({
        vendaMediaDiaria: 1,
        tempoReposicaoDias: Number.NaN,
        curvaAbc: "A",
        estoqueAtual: 10,
      }),
    ).toThrow(/tempo de reposição/i);
  });

  it("rejeita estoque atual negativo", () => {
    expect(() =>
      calcularEstoqueMinimoDinamico({
        vendaMediaDiaria: 1,
        tempoReposicaoDias: 5,
        curvaAbc: "B",
        estoqueAtual: -2,
      }),
    ).toThrow(/estoque atual/i);
  });

  it("rejeita Curva ABC desconhecida", () => {
    expect(() =>
      calcularEstoqueMinimoDinamico({
        vendaMediaDiaria: 1,
        tempoReposicaoDias: 5,
        curvaAbc: "D" as CurvaAbc,
        estoqueAtual: 10,
      }),
    ).toThrow(/Curva ABC inválida/i);
  });
});