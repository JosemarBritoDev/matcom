import { describe, expect, it } from "@jest/globals";

import {
  DIAS_ALERTA_EXPIRACAO,
  calcularDiasRestantes,
  calcularIndicadoresOrcamentos,
  calcularSubtotalItem,
  calcularTotalOrcamento,
  converterOrcamentoEmVenda,
  orcamentoEstaExpirado,
  statusEfetivoOrcamento,
  type Orcamento,
} from "@/lib/orcamento-service";

const REFERENCIA = "2026-11-08";

function criarOrcamento(sobrescritas: Partial<Orcamento> = {}): Orcamento {
  return {
    id: "orc-089",
    numero: "#ORC-2026-089",
    cliente: {
      id: "cli-001",
      nome: "Construtora Horizonte",
      documento: "12.345.678/0001-90",
    },
    vendedor: "Ana Paula",
    dataEmissao: "2026-11-08",
    validadeDias: 7,
    condicaoPagamento: "PIX",
    observacoes: "Entrega na obra até sexta-feira.",
    status: "ABERTO",
    itens: [
      {
        produtoId: "p-cim",
        descricao: "Cimento CP II 50 kg",
        unidade: "UN",
        quantidade: 10,
        precoTabela: 45.63,
        descontoPercent: 10,
      },
    ],
    ...sobrescritas,
  };
}

/* -------------------------------------------------------------------------- */
/*                        Subtotal e total da proposta                        */
/* -------------------------------------------------------------------------- */

describe("orçamento — subtotal e total", () => {
  it("aplica desconto percentual e arredonda em duas casas", () => {
    // 10 × 45,63 = 456,30 | 10% de desconto = 410,67
    expect(
      calcularSubtotalItem({
        produtoId: "p-cim",
        descricao: "Cimento CP II 50 kg",
        unidade: "UN",
        quantidade: 10,
        precoTabela: 45.63,
        descontoPercent: 10,
      }),
    ).toBe(410.67);
  });

  it("trata desconto ausente como zero", () => {
    expect(
      calcularSubtotalItem({
        produtoId: "p-are",
        descricao: "Areia Média Lavada",
        unidade: "M2",
        quantidade: 3,
        precoTabela: 89.9,
      }),
    ).toBe(269.7);
  });

  it("soma os itens já descontados no total do orçamento", () => {
    const total = calcularTotalOrcamento([
      {
        produtoId: "p-cim",
        descricao: "Cimento CP II 50 kg",
        unidade: "UN",
        quantidade: 10,
        precoTabela: 45.63,
        descontoPercent: 10,
      },
      {
        produtoId: "p-are",
        descricao: "Areia Média Lavada",
        unidade: "M2",
        quantidade: 2,
        precoTabela: 89.9,
      },
    ]);

    expect(total).toBe(590.47);
  });

  it("rejeita desconto acima de 100%", () => {
    expect(() =>
      calcularSubtotalItem({
        produtoId: "p-cim",
        descricao: "Cimento CP II 50 kg",
        unidade: "UN",
        quantidade: 1,
        precoTabela: 45.63,
        descontoPercent: 120,
      }),
    ).toThrow(/desconto inválido/i);
  });
});

/* -------------------------------------------------------------------------- */
/*                            Expiração da validade                           */
/* -------------------------------------------------------------------------- */

