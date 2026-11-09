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

/** Rótulo exibido no Header quando a demonstração está habilitada. */
export const ROTULO_MODO_DEMO = "[Modo Demo Vercel]";

const SESSAO_DESENVOLVIMENTO: SessaoAtiva = {
  userId: "dev-super-admin",
  tenantId: "tenant-matcom",
  name: "BCTech Dev",
  role: "SUPER_ADMIN",
  origem: "mock",
};

/**
 * Indica se o modo de demonstração/QA está habilitado.
 *
 * A flag `NEXT_PUBLIC_DEMO_MODE` é lida no servidor e no cliente (o prefixo
 * `NEXT_PUBLIC_` é inlinado pelo Next.js no bundle). Ela existe para permitir
 * validar a navegação e os dados simulados em Preview/Produção na Vercel sem
 * liberar a sessão mock em ambientes reais por acidente.
 */
export function modoDemoAtivo(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/**
 * A sessão mock é permitida em desenvolvimento e, em produção, apenas quando
 * o modo demo estiver explicitamente ativado. Sem a flag, o sistema continua
 * falhando fechado.
 */
function sessaoMockPermitida(): boolean {
  return process.env.NODE_ENV !== "production" || modoDemoAtivo();
}

/**
 * Retorna a sessão mock quando o ambiente permite demonstração.
 * Fora de desenvolvimento, exige `NEXT_PUBLIC_DEMO_MODE=true`.
 */
export function resolverSessaoAtiva(): SessaoAtiva | null {
  return sessaoMockPermitida() ? SESSAO_DESENVOLVIMENTO : null;
}

export function podeAdministrarSaas(
  sessao: SessaoAtiva | null | undefined,
): boolean {
  return (
    sessaoMockPermitida() &&
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
    sessaoMockPermitida() &&
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
