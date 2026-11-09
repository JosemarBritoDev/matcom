import { afterEach, describe, expect, it } from "@jest/globals";

import {
  alternarFeatureFlag,
  type PlanoTenant,
} from "@/lib/permissions";
import {
  carregarTenantsMock,
  salvarTenantsMock,
} from "@/lib/tenant-admin-mock";
import {
  filtrarPorTenantAtivo,
  modoDemoAtivo,
  podeAdministrarSaas,
  podeAcessarTenant,
  resolverSessaoAtiva,
  ROTULO_MODO_DEMO,
  type SessaoAtiva,
} from "@/lib/session";

const DEMO_MODE_ORIGINAL = process.env.NEXT_PUBLIC_DEMO_MODE;
const NODE_ENV_ORIGINAL = process.env.NODE_ENV ?? "test";

/** `NODE_ENV` é tipado como readonly; os testes precisam simulá-lo. */
function definirNodeEnv(valor: string) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: valor,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  window.localStorage.clear();
  definirNodeEnv(NODE_ENV_ORIGINAL);

  if (DEMO_MODE_ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  } else {
    process.env.NEXT_PUBLIC_DEMO_MODE = DEMO_MODE_ORIGINAL;
  }
});

describe("Sessão e persistência local demonstrativa", () => {
  it("fornece sessão SUPER_ADMIN mock fora de produção", () => {
    const sessao = resolverSessaoAtiva();

    expect(sessao?.role).toBe("SUPER_ADMIN");
    expect(podeAdministrarSaas(sessao)).toBe(true);
  });

  it("nega a sessão mock e as permissões administrativas em produção", () => {
    const ambiente = jest.replaceProperty(
      process.env,
      "NODE_ENV",
      "production",
    );
    delete process.env.NEXT_PUBLIC_DEMO_MODE;

    try {
      expect(modoDemoAtivo()).toBe(false);
      expect(resolverSessaoAtiva()).toBeNull();
      expect(
        podeAdministrarSaas({
          userId: "dev-admin",
          tenantId: "tenant-1",
          name: "Mock",
          role: "SUPER_ADMIN",
          origem: "mock",
        }),
      ).toBe(false);
      expect(
        podeAcessarTenant(
          {
            userId: "dev-admin",
            tenantId: "tenant-1",
            name: "Mock",
            role: "SUPER_ADMIN",
            origem: "mock",
          },
          "tenant-1",
        ),
      ).toBe(false);
    } finally {
      ambiente.restore();
    }
  });

  it("libera a sessão mock em produção quando NEXT_PUBLIC_DEMO_MODE=true", () => {
    definirNodeEnv("production");
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";

    const sessao = resolverSessaoAtiva();

    expect(modoDemoAtivo()).toBe(true);
    expect(ROTULO_MODO_DEMO).toBe("[Modo Demo Vercel]");
    expect(sessao?.role).toBe("SUPER_ADMIN");
    expect(sessao?.origem).toBe("mock");
    expect(podeAdministrarSaas(sessao)).toBe(true);
    expect(podeAcessarTenant(sessao, "tenant-matcom")).toBe(true);
  });

  it("não libera a demonstração quando a flag tem valor diferente de true", () => {
    definirNodeEnv("production");
    process.env.NEXT_PUBLIC_DEMO_MODE = "1";

    expect(modoDemoAtivo()).toBe(false);
    expect(resolverSessaoAtiva()).toBeNull();
  });

  it("restringe leitura de tenant ao tenant ativo para usuários da loja", () => {
    const sessaoLoja: SessaoAtiva = {
      userId: "user-1",
      tenantId: "tenant-1",
      name: "Gerente",
      role: "GERENTE_LOJA",
      origem: "mock",
    };

    expect(podeAcessarTenant(sessaoLoja, "tenant-1")).toBe(true);
    expect(podeAcessarTenant(sessaoLoja, "tenant-2")).toBe(false);
    expect(
      filtrarPorTenantAtivo(sessaoLoja, [
        { tenantId: "tenant-1", id: "a" },
        { tenantId: "tenant-2", id: "b" },
      ]),
    ).toEqual([{ tenantId: "tenant-1", id: "a" }]);
  });

  it("bloqueia gerenciamento de tenants para papéis sem SUPER_ADMIN", () => {
    const sessao = resolverSessaoAtiva();

    expect(() => carregarTenantsMock({ ...sessao!, role: "GERENTE_LOJA" })).toThrow(
      /SUPER_ADMIN/i,
    );
  });

  it("persiste alterações de plano e feature flags no armazenamento do navegador", () => {
    const sessao = resolverSessaoAtiva();
    expect(sessao).not.toBeNull();

    const tenants = carregarTenantsMock(sessao);
    const matcom = tenants.find((tenant) => tenant.id === sessao?.tenantId);
    expect(matcom).toBeDefined();

    const tenantsAtualizados = tenants.map((tenant) =>
      tenant.id === sessao?.tenantId
        ? {
            ...tenant,
            plano: "ENTERPRISE" as PlanoTenant,
            featureFlags: alternarFeatureFlag(
              tenant.featureFlags,
              "emissaoFiscalSefaz",
            ),
          }
        : tenant,
    );

    salvarTenantsMock(sessao, tenantsAtualizados);
    expect(carregarTenantsMock(sessao).find((tenant) => tenant.id === matcom?.id))
      .toMatchObject({
        plano: "ENTERPRISE",
        featureFlags: { emissaoFiscalSefaz: true },
      });
  });
});
