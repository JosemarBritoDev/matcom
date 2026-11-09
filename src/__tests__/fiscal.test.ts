import { describe, expect, it } from "@jest/globals";

import {
  EMITENTE_FISCAL_PADRAO,
  exigeIntegracaoSefaz,
  liquidarComandaFiscal,
  validarCnpj,
  validarCpf,
  validarDocumentoFiscal,
  type DadosLiquidacaoFiscal,
} from "@/lib/fiscal-service";

const CPF_VALIDO = "529.982.247-25";
const CNPJ_VALIDO = "11.222.333/0001-81";

function criarDados(
  sobrescritas: Partial<DadosLiquidacaoFiscal> = {},
): DadosLiquidacaoFiscal {
  return {
    orderId: "cmd-1051",
    orderNumber: 1051,
    tipo: "RECIBO_INTERNO",
    documento: null,
    clienteNome: "Construtora Horizonte Ltda.",
    formaPagamento: "PIX",
    total: 1250.5,
    emitidaEm: new Date("2026-11-08T14:30:00.000Z"),
    itens: [
      {
        itemId: "i-1",
        descricao: "Cimento CP II 50 kg",
        unidade: "saco",
        quantidade: 60,
        valorUnitario: 34.5,
        valorTotal: 2070,
      },
      {
        itemId: "i-2",
        descricao: "Areia média lavada",
        unidade: "m³",
        quantidade: 4.5,
        valorUnitario: 112,
        valorTotal: 504,
      },
    ],
    ...sobrescritas,
  };
}

/* -------------------------------------------------------------------------- */
/*                          Validação de documentos                           */
/* -------------------------------------------------------------------------- */

describe("fiscal — validação de CPF/CNPJ", () => {
  it("aceita CPF com dígitos verificadores válidos", () => {
    expect(validarCpf(CPF_VALIDO)).toBe(true);
  });

  it("rejeita CPF com dígitos verificadores inválidos", () => {
    expect(validarCpf("529.982.247-24")).toBe(false);
  });

  it("rejeita CPF com sequência repetida", () => {
    expect(validarCpf("111.111.111-11")).toBe(false);
  });

  it("aceita CNPJ com dígitos verificadores válidos", () => {
    expect(validarCnpj(CNPJ_VALIDO)).toBe(true);
  });

  it("rejeita CNPJ inválido", () => {
    expect(validarCnpj("11.222.333/0001-80")).toBe(false);
  });

  it("dispensa documento para Recibo Interno", () => {
    const validacao = validarDocumentoFiscal("RECIBO_INTERNO", "");

    expect(validacao.ok).toBe(true);
    expect(validacao.documentoNormalizado).toBeNull();
  });

  it("exige documento para NFC-e e NF-e", () => {
    expect(validarDocumentoFiscal("NFCE", "").ok).toBe(false);
    expect(validarDocumentoFiscal("NFE", "").ok).toBe(false);
  });

  it("classifica CPF e CNPJ normalizando a máscara", () => {
    expect(validarDocumentoFiscal("NFCE", CPF_VALIDO)).toMatchObject({
      ok: true,
      documentoNormalizado: "52998224725",
      tipoDocumento: "CPF",
    });

    expect(validarDocumentoFiscal("NFE", CNPJ_VALIDO)).toMatchObject({
      ok: true,
      documentoNormalizado: "11222333000181",
      tipoDocumento: "CNPJ",
    });
  });

  it("rejeita documento com quantidade de dígitos inválida", () => {
    const validacao = validarDocumentoFiscal("NFCE", "123.456");

    expect(validacao.ok).toBe(false);
    expect(validacao.mensagem).toMatch(/11 dígitos/i);
  });
});

/* -------------------------------------------------------------------------- */
/*                     Efeitos por tipo de emissão fiscal                     */
/* -------------------------------------------------------------------------- */

describe("fiscal — Recibo Interno de Venda", () => {
  it("liquida sem SEFAZ mantendo estoque, financeiro e DRE", () => {
    const resultado = liquidarComandaFiscal(criarDados());

    expect(resultado.ok).toBe(true);
    expect(resultado.disparaSefaz).toBe(false);
    expect(resultado.statusFiscal).toBe("NAO_APLICAVEL");
    expect(resultado.payloadFiscal).toBeNull();
    expect(resultado.comprovanteConferencia).toBe(true);
    expect(resultado.dreAtualizado).toBe(true);
    expect(resultado.baixasEstoque).toEqual([
      {
        itemId: "i-1",
        descricao: "Cimento CP II 50 kg",
        unidade: "saco",
        quantidade: 60,
      },
      {
        itemId: "i-2",
        descricao: "Areia média lavada",
        unidade: "m³",
        quantidade: 4.5,
      },
    ]);
    expect(resultado.lancamentosFinanceiros).toEqual([
      {
        tipo: "RECEBIMENTO",
        descricao: "Recebimento da comanda #1051",
        valor: 1250.5,
        formaPagamento: "PIX",
        orderNumber: 1051,
      },
    ]);
  });

  it("não exige CPF/CNPJ para emitir o comprovante interno", () => {
    const resultado = liquidarComandaFiscal(
      criarDados({ documento: undefined, clienteNome: "Cliente Balcão" }),
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.documento).toBeNull();
    expect(resultado.tipoDocumento).toBeNull();
  });
});