describe("orçamento — validade e expiração", () => {
  it("conta os dias restantes a partir da emissão", () => {
    expect(calcularDiasRestantes("2026-11-01", 5, "2026-11-01")).toBe(5);
  });

  it("retorna zero quando o orçamento vence hoje", () => {
    expect(calcularDiasRestantes("2026-11-01", 5, "2026-11-06")).toBe(0);
  });

  it("retorna negativo quando o prazo já passou", () => {
    expect(calcularDiasRestantes("2026-11-01", 5, "2026-11-07")).toBe(-1);
  });

  it("rejeita validade negativa", () => {
    expect(() => calcularDiasRestantes("2026-11-01", -1, REFERENCIA)).toThrow(
      /validade inválida/i,
    );
  });

  it("mantém ABERTO quando ainda está dentro do prazo", () => {
    expect(statusEfetivoOrcamento(criarOrcamento(), REFERENCIA)).toBe("ABERTO");
  });

  it("expõe EXPIRADO quando o prazo de um orçamento ABERTO venceu", () => {
    const orcamento = criarOrcamento({
      dataEmissao: "2026-10-30",
      validadeDias: 5,
    });

    expect(statusEfetivoOrcamento(orcamento, REFERENCIA)).toBe("EXPIRADO");
    expect(orcamentoEstaExpirado(orcamento, REFERENCIA)).toBe(true);
  });

  it("não expira orçamento já convertido ou cancelado", () => {
    const convertido = criarOrcamento({
      status: "CONVERTIDO",
      dataEmissao: "2026-10-01",
      validadeDias: 1,
    });
    const cancelado = criarOrcamento({
      status: "CANCELADO",
      dataEmissao: "2026-10-01",
      validadeDias: 1,
    });

    expect(statusEfetivoOrcamento(convertido, REFERENCIA)).toBe("CONVERTIDO");
    expect(statusEfetivoOrcamento(cancelado, REFERENCIA)).toBe("CANCELADO");
    expect(orcamentoEstaExpirado(convertido, REFERENCIA)).toBe(false);
    expect(orcamentoEstaExpirado(cancelado, REFERENCIA)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*                         Indicadores do cabeçalho                           */
/* -------------------------------------------------------------------------- */

describe("orçamento — indicadores do mês", () => {
  const itens = (preco: number) => [
    {
      produtoId: "p-cim",
      descricao: "Cimento CP II 50 kg",
      unidade: "UN" as const,
      quantidade: 1,
      precoTabela: preco,
      descontoPercent: 0,
    },
  ];

  const orcamentos: Orcamento[] = [
    criarOrcamento({ id: "a", itens: itens(100) }),
    criarOrcamento({
      id: "b",
      status: "CONVERTIDO",
      dataEmissao: "2026-11-02",
      validadeDias: 10,
      itens: itens(200),
    }),
    criarOrcamento({
      id: "c",
      dataEmissao: "2026-11-06",
      validadeDias: 5,
      itens: itens(50),
    }),
    criarOrcamento({
      id: "d",
      dataEmissao: "2026-11-04",
      validadeDias: 3,
      itens: itens(1000),
    }),
    criarOrcamento({
      id: "e",
      status: "CANCELADO",
      dataEmissao: "2026-11-01",
      validadeDias: 3,
      itens: itens(100),
    }),
    criarOrcamento({
      id: "f",
      status: "CONVERTIDO",
      dataEmissao: "2026-10-18",
      validadeDias: 15,
      itens: itens(300),
    }),
  ];

  it("conta apenas os orçamentos emitidos no mês de referência", () => {
    const indicadores = calcularIndicadoresOrcamentos(orcamentos, REFERENCIA);

    expect(indicadores.totalNoMes).toBe(5);
    expect(indicadores.convertidosNoMes).toBe(1);
  });

  it("calcula a taxa de conversão sobre o total do mês", () => {
    const indicadores = calcularIndicadoresOrcamentos(orcamentos, REFERENCIA);

    expect(indicadores.taxaConversaoPercent).toBe(20);
  });

  it("soma o valor cotado de propostas abertas e convertidas", () => {
    const indicadores = calcularIndicadoresOrcamentos(orcamentos, REFERENCIA);

    // a=100 + b=200 + c=50 + d=1000 (aberto, expirado) = 1350
    expect(indicadores.valorTotalCotado).toBe(1350);
  });

  it("conta propostas prestes a expirar dentro da janela de alerta", () => {
    const indicadores = calcularIndicadoresOrcamentos(orcamentos, REFERENCIA);

    // c vence em 3 dias; é a única aberta dentro da janela.
    expect(DIAS_ALERTA_EXPIRACAO).toBe(3);
    expect(indicadores.prestesAExpirar).toBe(1);
  });

  it("zera os indicadores quando não há orçamentos no mês", () => {
    const indicadores = calcularIndicadoresOrcamentos([], REFERENCIA);

    expect(indicadores).toEqual({
      totalNoMes: 0,
      convertidosNoMes: 0,
      taxaConversaoPercent: 0,
      valorTotalCotado: 0,
      prestesAExpirar: 0,
    });
  });
});

/* -------------------------------------------------------------------------- */
/*                    Conversão em comanda de pré-venda                       */
/* -------------------------------------------------------------------------- */

describe("orçamento — conversão em venda", () => {
  const estoqueSuficiente = [{ produtoId: "p-cim", saldoDisponivel: 20 }];

  it("gera comanda AGUARDANDO_CAIXA com os dados do orçamento", () => {
    const resultado = converterOrcamentoEmVenda(
      criarOrcamento(),
      estoqueSuficiente,
      REFERENCIA,
    );

    expect(resultado.ok).toBe(true);

    if (!resultado.ok) {
      throw new Error("A conversão deveria ter sido concluída.");
    }

    expect(resultado.comanda.status).toBe("AGUARDANDO_CAIXA");
    expect(resultado.comanda.origem).toBe("ORCAMENTO");
    expect(resultado.comanda.numero).toBe("#PV-2026-089");
    expect(resultado.comanda.orcamentoNumero).toBe("#ORC-2026-089");
    expect(resultado.comanda.clienteNome).toBe("Construtora Horizonte");
    expect(resultado.comanda.total).toBe(410.67);
    expect(resultado.comanda.itens).toHaveLength(1);
    expect(resultado.comanda.itens[0]).toMatchObject({
      produtoId: "p-cim",
      quantidade: 10,
      precoUnitario: 45.63,
      descontoPercent: 10,
      subtotal: 410.67,
    });
    expect(resultado.avisos).toEqual([]);
  });

  it("aceita cliente balcão e emite aviso de venda sem identificação", () => {
    const resultado = converterOrcamentoEmVenda(
      criarOrcamento({ cliente: null }),
      estoqueSuficiente,
      REFERENCIA,
    );

    expect(resultado.ok).toBe(true);

    if (!resultado.ok) {
      throw new Error("A conversão deveria ter sido concluída.");
    }

    expect(resultado.comanda.clienteNome).toBe("Cliente Balcão");
    expect(resultado.comanda.clienteDocumento).toBeNull();
    expect(resultado.avisos.join(" ")).toMatch(/balcão/i);
  });

  it("bloqueia a conversão de orçamento expirado", () => {
    const resultado = converterOrcamentoEmVenda(
      criarOrcamento({ dataEmissao: "2026-10-30", validadeDias: 5 }),
      estoqueSuficiente,
      REFERENCIA,
    );

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("A conversão não deveria ter sido concluída.");
    }

    expect(resultado.erros[0]).toMatch(/expirou/i);
  });

  it("bloqueia a conversão quando o estoque do galpão é insuficiente", () => {
    const resultado = converterOrcamentoEmVenda(
      criarOrcamento(),
      [{ produtoId: "p-cim", saldoDisponivel: 5 }],
      REFERENCIA,
    );

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("A conversão não deveria ter sido concluída.");
    }

    expect(resultado.itensSemEstoque).toEqual([
      {
        produtoId: "p-cim",
        descricao: "Cimento CP II 50 kg",
        solicitado: 10,
        disponivel: 5,
      },
    ]);
    expect(resultado.erros.join(" ")).toMatch(/estoque insuficiente/i);
  });

  it("considera estoque zero quando o produto não tem posição cadastrada", () => {
    const resultado = converterOrcamentoEmVenda(
      criarOrcamento(),
      [],
      REFERENCIA,
    );

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("A conversão não deveria ter sido concluída.");
    }

    expect(resultado.itensSemEstoque[0].disponivel).toBe(0);
  });

  it("bloqueia orçamento cancelado", () => {
    const resultado = converterOrcamentoEmVenda(
      criarOrcamento({ status: "CANCELADO" }),
      estoqueSuficiente,
      REFERENCIA,
    );

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("A conversão não deveria ter sido concluída.");
    }

    expect(resultado.erros.join(" ")).toMatch(/cancelado/i);
  });

  it("bloqueia orçamento já convertido", () => {
    const resultado = converterOrcamentoEmVenda(
      criarOrcamento({ status: "CONVERTIDO" }),
      estoqueSuficiente,
      REFERENCIA,
    );

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("A conversão não deveria ter sido concluída.");
    }

    expect(resultado.erros.join(" ")).toMatch(/já foi convertido/i);
  });

  it("bloqueia orçamento sem itens", () => {
    const resultado = converterOrcamentoEmVenda(
      criarOrcamento({ itens: [] }),
      estoqueSuficiente,
      REFERENCIA,
    );

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("A conversão não deveria ter sido concluída.");
    }

    expect(resultado.erros.join(" ")).toMatch(/não possui itens/i);
  });
});
