import { describe, expect, it } from "@jest/globals";

import {
  converterOrcamentoEmVenda,
  type Orcamento,
} from "@/lib/orcamento-service";
import {
  liquidarComandaFiscal,
  type DadosLiquidacaoFiscal,
} from "@/lib/fiscal-service";
import {
  classificarMaterial,
  conferirTodosItens,
  confirmarSaidaGalpao,
  iniciarSeparacao,
  type ComandaExpedicao,
} from "@/lib/expedicao-service";
import {
  filtrarPorTenantAtivo,
  resolverSessaoAtiva,
} from "@/lib/session";

const CNPJ_VALIDO = "11.222.333/0001-81";
const DATA_FLUXO = "2026-11-09T14:00:00.000Z";

describe("Fluxo operacional integrado por tenant", () => {
  it("converte orçamento em fila, liquida no caixa e conclui a expedição", () => {
    const sessao = resolverSessaoAtiva();
    expect(sessao).not.toBeNull();

    const orcamento: Orcamento = {
      id: "orc-e2e-01",
      numero: "ORC-2401",
      cliente: {
        id: "cliente-01",
        nome: "Construtora Horizonte",
        documento: CNPJ_VALIDO,
      },
      vendedor: "Ana Paula",
      dataEmissao: "2026-11-09",
      validadeDias: 10,
      condicaoPagamento: "PIX",
      status: "ABERTO",
      itens: [
        {
          produtoId: "produto-cimento-01",
          descricao: "Cimento CP II 50 kg",
          unidade: "UN",
          quantidade: 2,
          precoTabela: 45.5,
        },
      ],
    };

    const orcamentosDoTenant = filtrarPorTenantAtivo(sessao, [
      { tenantId: sessao!.tenantId, dados: orcamento },
      {
        tenantId: "tenant-alheio",
        dados: { ...orcamento, id: "orc-alheio" },
      },
    ]);
    expect(orcamentosDoTenant).toHaveLength(1);

    const conversao = converterOrcamentoEmVenda(
      orcamentosDoTenant[0].dados,
      [{ produtoId: "produto-cimento-01", saldoDisponivel: 10 }],
      DATA_FLUXO,
    );

    expect(conversao.ok).toBe(true);
    if (!conversao.ok) {
      return;
    }

    expect(conversao.comanda.status).toBe("AGUARDANDO_CAIXA");

    const dadosLiquidacao: DadosLiquidacaoFiscal = {
      orderId: conversao.comanda.id,
      orderNumber: 2401,
      tipo: "NFE",
      documento: CNPJ_VALIDO,
      clienteNome: conversao.comanda.clienteNome,
      formaPagamento: "PIX",
      total: conversao.comanda.total,
      emitidaEm: DATA_FLUXO,
      itens: conversao.comanda.itens.map((item) => ({
        itemId: item.produtoId,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valorUnitario: item.precoUnitario,
        valorTotal: item.subtotal,
      })),
    };
    const liquidacao = liquidarComandaFiscal(dadosLiquidacao);

    expect(liquidacao.ok).toBe(true);
    expect(liquidacao.dreAtualizado).toBe(true);
    expect(liquidacao.baixasEstoque).toHaveLength(1);
    expect(liquidacao.payloadFiscal?.status).toBe("PENDENTE_ENVIO");

    const comandaExpedicao: ComandaExpedicao = {
      id: conversao.comanda.id,
      numero: conversao.comanda.numero,
      cliente: conversao.comanda.clienteNome,
      documento: conversao.comanda.clienteDocumento,
      vendedor: conversao.comanda.vendedor,
      modalidade: "ENTREGA",
      status: "AGUARDANDO_SEPARACAO",
      bairro: "Centro",
      endereco: "Av. das Obras, 850",
      pesoKg: 100,
      volumes: 2,
      pagoEm: DATA_FLUXO,
      itens: conversao.comanda.itens.map((item, index) => ({
        id: `separacao-${index + 1}`,
        descricao: item.descricao,
        categoria: classificarMaterial(item.descricao),
        unidade: item.unidade,
        quantidade: item.quantidade,
        localizacao: "Corredor A · Pallet 02",
        conferido: false,
      })),
    };

    const separacao = iniciarSeparacao(comandaExpedicao, DATA_FLUXO);
    expect(separacao.ok).toBe(true);
    expect(separacao.comanda.status).toBe("EM_SEPARACAO");

    const conferencia = conferirTodosItens(separacao.comanda, DATA_FLUXO);
    expect(conferencia.ok).toBe(true);
    expect(conferencia.comanda.status).toBe("PRONTO");

    const saida = confirmarSaidaGalpao(conferencia.comanda, DATA_FLUXO);
    expect(saida.ok).toBe(true);
    expect(saida.comanda.status).toBe("CONCLUIDO");
    expect(saida.comanda.emTransito).toBe(true);
  });
});
