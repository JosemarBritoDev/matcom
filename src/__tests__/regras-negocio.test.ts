import { describe, expect, it } from "@jest/globals";

import {
  avaliarCompraCrediario,
  avaliarSolicitacaoDesconto,
  calcularCustoMedioPonderado,
  calcularDre,
  resolverPrecoVenda,
  validarSangria,
} from "@/lib/regras-negocio";

/* -------------------------------------------------------------------------- */
/*                     a) Trava antifraude — desconto/PIN                     */
/* -------------------------------------------------------------------------- */

describe("Trava antifraude — aprovação de desconto", () => {
  it("bloqueia vendedor que tenta aprovar o próprio desconto acima do limite", () => {
    const decisao = avaliarSolicitacaoDesconto({
      solicitanteId: "usr-vendedor-01",
      aprovadorId: "usr-vendedor-01",
      papelAprovador: "VENDEDOR",
      descontoSolicitadoPercent: 15,
    });

    expect(decisao.aprovado).toBe(false);
    expect(decisao.requerGerente).toBe(true);
    expect(decisao.motivo).toMatch(/própria solicitação/i);
  });

  it("bloqueia operacional que tenta aprovar desconto de outro colaborador", () => {
    const decisao = avaliarSolicitacaoDesconto({
      solicitanteId: "usr-vendedor-01",
      aprovadorId: "usr-caixa-02",
      papelAprovador: "CAIXA",
      descontoSolicitadoPercent: 12,
    });

    expect(decisao.aprovado).toBe(false);
    expect(decisao.motivo).toMatch(/GERENTE_LOJA|SUPER_ADMIN/);
  });

  it("bloqueia até o gerente de aprovar a própria solicitação", () => {
    const decisao = avaliarSolicitacaoDesconto({
      solicitanteId: "usr-gerente-01",
      aprovadorId: "usr-gerente-01",
      papelAprovador: "GERENTE_LOJA",
      descontoSolicitadoPercent: 20,
    });

    expect(decisao.aprovado).toBe(false);
    expect(decisao.motivo).toMatch(/própria solicitação/i);
  });

  it("permite gerente aprovar desconto acima do limite de outro colaborador", () => {
    const decisao = avaliarSolicitacaoDesconto({
      solicitanteId: "usr-vendedor-01",
      aprovadorId: "usr-gerente-01",
      papelAprovador: "GERENTE_LOJA",
      descontoSolicitadoPercent: 15,
    });

    expect(decisao).toEqual({
      aprovado: true,
      requerGerente: true,
      motivo: expect.stringMatching(/gestor autorizado/i),
    });
  });

  it("aplica desconto dentro do limite sem exigir aprovação gerencial", () => {
    const decisao = avaliarSolicitacaoDesconto({
      solicitanteId: "usr-vendedor-01",
      aprovadorId: "usr-vendedor-01",
      papelAprovador: "VENDEDOR",
      descontoSolicitadoPercent: 10,
    });

    expect(decisao.aprovado).toBe(true);
    expect(decisao.requerGerente).toBe(false);
  });

  it("rejeita percentual de desconto inválido", () => {
    const decisao = avaliarSolicitacaoDesconto({
      solicitanteId: "usr-vendedor-01",
      aprovadorId: "usr-gerente-01",
      papelAprovador: "GERENTE_LOJA",
      descontoSolicitadoPercent: 101,
    });

    expect(decisao.aprovado).toBe(false);
    expect(decisao.motivo).toMatch(/inválido/i);
  });
});

