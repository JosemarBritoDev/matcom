import { describe, expect, it } from "@jest/globals";

import {
  calcularIndicadoresExpedicao,
  calcularProgressoConferencia,
  classificarMaterial,
  comandaTemMaterialPesado,
  conferirItem,
  conferirTodosItens,
  confirmarSaidaGalpao,
  contarComandasPorStatus,
  iniciarSeparacao,
  montarRomaneio,
  type ComandaExpedicao,
  type ItemSeparacao,
} from "@/lib/expedicao-service";

import {
  listarModulosAtivos,
  mensagemModuloNaoContratado,
  moduloAtivo,
  resolverModuloPersistido,
  verificarAcessoModulo,
} from "@/lib/permissions";

/* -------------------------------------------------------------------------- */
/*                                 Fixtures                                   */
/* -------------------------------------------------------------------------- */

function criarItem(sobrescritas: Partial<ItemSeparacao> = {}): ItemSeparacao {
  return {
    id: "item-1",
    descricao: "Cimento CP II 50 kg",
    categoria: "CIMENTO",
    unidade: "SC",
    quantidade: 10,
    localizacao: "Corredor A · Pallet 02",
    conferido: false,
    ...sobrescritas,
  };
}

function criarComanda(
  sobrescritas: Partial<ComandaExpedicao> = {},
): ComandaExpedicao {
  return {
    id: "cmd-1051",
    numero: "#1051",
    cliente: "Construtora Horizonte",
    vendedor: "Ana Paula",
    modalidade: "ENTREGA",
    status: "AGUARDANDO_SEPARACAO",
    bairro: "Centro",
    endereco: "Av. das Obras, 850",
    referencia: "Próximo ao Posto Central",
    pesoKg: 1200,
    volumes: 12,
    pagoEm: "2026-11-09T08:00:00.000Z",
    itens: [
      criarItem(),
      criarItem({
        id: "item-2",
        descricao: "Areia Média Lavada",
        categoria: "AREIA",
        unidade: "M3",
        quantidade: 3,
        localizacao: "Pátio externo · Baia 1",
      }),
    ],
    ...sobrescritas,
  };
}

function comandaPronta(
  sobrescritas: Partial<ComandaExpedicao> = {},
): ComandaExpedicao {
  return criarComanda({
    status: "PRONTO",
    iniciadaEm: "2026-11-09T08:00:00.000Z",
    prontaEm: "2026-11-09T08:20:00.000Z",
    itens: [
      criarItem({ id: "item-1", conferido: true }),
      criarItem({
        id: "item-2",
        descricao: "Areia Média Lavada",
        categoria: "AREIA",
        unidade: "M3",
        quantidade: 3,
        conferido: true,
      }),
    ],
    ...sobrescritas,
  });
}

/* -------------------------------------------------------------------------- */
/*                       Permissões — trava de modularidade                   */
/* -------------------------------------------------------------------------- */

describe("permissões — trava de modularidade", () => {
  it("libera expedição por padrão e resolve o alias para logistica", () => {
    expect(moduloAtivo({}, "expedicao")).toBe(true);
    expect(resolverModuloPersistido("expedicao")).toBe("logistica");
  });

  it("bloqueia expedição quando a flag logistica está desativada", () => {
    expect(moduloAtivo({ logistica: false }, "expedicao")).toBe(false);
  });

  it("respeita o override explícito da flag expedicao", () => {
    expect(
      moduloAtivo({ logistica: true, expedicao: false }, "expedicao"),
    ).toBe(false);
    expect(
      moduloAtivo({ logistica: false, expedicao: true }, "expedicao"),
    ).toBe(true);
  });

  it("checa diretamente a chave de permissão 'expedicao'", () => {
    expect(
      verificarAcessoModulo({ expedicao: true }, "expedicao").permitido,
    ).toBe(true);
    expect(
      verificarAcessoModulo({ expedicao: false }, "expedicao").permitido,
    ).toBe(false);
  });

  it("mantém o módulo fiscal desligado por padrão", () => {
    expect(moduloAtivo({}, "fiscal")).toBe(false);
    expect(moduloAtivo({ fiscal: true }, "fiscal")).toBe(true);
  });

  it("retorna acesso negado com motivo padronizado", () => {
    const acesso = verificarAcessoModulo(
      { logistica: false },
      "expedicao",
    );

    expect(acesso.permitido).toBe(false);
    expect(acesso.moduloPersistido).toBe("logistica");
    expect(acesso.rotulo).toMatch(/expedição/i);
    expect(acesso.motivo).toMatch(/não está contratado/i);
    expect(acesso.motivo).toMatch(/logistica/i);
  });

  it("retorna acesso liberado sem motivo", () => {
    const acesso = verificarAcessoModulo({ logistica: true }, "expedicao");

    expect(acesso.permitido).toBe(true);
    expect(acesso.motivo).toBeNull();
  });

  it("lista os módulos ativos considerando os padrões e aliases", () => {
    expect(listarModulosAtivos({ logistica: false })).not.toContain(
      "expedicao",
    );
    expect(listarModulosAtivos({ logistica: true })).toContain("expedicao");
    expect(listarModulosAtivos({})).not.toContain("fiscal");
  });

  it("descreve a flag persistida na mensagem de bloqueio", () => {
    expect(mensagemModuloNaoContratado("expedicao")).toMatch(
      /TenantModule/i,
    );
  });
});

