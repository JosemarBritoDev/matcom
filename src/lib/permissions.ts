/**
 * Serviço de permissões e modularidade do MatCom.
 *
 * O schema Prisma mantém as flags contratadas em `TenantModule`. Este módulo
 * traduz essas flags para o vocabulário das telas operacionais e permite que
 * módulos com nomes comerciais (ex.: `expedicao`) sejam mapeados para a flag
 * persistida correspondente (`logistica`).
 *
 * Nenhuma função acessa banco, Prisma ou React: o objetivo é ser determinístico
 * e reutilizável tanto em Server Components/Actions quanto no cliente.
 */

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

/** Flags de módulo persistidas no model `TenantModule` do Prisma. */
export const MODULOS_TENANT = [
  "vendas",
  "caixa",
  "compras",
  "logistica",
  "fiscal",
  "iaAssistant",
] as const;

export type ModuloTenant = (typeof MODULOS_TENANT)[number];

/**
 * Módulos que uma tela pode solicitar.
 *
 * `expedicao` é um alias comercial de `logistica`. `nfe` usa a flag avulsa
 * `emissaoFiscalSefaz`, mantendo compatibilidade com as colunas existentes.
 */
export type ModuloSolicitado = ModuloTenant | "expedicao" | "nfe";

/** Configuração de módulos de um tenant, com override opcional de expedição. */
export interface TenantModulesConfig {
  vendas?: boolean;
  caixa?: boolean;
  compras?: boolean;
  logistica?: boolean;
  fiscal?: boolean;
  iaAssistant?: boolean;
  /** Override explícito da expedição. Quando ausente, herda `logistica`. */
  expedicao?: boolean;
  /** Flag comercial de emissão NF-e/NFC-e no model TenantModule. */
  emissaoFiscalSefaz?: boolean;
}

export interface AcessoModulo {
  permitido: boolean;
  modulo: ModuloSolicitado;
  moduloPersistido: ModuloTenant;
  rotulo: string;
  /** Mensagem amigável quando o acesso é negado; `null` quando permitido. */
  motivo: string | null;
}

/* -------------------------------------------------------------------------- */
/*                              Configuração base                             */
/* -------------------------------------------------------------------------- */

/** Valores padrão espelham o schema Prisma (`fiscal` nasce desligado). */
export const MODULOS_PADRAO: Record<ModuloTenant, boolean> = {
  vendas: true,
  caixa: true,
  compras: true,
  logistica: true,
  fiscal: false,
  iaAssistant: true,
};

export const ROTULOS_MODULOS: Record<ModuloSolicitado, string> = {
  vendas: "Vendas",
  caixa: "Caixa",
  compras: "Compras",
  logistica: "Logística",
  fiscal: "Fiscal",
  iaAssistant: "Assistente IA",
  expedicao: "Expedição & Separação de Galpão",
  nfe: "Emissão Fiscal SEFAZ",
};

const MODULO_PERSISTIDO: Record<ModuloSolicitado, ModuloTenant> = {
  vendas: "vendas",
  caixa: "caixa",
  compras: "compras",
  logistica: "logistica",
  fiscal: "fiscal",
  iaAssistant: "iaAssistant",
  expedicao: "logistica",
  nfe: "fiscal",
};

/* -------------------------------------------------------------------------- */
/*                                  Consultas                                 */
/* -------------------------------------------------------------------------- */

/** Resolve o módulo comercial para a flag realmente persistida no tenant. */
export function resolverModuloPersistido(
  modulo: ModuloSolicitado,
): ModuloTenant {
  return MODULO_PERSISTIDO[modulo];
}

/**
 * Informa se um módulo está ativo para o tenant.
 *
 * Regras:
 * - sem configuração, vale o padrão do schema;
 * - `expedicao` usa `logistica` por compatibilidade;
 * - se o tenant possuir a chave explícita `expedicao`, ela prevalece sobre o
 *   alias, permitindo controle específico da operação de galpão.
 */
