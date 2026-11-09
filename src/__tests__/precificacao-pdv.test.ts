import { describe, expect, it } from "@jest/globals";

import {
  avaliarDisponibilidadeVenda,
  avaliarLiberacaoAtacado,
  calcularCustoEfetivo,
  calcularMargemSobreCusto,
  calcularPrecoVendaPorMargem,
  classificarEstoque,
  validarLiberacaoEstoque,
} from "@/lib/regras-negocio";

/* -------------------------------------------------------------------------- */
/*         Etapa 2 — trava da tabela de atacado e negociação no PDV           */
/* -------------------------------------------------------------------------- */

describe("PDV — liberação da tabela de Atacado", () => {
  it("libera a negociação quando o cliente tem Atacado aprovado e cadastro completo", () => {
    const decisao = avaliarLiberacaoAtacado({
      tabelaCliente: "ATACADO",
      statusTabela: "APROVADO",
      tipoCadastro: "COMPLETO",
    });

    expect(decisao.liberado).toBe(true);
    expect(decisao.motivo).toMatch(/aprovado/i);
  });

  it("mantém o Varejo travado quando a aprovação está pendente", () => {
    const decisao = avaliarLiberacaoAtacado({
      tabelaCliente: "ATACADO",
      statusTabela: "PENDENTE",
      tipoCadastro: "COMPLETO",
    });

    expect(decisao.liberado).toBe(false);
    expect(decisao.motivo).toMatch(/pendente/i);
  });

  it("mantém o Varejo travado quando a aprovação foi rejeitada", () => {
    const decisao = avaliarLiberacaoAtacado({
      tabelaCliente: "ATACADO",
      statusTabela: "REJEITADO",
      tipoCadastro: "COMPLETO",
    });

    expect(decisao.liberado).toBe(false);
    expect(decisao.motivo).toMatch(/rejeitada/i);
  });

  it("mantém o Varejo travado para cliente sem tabela de Atacado", () => {
    const decisao = avaliarLiberacaoAtacado({
      tabelaCliente: "VAREJO",
      statusTabela: "APROVADO",
      tipoCadastro: "COMPLETO",
    });

    expect(decisao.liberado).toBe(false);
    expect(decisao.motivo).toMatch(/não possui tabela de Atacado/i);
  });

  it("mantém o Varejo travado para cadastro simplificado", () => {
    const decisao = avaliarLiberacaoAtacado({
      tabelaCliente: "ATACADO",
      statusTabela: "APROVADO",
      tipoCadastro: "SIMPLIFICADO",
    });

    expect(decisao.liberado).toBe(false);
    expect(decisao.motivo).toMatch(/cadastro completo/i);
  });
});

/* -------------------------------------------------------------------------- */
/*              Etapa 4 — cálculo bidirecional de precificação                */
/* -------------------------------------------------------------------------- */

