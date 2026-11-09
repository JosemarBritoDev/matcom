/**
 * Mapa oficial de atalhos do MatCom.
 *
 * Mantido fora do hook para que Header, modal e testes compartilhem a mesma
 * fonte de verdade das rotas e combinações de teclas.
 */

export type ShortcutGroup = "Sistema" | "Navegação";

export type ShortcutAction = "open-help" | "toggle-help";

export interface ShortcutDefinition {
  id: string;
  /** Tecla principal, já normalizada (ex.: "F2" ou "K"). */
  key: string;
  /** Exige Ctrl (ou Cmd no macOS). */
  ctrl?: boolean;
  group: ShortcutGroup;
  label: string;
  description: string;
  /** Destino de navegação, quando aplicável. */
  href?: string;
  /** Ação interna, quando não há navegação. */
  action?: ShortcutAction;
  /** Falso para teclas exibidas no guia, mas sem função atribuída. */
  enabled?: boolean;
}

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    id: "command-palette",
    key: "K",
    ctrl: true,
    group: "Sistema",
    label: "Command Palette",
    description: "Alterna a visibilidade do Guia de Atalhos.",
    action: "toggle-help",
  },
  {
    id: "help",
    key: "F1",
    group: "Sistema",
    label: "Guia de Atalhos / Assistente BCTech",
    description: "Abre este painel de consulta rápida.",
    action: "open-help",
  },
  {
    id: "pdv",
    key: "F2",
    group: "Navegação",
    label: "PDV Balcão",
    description: "Abre a pré-venda e o atendimento de balcão.",
    href: "/vendas/pdv",
  },
  {
    id: "caixa",
    key: "F3",
    group: "Navegação",
    label: "Fila do Caixa",
    description: "Recebe comandas, registra pagamentos e sangrias.",
    href: "/caixa/fila",
  },
  {
    id: "clientes",
    key: "F4",
    group: "Navegação",
    label: "Clientes & Crediário",
    description: "Gerencia cadastro, limite e análise de crediário.",
    href: "/vendas/clientes",
  },
  {
    id: "livre-f5",
    key: "F5",
    group: "Navegação",
    label: "Tecla reservada",
    description: "Bloqueia a ação padrão do navegador; sem navegação.",
    enabled: false,
  },
  {
    id: "produtos",
    key: "F6",
    group: "Navegação",
    label: "Catálogo de Produtos & Galpão",
    description: "Consulta produtos, custos, estoque e expedição.",
    href: "/vendas/produtos",
  },
  {
    id: "livre-f7",
    key: "F7",
    group: "Navegação",
    label: "Tecla reservada",
    description: "Bloqueia a ação padrão do navegador; sem navegação.",
    enabled: false,
  },
  {
    id: "aprovacoes",
    key: "F8",
    group: "Navegação",
    label: "Painel de Aprovações do Gerente",
    description: "Aprova atacado, descontos, crediário e estornos.",
    href: "/gerencia/aprovacoes",
  },
  {
    id: "livre-f9",
    key: "F9",
    group: "Navegação",
    label: "Tecla reservada",
    description: "Bloqueia a ação padrão do navegador; sem navegação.",
    enabled: false,
  },
  {
    id: "financeiro",
    key: "F10",
    group: "Navegação",
    label: "Financeiro & DRE",
    description: "Abre contas consolidadas, fluxo e DRE gerencial.",
    href: "/financeiro/contas",
  },
];

/** Rotas navegáveis indexadas pela tecla, usadas pelo hook e pelos testes. */
export const SHORTCUT_ROUTES: Readonly<Record<string, string>> = Object.freeze(
  SHORTCUTS.reduce<Record<string, string>>((routes, shortcut) => {
    if (shortcut.enabled !== false && shortcut.href) {
      routes[shortcut.key] = shortcut.href;
    }

    return routes;
  }, {}),
);

export function isShortcutEnabled(shortcut: ShortcutDefinition): boolean {
  return shortcut.enabled !== false;
}

/**
 * Detecta se o foco está em um campo de digitação.
 * Atalhos de navegação são bloqueados nesses contextos para não atrapalhar
 * a digitação do operador.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toUpperCase();

  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null
  );
}

/** Representação visual das teclas (ex.: ["Ctrl", "K"] ou ["F2"]). */
export function getShortcutKeys(shortcut: ShortcutDefinition): string[] {
  return shortcut.ctrl
    ? ["Ctrl", shortcut.key.toUpperCase()]
    : [shortcut.key.toUpperCase()];
}

export function getShortcutsByGroup(
  group: ShortcutGroup,
): readonly ShortcutDefinition[] {
  return SHORTCUTS.filter((shortcut) => shortcut.group === group);
}