import {
  FEATURE_FLAGS_PADRAO,
  FEATURE_FLAGS_TENANT,
  PLANOS_TENANT,
  type PlanoTenant,
  type TenantFeatureFlags,
} from "@/lib/permissions";
import {
  podeAcessarTenant,
  podeAdministrarSaas,
  type SessaoAtiva,
} from "@/lib/session";

export type StatusTenantMock = "ATIVO" | "SUSPENSO";

export interface TenantAdministradoMock {
  id: string;
  nome: string;
  cnpj: string;
  plano: PlanoTenant;
  status: StatusTenantMock;
  featureFlags: TenantFeatureFlags;
}

export const TENANTS_DEMONSTRACAO: TenantAdministradoMock[] = [
  {
    id: "tenant-matcom",
    nome: "MatCom Materiais",
    cnpj: "12.345.678/0001-90",
    plano: "PRO",
    status: "ATIVO",
    featureFlags: { ...FEATURE_FLAGS_PADRAO },
  },
  {
    id: "tenant-casa-nova",
    nome: "Casa Nova Construções",
    cnpj: "45.678.901/0001-23",
    plano: "START",
    status: "ATIVO",
    featureFlags: {
      ...FEATURE_FLAGS_PADRAO,
      emissaoFiscalSefaz: false,
    },
  },
  {
    id: "tenant-deposito-central",
    nome: "Depósito Central",
    cnpj: "98.765.432/0001-10",
    plano: "FREE",
    status: "SUSPENSO",
    featureFlags: {
      ...FEATURE_FLAGS_PADRAO,
      expedicao: false,
      emissaoFiscalSefaz: false,
    },
  },
];

const STORAGE_KEY = "matcom:tenants-mock:v1";

function clonarTenants(tenants: TenantAdministradoMock[]) {
  return tenants.map((tenant) => ({
    ...tenant,
    featureFlags: { ...tenant.featureFlags },
  }));
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function ehPlano(valor: unknown): valor is PlanoTenant {
  return PLANOS_TENANT.some((plano) => plano === valor);
}

function ehTenantMock(valor: unknown): valor is TenantAdministradoMock {
  if (!ehObjeto(valor) || !ehObjeto(valor.featureFlags)) {
    return false;
  }

  const flags = valor.featureFlags;
  return (
    typeof valor.id === "string" &&
    typeof valor.nome === "string" &&
    typeof valor.cnpj === "string" &&
    ehPlano(valor.plano) &&
    (valor.status === "ATIVO" || valor.status === "SUSPENSO") &&
    FEATURE_FLAGS_TENANT.every((flag) => typeof flags[flag] === "boolean")
  );
}

function validarListaTenants(valor: unknown): TenantAdministradoMock[] {
  if (!Array.isArray(valor) || !valor.every(ehTenantMock)) {
    throw new Error("Os dados mock de tenants estão inválidos.");
  }

  const ids = valor.map((tenant) => tenant.id);
  const cnpjs = valor.map((tenant) => tenant.cnpj);

  if (new Set(ids).size !== ids.length || new Set(cnpjs).size !== cnpjs.length) {
    throw new Error("Cada tenant precisa ter ID e CNPJ exclusivos.");
  }

  return valor;
}

function lerTenantsArmazenados(): TenantAdministradoMock[] {
  if (typeof window === "undefined") {
    return clonarTenants(TENANTS_DEMONSTRACAO);
  }

  const bruto = window.localStorage.getItem(STORAGE_KEY);

  if (bruto === null) {
    return clonarTenants(TENANTS_DEMONSTRACAO);
  }

  let dados: unknown;

  try {
    dados = JSON.parse(bruto);
  } catch {
    throw new Error("Os dados mock de tenants não contêm JSON válido.");
  }

  return clonarTenants(validarListaTenants(dados));
}

export function carregarTenantsMock(
  sessao: SessaoAtiva | null | undefined,
): TenantAdministradoMock[] {
  if (!podeAdministrarSaas(sessao)) {
    throw new Error("Apenas SUPER_ADMIN pode listar tenants.");
  }

  return lerTenantsArmazenados();
}

export function carregarTenantMock(
  sessao: SessaoAtiva | null | undefined,
  tenantId: string,
): TenantAdministradoMock | null {
  if (!podeAcessarTenant(sessao, tenantId)) {
    throw new Error("A sessão ativa não pode acessar este tenant.");
  }

  const tenants = lerTenantsArmazenados();
  const tenant = tenants.find((item) => item.id === tenantId);
  return tenant ?? null;
}

export function salvarTenantsMock(
  sessao: SessaoAtiva | null | undefined,
  tenants: TenantAdministradoMock[],
): void {
  if (!podeAdministrarSaas(sessao)) {
    throw new Error("Apenas SUPER_ADMIN pode alterar tenants.");
  }

  const validos = validarListaTenants(tenants);

  if (typeof window === "undefined") {
    throw new Error("A persistência mock só está disponível no navegador.");
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validos));
  window.dispatchEvent(new Event("matcom:tenants-updated"));
}
