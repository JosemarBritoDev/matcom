export type PapelSessao =
  | "SUPER_ADMIN"
  | "GERENTE_LOJA"
  | "VENDEDOR"
  | "CAIXA"
  | "OPERADOR_CAIXA"
  | "ALMOXARIFE"
  | "LOGISTICA"
  | "FINANCEIRO"
  | "COMPRADOR"
  | "OPERACIONAL_VENDAS";

export interface SessaoAtiva {
  userId: string;
  tenantId: string;
  name: string;
  role: PapelSessao;
  origem: "mock";
}

const SESSAO_DESENVOLVIMENTO: SessaoAtiva = {
  userId: "dev-super-admin",
  tenantId: "tenant-matcom",
  name: "BCTech Dev",
  role: "SUPER_ADMIN",
  origem: "mock",
};

/** Retorna uma sessão mock somente fora de produção; produção falha fechada. */
export function resolverSessaoAtiva(): SessaoAtiva | null {
  return process.env.NODE_ENV === "production"
    ? null
    : SESSAO_DESENVOLVIMENTO;
}

export function podeAdministrarSaas(
  sessao: SessaoAtiva | null | undefined,
): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    !!sessao &&
    sessao.origem === "mock" &&
    sessao.role === "SUPER_ADMIN"
  );
}

export function podeAcessarTenant(
  sessao: SessaoAtiva | null | undefined,
  tenantId: string,
): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    !!sessao &&
    tenantId.length > 0 &&
    (sessao.role === "SUPER_ADMIN" || sessao.tenantId === tenantId)
  );
}

/** Escopa consultas operacionais ao tenant ativo, inclusive para SUPER_ADMIN. */
export function filtrarPorTenantAtivo<T extends { tenantId: string }>(
  sessao: SessaoAtiva | null | undefined,
  registros: ReadonlyArray<T>,
): T[] {
  if (
    !sessao ||
    !podeAcessarTenant(sessao, sessao.tenantId)
  ) {
    throw new Error("Uma sessão ativa é obrigatória para consultar dados.");
  }

  return registros.filter((registro) => registro.tenantId === sessao.tenantId);
}
