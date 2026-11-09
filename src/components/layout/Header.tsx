"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  ChevronDown,
  Factory,
  FileCheck,
  FileInput,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Keyboard,
  LogOut,
  Menu,
  Moon,
  Package,
  PackageSearch,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Sun,
  Tag,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  WalletCards,
  UserCog,
  Users,
  Wallet,
  Zap,
  X,
} from "lucide-react";

import { ShortcutsModal } from "@/components/modals/ShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  modoDemoAtivo,
  resolverSessaoAtiva,
  ROTULO_MODO_DEMO,
  type PapelSessao,
} from "@/lib/session";
import { carregarTenantMock } from "@/lib/tenant-admin-mock";
import type { PlanoTenant } from "@/lib/permissions";

export type EmployeeRole = PapelSessao;

export interface TenantBranding {
  name: string;
  logoUrl?: string | null;
  plan?: PlanoTenant;
}

export interface CurrentUser {
  name: string;
  role: EmployeeRole;
  email?: string | null;
  avatarUrl?: string | null;
}

interface HeaderProps {
  tenant?: TenantBranding;
  user?: CurrentUser;
}

interface MenuLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MenuGroup {
  label: string;
  icon: LucideIcon;
  items: MenuLink[];
  managerOnly?: boolean;
  superAdminOnly?: boolean;
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  SUPER_ADMIN: "Super Admin",
  GERENTE_LOJA: "Gerente da Loja",
  VENDEDOR: "Vendedor",
  CAIXA: "Caixa",
  OPERADOR_CAIXA: "Operador de Caixa",
  ALMOXARIFE: "Almoxarife",
  LOGISTICA: "Logística",
  FINANCEIRO: "Financeiro",
  COMPRADOR: "Comprador",
  OPERACIONAL_VENDAS: "Operacional de Vendas",
};