describe("Trava antifraude — sangria de caixa", () => {
  it("bloqueia sangria sem PIN do Gerente", () => {
    const resultado = validarSangria({
      valor: 500,
      motivo: "Troco para o caixa",
      pinInformado: "",
      pinGerente: "1975",
    });

    expect(resultado.autorizada).toBe(false);
    expect(resultado.motivo).toMatch(/PIN/i);
  });

  it("bloqueia sangria com PIN incorreto", () => {
    const resultado = validarSangria({
      valor: 500,
      motivo: "Troco para o caixa",
      pinInformado: "0000",
      pinGerente: "1975",
    });

    expect(resultado.autorizada).toBe(false);
  });

  it("autoriza sangria com valor, motivo e PIN de Gerente válidos", () => {
    const resultado = validarSangria({
      valor: 500,
      motivo: "Troco para o caixa",
      pinInformado: "1975",
      pinGerente: "1975",
    });

    expect(resultado.autorizada).toBe(true);
  });

  it("bloqueia sangria com valor ou motivo inválidos", () => {
    const semValor = validarSangria({
      valor: 0,
      motivo: "Troco",
      pinInformado: "1975",
      pinGerente: "1975",
    });
    const semMotivo = validarSangria({
      valor: 100,
      motivo: "   ",
      pinInformado: "1975",
      pinGerente: "1975",
    });

    expect(semValor.autorizada).toBe(false);
    expect(semMotivo.autorizada).toBe(false);
  });

  it("bloqueia sangria quando o tenant não possui PIN configurado", () => {
    const resultado = validarSangria({
      valor: 100,
      motivo: "Troco",
      pinInformado: "",
      pinGerente: "",
    });

    expect(resultado.autorizada).toBe(false);
    expect(resultado.motivo).toMatch(/PIN de Gerente .*configurado/i);
  });
});

/* -------------------------------------------------------------------------- */
/*                    b) Crediário — cadastro simplificado                    */
/* -------------------------------------------------------------------------- */