/* -------------------------------------------------------------------------- */
/*                        Classificação de materiais                          */
/* -------------------------------------------------------------------------- */

describe("expedição — classificação de materiais pesados", () => {
  it.each([
    ["Cimento CP II 50 kg", "CIMENTO"],
    ["Areia média lavada", "AREIA"],
    ["Tijolo baiano 8 furos", "TIJOLO"],
    ["Bloco de concreto 14x19x39", "TIJOLO"],
    ["Vergalhão CA-50 10 mm", "FERRO"],
    ["Tela soldada Q-138", "FERRO"],
    ["Tubo PVC 100 mm · 6 m", "TUBO"],
    ["Joelho PVC 100 mm · 90°", "TUBO"],
    ["Argamassa AC-III 20 kg", "ARGAMASSA"],
    ["Rejunte cinza 5 kg", "ARGAMASSA"],
    ["Caixa d'água 310 L", "OUTRO"],
  ])("classifica %s como %s", (descricao, categoria) => {
    expect(classificarMaterial(descricao)).toBe(categoria);
  });

  it("identifica comanda com material pesado", () => {
    expect(comandaTemMaterialPesado(criarComanda())).toBe(true);

    const leve = criarComanda({
      itens: [
        criarItem({
          descricao: "Caixa d'água 310 L",
          categoria: "OUTRO",
        }),
      ],
    });

    expect(comandaTemMaterialPesado(leve)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*                          Checklist e transições                            */
/* -------------------------------------------------------------------------- */

describe("expedição — checklist de separação", () => {
  it("inicia a separação de uma comanda aguardando e registra o horário", () => {
    const resultado = iniciarSeparacao(
      criarComanda(),
      "2026-11-09T09:00:00.000Z",
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.comanda.status).toBe("EM_SEPARACAO");
    expect(resultado.comanda.iniciadaEm).toBe("2026-11-09T09:00:00.000Z");
    expect(resultado.mensagem).toMatch(/iniciada/i);
    expect(criarComanda().status).toBe("AGUARDANDO_SEPARACAO");
  });

  it("não inicia separação de comanda que já saiu do pátio", () => {
    const resultado = iniciarSeparacao(comandaPronta());

    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/não pode iniciar/i);
  });

  it("bloqueia conferência antes de iniciar a separação", () => {
    const resultado = conferirItem(criarComanda(), "item-1");

    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/inicie a separação/i);
  });

  it("mantém em separação enquanto houver item pendente", () => {
    const iniciada = iniciarSeparacao(
      criarComanda(),
      "2026-11-09T09:00:00.000Z",
    ).comanda;

    const resultado = conferirItem(
      iniciada,
      "item-1",
      true,
      "2026-11-09T09:05:00.000Z",
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.comanda.status).toBe("EM_SEPARACAO");
    expect(resultado.comanda.prontaEm).toBeNull();
    expect(calcularProgressoConferencia(resultado.comanda)).toBe(50);
    expect(resultado.promovidaParaPronto).toBe(false);
  });

  it("promove automaticamente para PRONTO ao conferir o último item", () => {
    const iniciada = iniciarSeparacao(
      criarComanda(),
      "2026-11-09T09:00:00.000Z",
    ).comanda;
    const parcial = conferirItem(iniciada, "item-1", true).comanda;

    const resultado = conferirItem(
      parcial,
      "item-2",
      true,
      "2026-11-09T09:18:00.000Z",
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.comanda.status).toBe("PRONTO");
    expect(resultado.comanda.prontaEm).toBe("2026-11-09T09:18:00.000Z");
    expect(resultado.promovidaParaPronto).toBe(true);
    expect(calcularProgressoConferencia(resultado.comanda)).toBe(100);
    expect(resultado.mensagem).toMatch(/checklist completo/i);
  });

  it("permite conferir todos os itens de uma vez", () => {
    const iniciada = iniciarSeparacao(criarComanda()).comanda;
    const resultado = conferirTodosItens(
      iniciada,
      "2026-11-09T09:15:00.000Z",
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.comanda.status).toBe("PRONTO");
    expect(
      resultado.comanda.itens.every((item) => item.conferido),
    ).toBe(true);
    expect(resultado.promovidaParaPronto).toBe(true);
  });

  it("não aceita novo checklist depois de PRONTO", () => {
    const resultado = conferirItem(comandaPronta(), "item-1", false);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/já está pronta/i);
  });

  it("não promove comanda sem itens", () => {
    const resultado = conferirTodosItens(
      criarComanda({
        status: "EM_SEPARACAO",
        itens: [],
      }),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/não possui itens/i);
  });
});

/* -------------------------------------------------------------------------- */
/*                       Baixa / saída do galpão                              */
/* -------------------------------------------------------------------------- */

describe("expedição — baixa de separação e saída do galpão", () => {
  it("bloqueia saída antes de a comanda estar PRONTO", () => {
    const resultado = confirmarSaidaGalpao(
      criarComanda({ status: "EM_SEPARACAO" }),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/precisa estar PRONTA/i);
  });

  it("conclui retirada no balcão marcando retiradaRealizada", () => {
    const resultado = confirmarSaidaGalpao(
      comandaPronta({ modalidade: "RETIRADA" }),
      "2026-11-09T10:00:00.000Z",
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.comanda.status).toBe("CONCLUIDO");
    expect(resultado.comanda.retiradaRealizada).toBe(true);
    expect(resultado.comanda.emTransito).toBe(false);
    expect(resultado.comanda.concluidaEm).toBe("2026-11-09T10:00:00.000Z");
    expect(resultado.mensagem).toMatch(/retirada/i);
  });

  it("conclui entrega colocando a carga em trânsito", () => {
    const resultado = confirmarSaidaGalpao(
      comandaPronta({
        modalidade: "ENTREGA",
        motorista: "Marcos Vieira",
        veiculo: "ABC1D23",
      }),
      "2026-11-09T10:10:00.000Z",
    );

    expect(resultado.ok).toBe(true);
    expect(resultado.comanda.status).toBe("CONCLUIDO");
    expect(resultado.comanda.emTransito).toBe(true);
    expect(resultado.comanda.retiradaRealizada).toBe(false);
    expect(resultado.mensagem).toMatch(/trânsito/i);
    expect(resultado.mensagem).toMatch(/Marcos Vieira/i);
  });

  it("não altera a comanda original durante a baixa", () => {
    const original = comandaPronta({ modalidade: "RETIRADA" });
    const resultado = confirmarSaidaGalpao(original);

    expect(resultado.ok).toBe(true);
    expect(original.status).toBe("PRONTO");
    expect(original.retiradaRealizada).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/*                          Indicadores do dashboard                          */
/* -------------------------------------------------------------------------- */

describe("expedição — indicadores do dashboard", () => {
  it("conta abertas, em andamento, trânsito e retiradas concluídas hoje", () => {
    const comandas: ComandaExpedicao[] = [
      criarComanda({ id: "a", status: "AGUARDANDO_SEPARACAO" }),
      criarComanda({ id: "b", status: "EM_SEPARACAO" }),
      comandaPronta({
        id: "c",
        modalidade: "ENTREGA",
        status: "CONCLUIDO",
        emTransito: true,
        concluidaEm: "2026-11-09T10:10:00.000Z",
      }),
      comandaPronta({
        id: "d",
        modalidade: "RETIRADA",
        status: "CONCLUIDO",
        retiradaRealizada: true,
        concluidaEm: "2026-11-09T09:30:00.000Z",
      }),
      comandaPronta({
        id: "e",
        modalidade: "RETIRADA",
        status: "CONCLUIDO",
        retiradaRealizada: true,
        concluidaEm: "2026-11-08T09:30:00.000Z",
      }),
    ];

    const indicadores = calcularIndicadoresExpedicao(
      comandas,
      "2026-11-09T12:00:00.000Z",
    );

    expect(indicadores.comandasAbertasParaSeparacao).toBe(1);
    expect(indicadores.separacoesEmAndamento).toBe(1);
    expect(indicadores.entregasEmTransito).toBe(1);
    expect(indicadores.retiradasNoBalcaoHoje).toBe(1);
  });

  it("não conta retirada de dia anterior como concluída hoje", () => {
    const indicadores = calcularIndicadoresExpedicao(
      [
        comandaPronta({
          modalidade: "RETIRADA",
          status: "CONCLUIDO",
          retiradaRealizada: true,
          concluidaEm: "2026-11-08T23:50:00.000Z",
        }),
      ],
      "2026-11-09T12:00:00.000Z",
    );

    expect(indicadores.retiradasNoBalcaoHoje).toBe(0);
  });

  it("zera todos os indicadores sem comandas", () => {
    expect(calcularIndicadoresExpedicao([])).toEqual({
      comandasAbertasParaSeparacao: 0,
      separacoesEmAndamento: 0,
      entregasEmTransito: 0,
      retiradasNoBalcaoHoje: 0,
    });
  });

  it("conta comandas por status para as abas", () => {
    const contagem = contarComandasPorStatus([
      criarComanda({ id: "a", status: "AGUARDANDO_SEPARACAO" }),
      criarComanda({ id: "b", status: "EM_SEPARACAO" }),
      criarComanda({ id: "c", status: "EM_SEPARACAO" }),
      comandaPronta({ id: "d" }),
      comandaPronta({ id: "e", status: "CONCLUIDO" }),
    ]);

    expect(contagem).toEqual({
      AGUARDANDO_SEPARACAO: 1,
      EM_SEPARACAO: 2,
      PRONTO: 1,
      CONCLUIDO: 1,
    });
  });
});

/* -------------------------------------------------------------------------- */
/*                              Romaneio de carga                             */
/* -------------------------------------------------------------------------- */

describe("expedição — romaneio de carga", () => {
  const comandaVilaNova = comandaPronta({
    id: "cmd-1048",
    numero: "#1048",
    bairro: "Vila Nova",
    pesoKg: 500,
    volumes: 3,
  });
  const comandaCentro = comandaPronta({
    id: "cmd-1046",
    numero: "#1046",
    bairro: "Centro",
    pesoKg: 300,
    volumes: 2,
  });
  const comandaVilaNova2 = comandaPronta({
    id: "cmd-1050",
    numero: "#1050",
    bairro: "Vila Nova",
    pesoKg: 700,
    volumes: 4,
  });

  it("agrupa por bairro, ordena rotas e calcula totais", () => {
    const resultado = montarRomaneio(
      [comandaVilaNova2, comandaCentro, comandaVilaNova],
      {
        motorista: "Marcos Vieira",
        veiculo: "abc1d23",
        geradoEm: "2026-11-09T10:00:00.000Z",
      },
    );

    expect(resultado.ok).toBe(true);

    if (!resultado.ok) {
      throw new Error("O romaneio deveria ter sido montado.");
    }

    expect(resultado.romaneio.motorista).toBe("Marcos Vieira");
    expect(resultado.romaneio.veiculo).toBe("ABC1D23");
    expect(resultado.romaneio.geradoEm).toBe("2026-11-09T10:00:00.000Z");
    expect(resultado.romaneio.totalComandas).toBe(3);
    expect(resultado.romaneio.totalPesoKg).toBe(1500);
    expect(resultado.romaneio.totalVolumes).toBe(9);

    expect(resultado.romaneio.rotas.map((rota) => rota.bairro)).toEqual([
      "Centro",
      "Vila Nova",
    ]);
    expect(
      resultado.romaneio.rotas[1].comandas.map(
        (comanda) => comanda.numero,
      ),
    ).toEqual(["#1048", "#1050"]);
    expect(resultado.romaneio.rotas[1].pesoKg).toBe(1200);
    expect(resultado.romaneio.rotas[1].volumes).toBe(7);
  });

  it("remove comandas duplicadas da seleção", () => {
    const resultado = montarRomaneio(
      [comandaCentro, comandaCentro],
      {
        motorista: "Marcos Vieira",
        veiculo: "ABC1D23",
        geradoEm: "2026-11-09T10:00:00.000Z",
      },
    );

    expect(resultado.ok).toBe(true);

    if (!resultado.ok) {
      throw new Error("O romaneio deveria ter sido montado.");
    }

    expect(resultado.romaneio.totalComandas).toBe(1);
  });

  it("bloqueia romaneio com comanda fora do status PRONTO", () => {
    const resultado = montarRomaneio(
      [
        comandaCentro,
        criarComanda({
          id: "cmd-1051",
          numero: "#1051",
          status: "EM_SEPARACAO",
        }),
      ],
      { motorista: "Marcos Vieira", veiculo: "ABC1D23" },
    );

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("O romaneio não deveria ter sido montado.");
    }

    expect(resultado.erros.join(" ")).toMatch(/#1051/);
    expect(resultado.erros.join(" ")).toMatch(/prontas/i);
  });

  it("exige motorista e veículo", () => {
    const resultado = montarRomaneio([comandaCentro], {
      motorista: "   ",
      veiculo: "",
    });

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("O romaneio não deveria ter sido montado.");
    }

    expect(resultado.erros.join(" ")).toMatch(/motorista/i);
    expect(resultado.erros.join(" ")).toMatch(/veículo|placa/i);
  });

  it("exige ao menos uma comanda selecionada", () => {
    const resultado = montarRomaneio([], {
      motorista: "Marcos Vieira",
      veiculo: "ABC1D23",
    });

    expect(resultado.ok).toBe(false);

    if (resultado.ok) {
      throw new Error("O romaneio não deveria ter sido montado.");
    }

    expect(resultado.erros.join(" ")).toMatch(/ao menos uma comanda/i);
  });
});