describe("fiscal — NFC-e", () => {
  it("aceita CPF válido e prepara payload pendente de envio", () => {
    const resultado = liquidarComandaFiscal(
      criarDados({ tipo: "NFCE", documento: CPF_VALIDO }),
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.disparaSefaz).toBe(true);
    expect(resultado.statusFiscal).toBe("PENDENTE_ENVIO");
    expect(resultado.comprovanteConferencia).toBe(false);
    expect(resultado.dreAtualizado).toBe(true);
    expect(resultado.baixasEstoque).toHaveLength(2);
    expect(resultado.lancamentosFinanceiros).toHaveLength(1);

    expect(resultado.payloadFiscal).toMatchObject({
      versao: "1.0",
      tipo: "NFCE",
      emitente: EMITENTE_FISCAL_PADRAO,
      destinatario: {
        nome: "Construtora Horizonte Ltda.",
        documento: "52998224725",
        tipoDocumento: "CPF",
      },
      total: 1250.5,
      pagamento: { forma: "PIX", valor: 1250.5 },
      status: "PENDENTE_ENVIO",
    });
    expect(resultado.payloadFiscal?.itens).toHaveLength(2);
    expect(resultado.payloadFiscal?.emitidaEm).toBe(
      "2026-11-08T14:30:00.000Z",
    );
  });

  it("bloqueia emissão sem CPF/CNPJ e não baixa estoque", () => {
    const resultado = liquidarComandaFiscal(
      criarDados({ tipo: "NFCE", documento: "" }),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.statusFiscal).toBe("REJEITADO");
    expect(resultado.erros.join(" ")).toMatch(/CPF\/CNPJ/i);
    expect(resultado.baixasEstoque).toEqual([]);
    expect(resultado.lancamentosFinanceiros).toEqual([]);
    expect(resultado.dreAtualizado).toBe(false);
    expect(resultado.payloadFiscal).toBeNull();
  });

  it("bloqueia CPF inválido antes de gerar qualquer efeito", () => {
    const resultado = liquidarComandaFiscal(
      criarDados({ tipo: "NFCE", documento: "529.982.247-24" }),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.erros.join(" ")).toMatch(/CPF inválido/i);
    expect(resultado.baixasEstoque).toEqual([]);
  });
});

describe("fiscal — NF-e", () => {
  it("aceita CNPJ válido e prepara payload da nota cheia", () => {
    const resultado = liquidarComandaFiscal(
      criarDados({ tipo: "NFE", documento: CNPJ_VALIDO }),
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.disparaSefaz).toBe(true);
    expect(resultado.statusFiscal).toBe("PENDENTE_ENVIO");
    expect(resultado.payloadFiscal).toMatchObject({
      tipo: "NFE",
      destinatario: {
        documento: "11222333000181",
        tipoDocumento: "CNPJ",
      },
    });
    expect(resultado.baixasEstoque).toHaveLength(2);
    expect(resultado.lancamentosFinanceiros).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/*                         Efeitos comuns e falhas                            */
/* -------------------------------------------------------------------------- */

describe("fiscal — efeitos comuns a todos os tipos", () => {
  it("mantém baixa de estoque e lançamento financeiro em todos os tipos", () => {
    const tipos = ["RECIBO_INTERNO", "NFCE", "NFE"] as const;

    for (const tipo of tipos) {
      const resultado = liquidarComandaFiscal(
        criarDados({
          tipo,
          documento: tipo === "RECIBO_INTERNO" ? null : CNPJ_VALIDO,
        }),
      );

      expect(resultado.ok).toBe(true);
      expect(resultado.baixasEstoque).toHaveLength(2);
      expect(resultado.lancamentosFinanceiros).toHaveLength(1);
      expect(resultado.dreAtualizado).toBe(true);
    }
  });

  it("rejeita comanda sem itens", () => {
    const resultado = liquidarComandaFiscal(criarDados({ itens: [] }));

    expect(resultado.ok).toBe(false);
    expect(resultado.erros.join(" ")).toMatch(/não possui itens/i);
    expect(resultado.baixasEstoque).toEqual([]);
  });

  it("rejeita total inválido", () => {
    const resultado = liquidarComandaFiscal(criarDados({ total: 0 }));

    expect(resultado.ok).toBe(false);
    expect(resultado.erros.join(" ")).toMatch(/total da comanda inválido/i);
  });

  it("rejeita item com quantidade inválida", () => {
    const resultado = liquidarComandaFiscal(
      criarDados({
        itens: [
          {
            itemId: "i-1",
            descricao: "Cimento CP II 50 kg",
            unidade: "saco",
            quantidade: 0,
            valorUnitario: 34.5,
            valorTotal: 0,
          },
        ],
      }),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.erros.join(" ")).toMatch(/quantidade inválida/i);
  });

  it("identifica quais tipos exigem SEFAZ", () => {
    expect(exigeIntegracaoSefaz("RECIBO_INTERNO")).toBe(false);
    expect(exigeIntegracaoSefaz("NFCE")).toBe(true);
    expect(exigeIntegracaoSefaz("NFE")).toBe(true);
  });
});