describe("Crediário — cadastro e limite", () => {
  it("bloqueia compra a prazo de cliente com cadastro SIMPLIFICADO", () => {
    const resultado = avaliarCompraCrediario({
      cliente: {
        tipoCadastro: "SIMPLIFICADO",
        statusConta: "ATIVO",
        limiteCredito: 5000,
      },
      valorCompra: 300,
    });

    expect(resultado.permitido).toBe(false);
    expect(resultado.motivo).toMatch(/SIMPLIFICADO/i);
  });

  it("libera compra a prazo de cliente COMPLETO dentro do limite", () => {
    const resultado = avaliarCompraCrediario({
      cliente: {
        tipoCadastro: "COMPLETO",
        statusConta: "ATIVO",
        limiteCredito: 2000,
        saldoDevedor: 500,
      },
      valorCompra: 1500,
    });

    expect(resultado.permitido).toBe(true);
    expect(resultado.limiteDisponivel).toBe(1500);
  });

  it("bloqueia compra que ultrapassa o limite disponível", () => {
    const resultado = avaliarCompraCrediario({
      cliente: {
        tipoCadastro: "COMPLETO",
        statusConta: "ATIVO",
        limiteCredito: 2000,
        saldoDevedor: 500,
      },
      valorCompra: 1500.01,
    });

    expect(resultado.permitido).toBe(false);
    expect(resultado.limiteDisponivel).toBe(1500);
    expect(resultado.motivo).toMatch(/Limite de crediário insuficiente/i);
  });

  it("bloqueia cliente com conta bloqueada ou pendência financeira", () => {
    const bloqueado = avaliarCompraCrediario({
      cliente: {
        tipoCadastro: "COMPLETO",
        statusConta: "BLOQUEADO",
        limiteCredito: 10000,
      },
      valorCompra: 100,
    });
    const pendente = avaliarCompraCrediario({
      cliente: {
        tipoCadastro: "COMPLETO",
        statusConta: "ATIVO",
        limiteCredito: 10000,
        pendenciasFinanceiras: true,
      },
      valorCompra: 100,
    });

    expect(bloqueado.permitido).toBe(false);
    expect(pendente.permitido).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*                  c) Estoque & NF-e — custo médio e atacado                  */
/* -------------------------------------------------------------------------- */

describe("Estoque & NF-e — custo médio ponderado", () => {
  it("calcula a média ponderada entre saldo atual e entrada da NF-e", () => {
    const custoMedio = calcularCustoMedioPonderado({
      estoqueAtual: 100,
      custoMedioAtual: 10,
      quantidadeEntrada: 50,
      custoUnitarioEntrada: 16,
    });

    // (100 * 10 + 50 * 16) / 150 = 12
    expect(custoMedio).toBe(12);
  });

  it("usa o custo da entrada quando o estoque atual é zero", () => {
    const custoMedio = calcularCustoMedioPonderado({
      estoqueAtual: 0,
      custoMedioAtual: 0,
      quantidadeEntrada: 80,
      custoUnitarioEntrada: 42.5,
    });

    expect(custoMedio).toBe(42.5);
  });

  it("retorna zero quando não há saldo nem entrada", () => {
    const custoMedio = calcularCustoMedioPonderado({
      estoqueAtual: 0,
      custoMedioAtual: 25,
      quantidadeEntrada: 0,
      custoUnitarioEntrada: 30,
    });

    expect(custoMedio).toBe(0);
  });

  it("rejeita valores negativos no cálculo", () => {
    expect(() =>
      calcularCustoMedioPonderado({
        estoqueAtual: 10,
        custoMedioAtual: 10,
        quantidadeEntrada: -1,
        custoUnitarioEntrada: 20,
      }),
    ).toThrow(/negativos/i);
  });
});

describe("Estoque & Vendas — preço de atacado por quantidade mínima", () => {
  const contextoBase = {
    tabelaCliente: "ATACADO" as const,
    statusTabela: "APROVADO" as const,
    tipoCadastro: "COMPLETO" as const,
    quantidade: 20,
    quantidadeMinimaAtacado: 20,
    precoVarejo: 45.63,
    precoAtacado: 42.9,
  };

  it("aplica atacado quando cliente aprovado atinge a quantidade mínima", () => {
    const resultado = resolverPrecoVenda(contextoBase);

    expect(resultado.tabelaAplicada).toBe("ATACADO");
    expect(resultado.precoUnitario).toBe(42.9);
  });

  it("aplica varejo quando a quantidade fica abaixo do mínimo de atacado", () => {
    const resultado = resolverPrecoVenda({ ...contextoBase, quantidade: 19 });

    expect(resultado.tabelaAplicada).toBe("VAREJO");
    expect(resultado.precoUnitario).toBe(45.63);
    expect(resultado.motivo).toMatch(/mínimo de atacado/i);
  });

  it("não aplica atacado com tabela PENDENTE de aprovação", () => {
    const resultado = resolverPrecoVenda({
      ...contextoBase,
      statusTabela: "PENDENTE",
    });

    expect(resultado.tabelaAplicada).toBe("VAREJO");
  });

  it("não aplica atacado para cliente com cadastro simplificado", () => {
    const resultado = resolverPrecoVenda({
      ...contextoBase,
      tipoCadastro: "SIMPLIFICADO",
    });

    expect(resultado.tabelaAplicada).toBe("VAREJO");
  });
});

/* -------------------------------------------------------------------------- */
/*                        d) Financeiro — DRE gerencial                        */
/* -------------------------------------------------------------------------- */

describe("Financeiro — DRE gerencial", () => {
  it("calcula Lucro Operacional = Faturamento - COGS - Despesas", () => {
    const dre = calcularDre({
      faturamentoBruto: 486_420.8,
      cogs: 302_480.15,
      despesasOperacionais: 98_420.3,
    });

    expect(dre.lucroBruto).toBe(183_940.65);
    expect(dre.lucroOperacional).toBe(85_520.35);
    expect(dre.margemBrutaPercent).toBe(37.82);
    expect(dre.margemOperacionalPercent).toBe(17.58);
  });

  it("calcula prejuízo operacional quando despesas superam a margem bruta", () => {
    const dre = calcularDre({
      faturamentoBruto: 10_000,
      cogs: 7_000,
      despesasOperacionais: 4_000,
    });

    expect(dre.lucroBruto).toBe(3_000);
    expect(dre.lucroOperacional).toBe(-1_000);
    expect(dre.margemOperacionalPercent).toBe(-10);
  });

  it("zera margens quando o faturamento é zero", () => {
    const dre = calcularDre({
      faturamentoBruto: 0,
      cogs: 0,
      despesasOperacionais: 500,
    });

    expect(dre.lucroOperacional).toBe(-500);
    expect(dre.margemBrutaPercent).toBe(0);
    expect(dre.margemOperacionalPercent).toBe(0);
  });

  it("rejeita valores inválidos na DRE", () => {
    expect(() =>
      calcularDre({
        faturamentoBruto: Number.NaN,
        cogs: 100,
        despesasOperacionais: 50,
      }),
    ).toThrow(/inválidos/i);
  });
});