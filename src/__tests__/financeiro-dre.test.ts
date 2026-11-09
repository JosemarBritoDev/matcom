import { describe, expect, it } from "@jest/globals";

import {
  obterDemonstrativoDre,
  podeAcessarDre,
} from "@/lib/financeiro-dre";
import { calcularDre } from "@/lib/regras-negocio";

describe("DRE gerencial", () => {
  it("calcula margem bruta e resultado operacional", () => {
    expect(
      calcularDre({
        faturamentoBruto: 100_000,
        cogs: 65_000,
        despesasOperacionais: 20_000,
      }),
    ).toEqual({
      lucroBruto: 35_000,
      lucroOperacional: 15_000,
      margemBrutaPercent: 35,
      margemOperacionalPercent: 15,
    });
  });

  it("agrupa valores demonstrativos do mês e do trimestre selecionados", () => {
    const demonstrativo = obterDemonstrativoDre("tenant-matcom", "2026-04");

    expect(demonstrativo?.mensal.periodo).toBe("abril de 2026");
    expect(demonstrativo?.mensal.faturamentoBruto).toBe(128450.8);
    expect(demonstrativo?.trimestre.periodo).toBe("T2 2026");
    expect(demonstrativo?.trimestre.faturamentoBruto).toBe(385150.8);
    expect(
      Object.values(demonstrativo?.mensal.pagamentos ?? {}).reduce(
        (total, valor) => total + valor,
        0,
      ),
    ).toBe(demonstrativo?.mensal.faturamentoBruto);
  });

  it("não expõe os dados demonstrativos para outro tenant", () => {
    expect(obterDemonstrativoDre("tenant-outro", "2026-04")).toBeNull();
    expect(() => obterDemonstrativoDre("", "2026-04")).toThrow(/tenant/i);
    expect(() =>
      obterDemonstrativoDre("tenant-matcom", "2026-13"),
    ).toThrow(/AAAA-MM/i);
  });
});

describe("Permissões da rota financeira", () => {
  it.each(["FINANCEIRO", "GERENTE_LOJA", "SUPER_ADMIN"] as const)(
    "permite o perfil %s",
    (papel) => {
      expect(podeAcessarDre(papel)).toBe(true);
    },
  );

  it.each(["VENDEDOR", "CAIXA", "ALMOXARIFE", "COMPRADOR"] as const)(
    "nega o perfil %s",
    (papel) => {
      expect(podeAcessarDre(papel)).toBe(false);
    },
  );

  it("nega acesso quando não há perfil ativo", () => {
    expect(podeAcessarDre(null)).toBe(false);
    expect(podeAcessarDre(undefined)).toBe(false);
  });
});