const QUICK_LINKS: Array<MenuLink & { roles: readonly EmployeeRole[] }> = [
  {
    label: "Super Admin",
    href: "/admin",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "PDV Balcão",
    href: "/vendas/pdv",
    icon: Store,
    roles: [
      "SUPER_ADMIN",
      "GERENTE_LOJA",
      "VENDEDOR",
      "CAIXA",
      "OPERADOR_CAIXA",
      "OPERACIONAL_VENDAS",
    ],
  },
  {
    label: "Expedição",
    href: "/logistica/expedicao",
    icon: Truck,
    roles: ["SUPER_ADMIN", "GERENTE_LOJA", "ALMOXARIFE", "LOGISTICA"],
  },
  {
    label: "Fiscal SEFAZ",
    href: "/fiscal/nfe",
    icon: FileText,
    roles: ["SUPER_ADMIN", "GERENTE_LOJA", "FINANCEIRO"],
  },
  {
    label: "Configurações",
    href: "/configuracoes/empresa",
    icon: Settings,
    roles: ["SUPER_ADMIN", "GERENTE_LOJA"],
  },
];

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Vendas",
    icon: ShoppingCart,
    items: [
      { label: "Pedidos de Venda", href: "/vendas/pedidos", icon: ShoppingCart },
      { label: "Orçamentos", href: "/vendas/orcamentos", icon: Receipt },
      { label: "Clientes", href: "/vendas/clientes", icon: Users },
      { label: "Produtos", href: "/vendas/produtos", icon: Package },
      {
        label: "Tabela de Preços",
        href: "/vendas/tabela-de-precos",
        icon: Tag,
      },
      { label: "Vendedores", href: "/vendas/vendedores", icon: UserCog },
      { label: "Expedição & Separação", href: "/logistica/expedicao", icon: Truck },
      { label: "Relatórios", href: "/vendas/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Compras",
    icon: Truck,
    items: [
      { label: "Pedidos de Compra", href: "/compras/pedidos", icon: Truck },
      {
        label: "Sugestão de Compra",
        href: "/compras/sugestao",
        icon: PackageSearch,
      },
      { label: "Fornecedores", href: "/fornecedores", icon: Factory },
      { label: "Entradas de NF-e", href: "/compras/nfe", icon: FileInput },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    items: [
      {
        label: "Contas a Receber",
        href: "/financeiro/contas-a-receber",
        icon: TrendingUp,
      },
      {
        label: "Contas a Pagar",
        href: "/financeiro/contas-a-pagar",
        icon: TrendingDown,
      },
      {
        label: "Fluxo de Caixa",
        href: "/financeiro/fluxo-de-caixa",
        icon: Banknote,
      },
      {
        label: "Contas Consolidadas",
        href: "/financeiro/contas",
        icon: WalletCards,
      },
    ],
  },
  {
    label: "Fiscal",
    icon: FileText,
    items: [
      {
        label: "Emissão NF-e/NFC-e",
        href: "/fiscal/emissao",
        icon: FileCheck,
      },
      {
        label: "Painel Fiscal SEFAZ",
        href: "/fiscal/nfe",
        icon: FileText,
      },
      { label: "Sped", href: "/fiscal/sped", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Aprovações",
    icon: ShieldCheck,
    managerOnly: true,
    items: [
      {
        label: "Central de Aprovações",
        href: "/gerencia/aprovacoes",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "BCTech",
    icon: ShieldCheck,
    superAdminOnly: true,
    items: [{ label: "Painel Super Admin", href: "/admin", icon: ShieldCheck }],
  },
];

const DEFAULT_TENANT: TenantBranding = {
  name: "MatCom Materiais",
  logoUrl: null,
};

const DEFAULT_USER: CurrentUser = {
  name: "Josemar Brito",
  role: "GERENTE_LOJA",
  email: "josemar@bctech.com.br",
  avatarUrl: null,
};

function isManagerRole(role: EmployeeRole) {
  return role === "GERENTE_LOJA" || role === "SUPER_ADMIN";
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className={`h-4 w-4 ${mounted ? "" : "opacity-0"}`} aria-hidden />
      )}
    </button>
  );
}

export function Header({
  tenant = DEFAULT_TENANT,
  user,
}: HeaderProps) {
  const sessao = resolverSessaoAtiva();
  const demoAtivo = modoDemoAtivo();
  const usuario =
    user ??
    (sessao
      ? {
          name: sessao.name,
          role: "SUPER_ADMIN" as const,
          email: null,
          avatarUrl: null,
        }
      : DEFAULT_USER);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [planoTenant, setPlanoTenant] = useState<PlanoTenant | null>(
    tenant.plan ?? null,
  );
  const [erroPlano, setErroPlano] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { isHelpOpen, openHelp, closeHelp } = useKeyboardShortcuts();

  const isManager = isManagerRole(usuario.role);
  const quickLinks = QUICK_LINKS.filter((link) =>
    link.roles.includes(usuario.role),
  );
  const visibleGroups = [
    ...(quickLinks.length > 0
      ? [
          {
            label: "Atalhos rápidos",
            icon: Zap,
            items: quickLinks,
          },
        ]
      : []),
    ...MENU_GROUPS.filter(
      (group) =>
        (!group.managerOnly || isManager) &&
        (!group.superAdminOnly || usuario.role === "SUPER_ADMIN"),
    ),
  ];

  useEffect(() => {
    if (tenant.plan) {
      setPlanoTenant(tenant.plan);
      setErroPlano(null);
      return;
    }

    if (!sessao) {
      setPlanoTenant(null);
      return;
    }

    function atualizarPlano() {
      if (!sessao) {
        setPlanoTenant(null);
        return;
      }

      try {
        setPlanoTenant(
          carregarTenantMock(sessao, sessao.tenantId)?.plano ?? null,
        );
        setErroPlano(null);
      } catch (error) {
        setPlanoTenant(null);
        setErroPlano(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o plano do tenant.",
        );
      }
    }

    atualizarPlano();
    window.addEventListener("matcom:tenants-updated", atualizarPlano);
    return () =>
      window.removeEventListener("matcom:tenants-updated", atualizarPlano);
  }, [sessao, tenant.plan]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setOpenGroup(null);
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenGroup(null);
        setProfileOpen(false);
        setMobileOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function closeAll() {
    setOpenGroup(null);
    setProfileOpen(false);
    setMobileOpen(false);
    setMobileGroup(null);
  }

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 print:hidden dark:border-zinc-800 dark:bg-zinc-950/90 dark:supports-[backdrop-filter]:bg-zinc-950/75"
      >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Marca White-Label */}
        <Link
          href="/"
          onClick={closeAll}
          className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={`Logotipo de ${tenant.name}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <Store className="h-5 w-5" aria-hidden />
            )}
          </span>

          <span className="flex flex-col leading-tight">
            <span className="max-w-[10rem] truncate text-sm font-bold tracking-tight text-zinc-900 sm:max-w-[14rem] sm:text-base dark:text-zinc-50">
              {tenant.name}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1">
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                MatCom SaaS
              </span>
              {planoTenant && (
                <span className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
                  Plano {planoTenant}
                </span>
              )}
              {demoAtivo && (
                <span
                  title="Demonstração com dados simulados. Nenhuma operação afeta dados reais."
                  className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  <FlaskConical className="h-3 w-3" aria-hidden />
                  {ROTULO_MODO_DEMO}
                </span>
              )}
              {erroPlano && (
                <span
                  title={erroPlano}
                  className="inline-flex w-fit items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                >
                  Plano indisponível
                </span>
              )}
            </span>
          </span>
        </Link>

        {/* Navegação desktop */}
        <nav
          aria-label="Navegação principal"
          className="hidden flex-1 items-center justify-center gap-1 lg:flex"
        >
          {visibleGroups.map((group) => {
            const Icon = group.icon;
            const isOpen = openGroup === group.label;

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setOpenGroup(isOpen ? null : group.label);
                    setProfileOpen(false);
                  }}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                    isOpen
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {group.label}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                  {group.managerOnly && (
                    <span
                      className="ml-0.5 h-1.5 w-1.5 rounded-full bg-fuchsia-500"
                      aria-label="Restrito ao gerente"
                    />
                  )}
                </button>

                {isOpen && (
                  <div
                    role="menu"
                    aria-label={group.label}
                    className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40"
                  >
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={closeAll}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:text-zinc-300 dark:hover:bg-violet-950/60 dark:hover:text-violet-300"
                        >
                          <ItemIcon
                            className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400"
                            aria-hidden
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Ações à direita */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={openHelp}
            aria-label="Abrir guia de atalhos (F1)"
            title="Guia de atalhos (F1)"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <Keyboard className="h-4 w-4" aria-hidden />
          </button>

          <ThemeToggle />

          {/* Perfil do usuário */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((open) => !open);
                setOpenGroup(null);
              }}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-left transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              {usuario.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={usuario.avatarUrl}
                  alt={`Foto de ${usuario.name}`}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  {getInitials(usuario.name)}
                </span>
              )}
              <span className="hidden max-w-[9rem] flex-col leading-tight xl:flex">
                <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  {usuario.name}
                </span>
                <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                  {ROLE_LABELS[usuario.role]}
                </span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
                  profileOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            {profileOpen && (
              <div
                role="menu"
                aria-label="Menu do usuário"
                className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40"
              >
                <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {usuario.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {usuario.email ?? ROLE_LABELS[usuario.role]}
                  </p>
                </div>
                <Link
                  href="/perfil"
                  role="menuitem"
                  onClick={closeAll}
                  className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:text-zinc-300 dark:hover:bg-violet-950/60 dark:hover:text-violet-300"
                >
                  <User className="h-4 w-4" aria-hidden />
                  Meu perfil
                </Link>
                {isManager && (
                  <Link
                    href="/configuracoes/empresa"
                    role="menuitem"
                    onClick={closeAll}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:text-zinc-300 dark:hover:bg-violet-950/60 dark:hover:text-violet-300"
                  >
                    <Settings className="h-4 w-4" aria-hidden />
                    Configurações
                  </Link>
                )}
                <Link
                  href="/login"
                  role="menuitem"
                  onClick={closeAll}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sair
                </Link>
              </div>
            )}
          </div>

          {/* Botão do menu mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 lg:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Navegação mobile */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-zinc-200 bg-white px-4 pb-6 pt-2 lg:hidden dark:border-zinc-800 dark:bg-zinc-950"
        >
          <nav aria-label="Navegação principal mobile" className="flex flex-col">
            {visibleGroups.map((group) => {
              const Icon = group.icon;
              const isOpen = mobileGroup === group.label;

              return (
                <div
                  key={group.label}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/60"
                >
                  <button
                    type="button"
                    onClick={() => setMobileGroup(isOpen ? null : group.label)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-2 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden />
                      {group.label}
                      {group.managerOnly && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300">
                          <ShieldCheck className="h-3 w-3" aria-hidden />
                          Gerente
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>

                  {isOpen && (
                    <div className="mb-2 flex flex-col gap-0.5 pl-6">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeAll}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:text-zinc-400 dark:hover:bg-violet-950/60 dark:hover:text-violet-300"
                          >
                            <ItemIcon
                              className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400"
                              aria-hidden
                            />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Perfil mobile */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            {usuario.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={usuario.avatarUrl}
                alt={`Foto de ${usuario.name}`}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                {getInitials(usuario.name)}
              </span>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {usuario.name}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {ROLE_LABELS[usuario.role]}
              </p>
            </div>
            <Link
              href="/login"
              onClick={closeAll}
              aria-label="Sair"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}
      </header>

      <ShortcutsModal open={isHelpOpen} onClose={closeHelp} />
    </>
  );
}