describe("Cadastro de produtos — margem bidirecional", () => {
  it("recalcula a margem a partir do custo e do preço de venda", () => {
    expect(calcularMargemSobreCusto(100, 125)).toBe(25);
    expect(calcularMargemSobreCusto(36.8, 45.63)).toBe(23.99);
  });

  it("recalcula o preço de venda de varejo a partir da margem target", () => {
    expect(calcularPrecoVendaPorMargem(100, 25)).toBe(125);
    expect(calcularPrecoVendaPorMargem(36.8, 24)).toBe(45.63);
  });

  it("mantém o preço estável no ciclo margem → preço → margem", () => {
    const custo = 100;
    const margem = 25;
    const preco = calcularPrecoVendaPorMargem(custo, margem);

    expect(calcularMargemSobreCusto(custo, preco)).toBe(margem);
  });

  it("retorna zero quando o custo é inválido", () => {
    expect(calcularMargemSobreCusto(0, 100)).toBe(0);
    expect(calcularPrecoVendaPorMargem(0, 20)).toBe(0);
    expect(calcularPrecoVendaPorMargem(-10, 20)).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/*        Etapa 3 — indicadores de estoque e flags logísticas no PDV          */
/* -------------------------------------------------------------------------- */

describe("PDV — classificação visual do estoque", () => {
  it("classifica saldo confortável como 🟢 OK", () => {
    expect(classificarEstoque({ saldo: 320, minimo: 80 })).toBe("OK");
  });

  it("classifica saldo abaixo do mínimo como 🟡 estoque baixo", () => {
    expect(classificarEstoque({ saldo: 18, minimo: 50 })).toBe("BAIXO");
  });

  it("classifica saldo zerado como 🔴 sem estoque", () => {
    expect(classificarEstoque({ saldo: 0, minimo: 15 })).toBe("ZERADO");
  });

  it("classifica quantidade pedida acima do saldo como 🔴 insuficiente", () => {
    expect(
      classificarEstoque({ saldo: 10, minimo: 5, quantidadeSolicitada: 12 }),
    ).toBe("INSUFICIENTE");
  });
});

describe("PDV — disponibilidade e flags logísticas", () => {
  it("não aplica travas quando existe estoque suficiente", () => {
    const avaliacao = avaliarDisponibilidadeVenda("RETIRADA_IMEDIATA", false);

    expect(avaliacao).toMatchObject({
      faltaEstoque: false,
      exigeAutorizacaoGerente: false,
      flagPedido: null,
      notificarCompras: false,
      notificarLogistica: false,
    });
  });

  it("exige PIN do Gerente e alerta Compras na retirada imediata sem saldo", () => {
    const avaliacao = avaliarDisponibilidadeVenda("RETIRADA_IMEDIATA", true);

    expect(avaliacao.exigeAutorizacaoGerente).toBe(true);
    expect(avaliacao.flagPedido).toBeNull();
    expect(avaliacao.notificarCompras).toBe(true);
    expect(avaliacao.notificarLogistica).toBe(false);
  });

  it("conclui entrega programada com flag e notifica Logística e Compras", () => {
    const avaliacao = avaliarDisponibilidadeVenda("ENTREGA_PENDENTE", true);

    expect(avaliacao.exigeAutorizacaoGerente).toBe(false);
    expect(avaliacao.flagPedido).toBe("ENTREGA_AGUARDANDO_PRODUTO");
    expect(avaliacao.notificarCompras).toBe(true);
    expect(avaliacao.notificarLogistica).toBe(true);
  });
});

describe("PDV — validação do PIN de liberação", () => {
  it("autoriza a retirada com o PIN correto do Gerente", () => {
    const resultado = validarLiberacaoEstoque({
      pinInformado: "1975",
      pinGerente: "1975",
    });

    expect(resultado.autorizada).toBe(true);
    expect(resultado.motivo).toMatch(/liberada/i);
  });

  it("bloqueia a retirada com PIN incorreto", () => {
    const resultado = validarLiberacaoEstoque({
      pinInformado: "0000",
      pinGerente: "1975",
    });

    expect(resultado.autorizada).toBe(false);
    expect(resultado.motivo).toMatch(/incorreto/i);
  });

  it("bloqueia a retirada quando não há PIN configurado", () => {
    const resultado = validarLiberacaoEstoque({
      pinInformado: "1975",
      pinGerente: "  ",
    });

    expect(resultado.autorizada).toBe(false);
    expect(resultado.motivo).toMatch(/nenhum PIN/i);
  });
});

/* -------------------------------------------------------------------------- */
/*              Etapa 5 — custo efetivo das entradas de estoque               */
/* -------------------------------------------------------------------------- */

describe("Entrada de estoque — custo efetivo", () => {
  it("soma custo bruto, IPI, ICMS-ST e frete/despesas no XML", () => {
    expect(
      calcularCustoEfetivo({
        custoBruto: 100,
        ipi: 5,
        icmsSt: 12.5,
        freteDespesas: 7.5,
      }),
    ).toBe(125);
  });

  it("aceita entrada física simplificada apenas com custo bruto", () => {
    expect(calcularCustoEfetivo({ custoBruto: 39.9 })).toBe(39.9);
  });

  it("rejeita valores negativos", () => {
    expect(() =>
      calcularCustoEfetivo({ custoBruto: 100, freteDespesas: -1 }),
    ).toThrow(/negativos/i);
  });

  it("rejeita valores inválidos", () => {
    expect(() =>
      calcularCustoEfetivo({ custoBruto: Number.NaN }),
    ).toThrow(/inválidos/i);
  });
});