export function moduloAtivo(
  config: TenantModulesConfig | null | undefined,
  modulo: ModuloSolicitado,
): boolean {
  const moduloConfig = config ?? {};

  if (modulo === "expedicao" && typeof moduloConfig.expedicao === "boolean") {
    return moduloConfig.expedicao;
  }

  if (modulo === "nfe") {
    return (
      moduloConfig.emissaoFiscalSefaz ??
      moduloConfig.fiscal ??
      MODULOS_PADRAO.fiscal
    );
  }

  const persistido = resolverModuloPersistido(modulo);
  return moduloConfig[persistido] ?? MODULOS_PADRAO[persistido];
}

/** Monta a mensagem exibida na tela de módulo não contratado. */
export function mensagemModuloNaoContratado(modulo: ModuloSolicitado): string {
  const flag =
    modulo === "nfe" ? "emissaoFiscalSefaz" : resolverModuloPersistido(modulo);
  const alias =
    modulo === "expedicao" ? ' (ou o alias "expedicao" na configuração)' : "";

  return `O módulo ${ROTULOS_MODULOS[modulo]} não está contratado para este tenant. Ative a flag "${flag}"${alias} em TenantModule nas configurações da empresa para liberar o acesso.`;
}

/**
 * Resultado pronto para a tela: evita repetir a lógica de bloqueio em cada
 * página e mantém a mensagem padronizada.
 */
export function verificarAcessoModulo(
  config: TenantModulesConfig | null | undefined,
  modulo: ModuloSolicitado,
): AcessoModulo {
  const permitido = moduloAtivo(config, modulo);

  return {
    permitido,
    modulo,
    moduloPersistido: resolverModuloPersistido(modulo),
    rotulo: ROTULOS_MODULOS[modulo],
    motivo: permitido ? null : mensagemModuloNaoContratado(modulo),
  };
}

/** Lista os módulos ativos com seus respectivos rótulos comerciais. */
export function listarModulosAtivos(
  config: TenantModulesConfig | null | undefined,
): ModuloSolicitado[] {
  const modulos: ModuloSolicitado[] = [
    "vendas",
    "caixa",
    "compras",
    "logistica",
    "fiscal",
    "nfe",
    "iaAssistant",
    "expedicao",
  ];

  return modulos.filter((modulo) => moduloAtivo(config, modulo));
}

/* -------------------------------------------------------------------------- */
/*                        Planos SaaS e limite de usuários                    */
/* -------------------------------------------------------------------------- */

/** Planos comerciais do SaaS BCTech, do menor para o maior. */
export const PLANOS_TENANT = ["FREE", "START", "PRO", "ENTERPRISE"] as const;

export type PlanoTenant = (typeof PLANOS_TENANT)[number];

export interface DefinicaoPlano {
  id: PlanoTenant;
  nome: string;
  /** `null` representa usuários ilimitados no Enterprise. */
  limiteUsuarios: number | null;
  precoMensal: number;
  descricao: string;
  /** Plano sugerido em campanhas e no modal de upgrade. */
  padraoUpgrade?: boolean;
}

export const PLANOS: Record<PlanoTenant, DefinicaoPlano> = {
  FREE: {
    id: "FREE",
    nome: "Free",
    limiteUsuarios: 1,
    precoMensal: 0,
    descricao: "Operação essencial para começar, com 1 usuário.",
  },
  START: {
    id: "START",
    nome: "Start",
    limiteUsuarios: 3,
    precoMensal: 149.9,
    descricao: "Até 3 usuários e módulos essenciais para lojas em crescimento.",
  },
  PRO: {
    id: "PRO",
    nome: "Pro",
    limiteUsuarios: 10,
    precoMensal: 349.9,
    descricao: "Até 10 usuários, logística e fiscal para a operação completa.",
    padraoUpgrade: true,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    nome: "Enterprise",
    limiteUsuarios: null,
    precoMensal: 899.9,
    descricao: "Usuários ilimitados, SLA dedicado e módulos personalizados.",
  },
};

export const PLANOS_DISPONIVEIS: readonly DefinicaoPlano[] = PLANOS_TENANT.map(
  (plano) => PLANOS[plano],
);

