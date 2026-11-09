import { describe, expect, it } from "@jest/globals";

import {
  alternarFeatureFlag,
  FEATURE_FLAGS_PADRAO,
  FEATURE_FLAGS_TENANT,
  podeAdicionarUsuario,
} from "@/lib/permissions";
import { obterUrlImagemProduto } from "@/lib/product-images";

describe("Limite freemium de usuários por tenant", () => {
  it("bloqueia o segundo usuário no plano FREE e sugere START", () => {
    const resultado = podeAdicionarUsuario("FREE", 1);

    expect(resultado.permitido).toBe(false);
    expect(resultado.limite).toBe(1);
    expect(resultado.planoSugerido).toBe("START");
  });

  it("permite até 3 usuários no START", () => {
    expect(podeAdicionarUsuario("START", 2).permitido).toBe(true);

    const resultado = podeAdicionarUsuario("START", 3);
    expect(resultado.permitido).toBe(false);
    expect(resultado.limite).toBe(3);
  });

  it("permite até 10 usuários no PRO", () => {
    expect(podeAdicionarUsuario("PRO", 9).permitido).toBe(true);

    const resultado = podeAdicionarUsuario("PRO", 10);
    expect(resultado.permitido).toBe(false);
    expect(resultado.limite).toBe(10);
  });

  it("não limita usuários no ENTERPRISE", () => {
    const resultado = podeAdicionarUsuario("ENTERPRISE", 10000);

    expect(resultado.permitido).toBe(true);
    expect(resultado.limite).toBeNull();
    expect(resultado.restantes).toBeNull();
  });
});

describe("Feature flags do tenant", () => {
  it.each(FEATURE_FLAGS_TENANT)(
    "alterna a flag %s sem alterar a configuração original",
    (feature) => {
      const flagsOriginais = { ...FEATURE_FLAGS_PADRAO };
      const resultado = alternarFeatureFlag(FEATURE_FLAGS_PADRAO, feature);

      expect(resultado[feature]).toBe(!FEATURE_FLAGS_PADRAO[feature]);
      expect(FEATURE_FLAGS_PADRAO).toEqual(flagsOriginais);
      expect(resultado).not.toBe(FEATURE_FLAGS_PADRAO);
    },
  );
});

describe("Resolução segura de imagem do produto", () => {
  it("aceita o nome de campo do Prisma e o nome usado pelo frontend", () => {
    expect(obterUrlImagemProduto({ imageUrl: "/uploads/cimento.webp" })).toBe(
      "/uploads/cimento.webp",
    );
    expect(obterUrlImagemProduto({ imagemUrl: "/uploads/areia.webp" })).toBe(
      "/uploads/areia.webp",
    );
  });

  it("ignora URL insegura e usa thumbnail local por descrição", () => {
    expect(
      obterUrlImagemProduto({
        imageUrl: "javascript:alert(1)",
        descricao: "Cimento CP II",
      }),
    ).toBe("/products/cimento.svg");
  });
});