export const LIMITE_USUARIOS_PLANO: Record<PlanoTenant, number | null> = {
  FREE: PLANOS.FREE.limiteUsuarios,
  START: PLANOS.START.limiteUsuarios,
  PRO: PLANOS.PRO.limiteUsuarios,
  ENTERPRISE: PLANOS.ENTERPRISE.limiteUsuarios,
};

/** Retorna o limite de usuários do plano (`null` = ilimitado). */
export function limiteUsuariosPlano(plano: PlanoTenant): number | null {
  return LIMITE_USUARIOS_PLANO[plano];
}

/** Texto amigável para exibir o limite na interface. */
export function formatarLimiteUsuarios(plano: PlanoTenant): string {
  const limite = limiteUsuariosPlano(plano);

  if (limite === null) {
    return "Ilimitado";
  }

  return `${limite} usuário${limite === 1 ? "" : "s"}`;
}

export interface ValidacaoLimiteUsuarios {
  permitido: boolean;
  plano: PlanoTenant;
  limite: number | null;
  usuariosAtuais: number;
  /** Quantos usuários ainda cabem no plano; `null` quando ilimitado. */
  restantes: number | null;
  /** Próximo plano capaz de acomodar o novo usuário. */
  planoSugerido: PlanoTenant | null;
  /** Mensagem amigável de upgrade; `null` quando permitido. */
  motivo: string | null;
}

/**
 * Indica o primeiro plano acima do atual capaz de acomodar a quantidade
 * necessária de usuários. Usado pelo modal de upgrade do Super Admin.
 */
export function proximoPlanoComLimite(
  planoAtual: PlanoTenant,
  usuariosNecessarios: number,
): PlanoTenant | null {
  const indiceAtual = PLANOS_TENANT.indexOf(planoAtual);
  const necessarios = Math.max(1, Math.ceil(usuariosNecessarios));

  for (const plano of PLANOS_TENANT.slice(indiceAtual + 1)) {
    const limite = limiteUsuariosPlano(plano);

    if (limite === null || limite >= necessarios) {
      return plano;
    }
  }

  return null;
}

/** Monta a mensagem do modal/trava de upgrade de plano. */
export function mensagemLimiteUsuarios(
  validacao: Omit<ValidacaoLimiteUsuarios, "motivo">,
): string {
  const plano = PLANOS[validacao.plano];
  const limite =
    validacao.limite === null
      ? "usuários ilimitados"
      : `${validacao.limite} usuário${validacao.limite === 1 ? "" : "s"}`;
  const sugestao = validacao.planoSugerido
    ? ` Faça upgrade para o plano ${PLANOS[validacao.planoSugerido].nome} para liberar mais acessos.`
    : " Fale com o time BCTech para criar uma condição personalizada.";

  return `O plano ${plano.nome} permite ${limite}.${sugestao}`;
}

/**
 * Trava de freemium aplicada ao cadastro de funcionários/atendentes.
 *
 * O plano FREE permite apenas 1 usuário. Ao tentar cadastrar o segundo, a
 * validação retorna `permitido: false` e o plano sugerido para o upgrade.
 */
export function podeAdicionarUsuario(
  plano: PlanoTenant,
  usuariosAtuais: number,
): ValidacaoLimiteUsuarios {
  const limite = limiteUsuariosPlano(plano);
  const atuais = Math.max(0, Math.floor(usuariosAtuais));
  const permitido = limite === null || atuais < limite;
  const restantes = limite === null ? null : Math.max(limite - atuais, 0);
  const planoSugerido = permitido
    ? null
    : proximoPlanoComLimite(plano, atuais + 1);
  const base = {
    permitido,
    plano,
    limite,
    usuariosAtuais: atuais,
    restantes,
    planoSugerido,
  };

  return {
    ...base,
    motivo: permitido ? null : mensagemLimiteUsuarios(base),
  };
}

/* -------------------------------------------------------------------------- */
/*                          Feature flags por tenant                          */
/* -------------------------------------------------------------------------- */

/** Módulos avulsos controlados pelo Painel Super Admin BCTech. */
export const FEATURE_FLAGS_TENANT = [
  "orcamentos",
  "expedicao",
  "comprasCurvaAbc",
  "emissaoFiscalSefaz",
] as const;

export type FeatureFlagTenant = (typeof FEATURE_FLAGS_TENANT)[number];

export type TenantFeatureFlags = Record<FeatureFlagTenant, boolean>;

export const FEATURE_FLAGS_PADRAO: TenantFeatureFlags = {
  orcamentos: true,
  expedicao: true,
  comprasCurvaAbc: true,
  emissaoFiscalSefaz: false,
};

export const ROTULOS_FEATURE_FLAGS: Record<FeatureFlagTenant, string> = {
  orcamentos: "Orçamentos",
  expedicao: "Expedição de Galpão",
  comprasCurvaAbc: "Compras Curva ABC",
  emissaoFiscalSefaz: "Emissão Fiscal SEFAZ",
};

export const DESCRICOES_FEATURE_FLAGS: Record<FeatureFlagTenant, string> = {
  orcamentos:
    "Propostas comerciais, aprovação de desconto e conversão em pedido.",
  expedicao:
    "Separação no galpão, checklist de materiais e romaneio de carga.",
  comprasCurvaAbc:
    "Sugestão inteligente de compra por Curva ABC e estoque mínimo.",
  emissaoFiscalSefaz:
    "Emissão de NF-e/NFC-e e transmissão fiscal para a SEFAZ.",
};

/** Módulo persistido equivalente a cada feature flag comercial. */
export const MODULO_PERSISTIDO_FEATURE: Record<
  FeatureFlagTenant,
  ModuloSolicitado
> = {
  orcamentos: "vendas",
  expedicao: "expedicao",
  comprasCurvaAbc: "compras",
  emissaoFiscalSefaz: "nfe",
};

/** Completa a configuração de flags com os padrões do SaaS. */
export function resolverFeatureFlags(
  flags: Partial<TenantFeatureFlags> | null | undefined,
): TenantFeatureFlags {
  return {
    orcamentos: flags?.orcamentos ?? FEATURE_FLAGS_PADRAO.orcamentos,
    expedicao: flags?.expedicao ?? FEATURE_FLAGS_PADRAO.expedicao,
    comprasCurvaAbc:
      flags?.comprasCurvaAbc ?? FEATURE_FLAGS_PADRAO.comprasCurvaAbc,
    emissaoFiscalSefaz:
      flags?.emissaoFiscalSefaz ?? FEATURE_FLAGS_PADRAO.emissaoFiscalSefaz,
  };
}

/** Consulta uma feature flag com fallback para o padrão do produto. */
export function featureAtiva(
  flags: Partial<TenantFeatureFlags> | null | undefined,
  feature: FeatureFlagTenant,
): boolean {
  return flags?.[feature] ?? FEATURE_FLAGS_PADRAO[feature];
}

/** Alterna uma feature flag sem mutar o objeto original. */
export function alternarFeatureFlag(
  flags: Partial<TenantFeatureFlags> | null | undefined,
  feature: FeatureFlagTenant,
): TenantFeatureFlags {
  const atuais = resolverFeatureFlags(flags);

  return {
    ...atuais,
    [feature]: !atuais[feature],
  };
}

export function contarFeatureFlagsAtivas(
  flags: Partial<TenantFeatureFlags> | null | undefined,
): number {
  return FEATURE_FLAGS_TENANT.filter((feature) => featureAtiva(flags, feature))
    .length;
}

/** Converte a matriz comercial em flags do `TenantModule` do Prisma. */
export function featureFlagsParaModulos(
  flags: Partial<TenantFeatureFlags> | null | undefined,
): TenantModulesConfig {
  const resolvidas = resolverFeatureFlags(flags);

  return {
    vendas: resolvidas.orcamentos,
    compras: resolvidas.comprasCurvaAbc,
    fiscal: resolvidas.emissaoFiscalSefaz,
    emissaoFiscalSefaz: resolvidas.emissaoFiscalSefaz,
    logistica: resolvidas.expedicao,
    expedicao: resolvidas.expedicao,
  };
}
