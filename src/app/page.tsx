"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileInput,
  Lightbulb,
  PackageSearch,
  Plus,
  ScanBarcode,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  UserPlus,
  Wallet,
  XCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

type TrendDirection = "up" | "down";
type TrendTone = "positive" | "negative" | "warning";
type OrderStatus = "AGUARDANDO_CAIXA" | "PAGO" | "CANCELADO";
type PricingTier = "VAREJO" | "ATACADO";

interface KpiCardData {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  iconClassName: string;
  variation: string;
  variationLabel: string;
  trend: TrendDirection;
  tone: TrendTone;
  alert?: string;
  cta?: { label: string; href: string };
  highlighted?: boolean;
}

interface ProductSuggestion {
  id: string;
  name: string;
  ean: string;
  unit: string;
  price: number;
  yieldInfo: string;
  crossSell: string[];
}

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  iconClassName: string;
}

interface RecentSale {
  code: number;
  customer: string;
  seller: string;
  tier: PricingTier;
  status: OrderStatus;
  total: number;
  time: string;
}

/* -------------------------------------------------------------------------- */
/*                                    Dados                                   */
/* -------------------------------------------------------------------------- */

const TENANT = {
  name: "MatCom Materiais",
  welcomeMessage:
    "Bem-vindo ao sistema da sua loja de materiais de construção.",
};

const KPIS: KpiCardData[] = [
  {
    id: "sales",
    label: "Vendas Hoje",
    value: "R$ 18.450,00",
    detail: "42 comandas geradas no balcão",
    icon: ShoppingCart,
    iconClassName:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    variation: "+12,4%",
    variationLabel: "vs. ontem",
    trend: "up",
    tone: "positive",
  },
  {
    id: "purchases",
    label: "Compras do Mês",
    value: "R$ 96.320,00",
    detail: "18 pedidos de fornecedores · 7 entradas de NF-e",
    icon: Truck,
    iconClassName:
      "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
    variation: "+4,8%",
    variationLabel: "vs. mês anterior",
    trend: "up",
    tone: "positive",
  },
  {
    id: "finance",
    label: "Contas a Receber / Pagar",
    value: "R$ 14.630,00",
    detail: "A receber R$ 42.780,00 · A pagar R$ 28.150,00",
    icon: Wallet,
    iconClassName:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
    variation: "+6,1%",
    variationLabel: "saldo líquido vs. mês anterior",
    trend: "up",
    tone: "warning",
    alert: "5 títulos vencem hoje · 2 títulos em atraso",
  },
  {
    id: "approvals",
    label: "Preços Pendentes de Aprovação",
    value: "7",
    detail: "solicitações de tabela de Atacado aguardando análise",
    icon: ShieldCheck,
    iconClassName:
      "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
    variation: "+42,9%",
    variationLabel: "vs. semana anterior",
    trend: "up",
    tone: "warning",
    highlighted: true,
    cta: {
      label: "Revisar aprovações",
      href: "/aprovacoes/tabelas-atacado",
    },
  },
];

const PRODUCTS: ProductSuggestion[] = [
  {
    id: "cimento-cpii",
    name: "Cimento CP II 50 kg",
    ean: "7891234500011",
    unit: "saco",
    price: 38.9,
    yieldInfo:
      "1 saco de 50 kg rende aproximadamente 0,35 m³ de concreto, considerando traço 1:2:3.",
    crossSell: [
      "Areia média lavada (m³)",
      "Brita 1 (m³)",
      "Aditivo impermeabilizante",
    ],
  },
  {
    id: "areia-media",
    name: "Areia média lavada",
    ean: "7891234500028",
    unit: "m³",
    price: 129.9,
    yieldInfo:
      "1 m³ de areia cobre cerca de 10 m² de contrapiso com espessura de 10 cm.",
    crossSell: [
      "Cimento CP II 50 kg",
      "Bloco de concreto 14x19x39",
      "Tela soldada Q-138",
    ],
  },
  {
    id: "bloco-concreto",
    name: "Bloco de concreto 14x19x39",
    ean: "7891234500035",
    unit: "unidade",
    price: 2.75,
    yieldInfo:
      "1 m² de parede consome aproximadamente 12,5 blocos, já descontando a argamassa.",
    crossSell: [
      "Cimento CP II 50 kg",
      "Argamassa de assentamento",
      "Escantilhão de alumínio",
    ],
  },
  {
    id: "tinta-acrilica",
    name: "Tinta acrílica premium 18 L",
    ean: "7891234500042",
    unit: "lata",
    price: 289.9,
    yieldInfo:
      "Rende até 180 m² por demão em superfície preparada. Considere 2 demãos para acabamento.",
    crossSell: [
      "Massa corrida acrílica",
      "Rolo de lã 23 cm",
      "Fita crepe 48 mm",
    ],
  },
  {
    id: "porcelanato-80",
    name: "Porcelanato acetinado 80x80 cm",
    ean: "7891234500059",
    unit: "caixa",
    price: 159.9,
    yieldInfo:
      "Cada caixa cobre 1,92 m². Recomenda-se comprar 5% a mais para perdas de corte.",
    crossSell: [
      "Argamassa AC-III",
      "Rejunte flexível",
      "Nivelador de piso",
    ],
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Nova Venda Balcão",
    description: "Iniciar comanda",
    href: "/vendas/pedidos/novo",
    icon: ShoppingCart,
    iconClassName:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  },
  {
    label: "Fila do Caixa",
    description: "Receber pagamentos",
    href: "/caixa/fila",
    icon: Wallet,
    iconClassName:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  },
  {
    label: "Entrada de NF-e",
    description: "Conferir compras",
    href: "/compras/entradas-nfe",
    icon: FileInput,
    iconClassName:
      "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
  },
  {
    label: "Romaneio de Carga",
    description: "Separar entregas",
    href: "/logistica/romaneio",
    icon: Truck,
    iconClassName:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
  },
  {
    label: "Novo Cliente",
    description: "Cadastrar cliente",
    href: "/clientes/novo",
    icon: UserPlus,
    iconClassName:
      "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
  },
];

const RECENT_SALES: RecentSale[] = [
  {
    code: 1048,
    customer: "Construtora Horizonte Ltda.",
    seller: "Ana Paula",
    tier: "ATACADO",
    status: "AGUARDANDO_CAIXA",
    total: 4280.5,
    time: "10:42",
  },
  {
    code: 1047,
    customer: "Carlos Eduardo Martins",
    seller: "Rafael Souza",
    tier: "VAREJO",
    status: "PAGO",
    total: 389.9,
    time: "10:28",
  },
  {
    code: 1046,
    customer: "Reforma Fácil Materiais",
    seller: "Ana Paula",
    tier: "ATACADO",
    status: "PAGO",
    total: 7635.0,
    time: "10:05",
  },
  {
    code: 1045,
    customer: "Maria Aparecida Silva",
    seller: "Juliana Costa",
    tier: "VAREJO",
    status: "CANCELADO",
    total: 1245.7,
    time: "09:51",
  },
  {
    code: 1044,
    customer: "José Antônio Ferreira",
    seller: "Rafael Souza",
    tier: "VAREJO",
    status: "AGUARDANDO_CAIXA",
    total: 892.35,
    time: "09:37",
  },
  {
    code: 1043,
    customer: "Obra Nova Engenharia",
    seller: "Juliana Costa",
    tier: "ATACADO",
    status: "PAGO",
    total: 12480.0,
    time: "09:12",
  },
];

/* -------------------------------------------------------------------------- */
/*                              Configurações de UI                           */
/* -------------------------------------------------------------------------- */

const TONE_CLASSES: Record<TrendTone, string> = {
  positive:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  negative: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
};

const STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  AGUARDANDO_CAIXA: {
    label: "Aguardando Caixa",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    icon: Clock,
  },
  PAGO: {
    label: "Pago",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  CANCELADO: {
    label: "Cancelado",
    className: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    icon: XCircle,
  },
};

const TIER_CLASSES: Record<PricingTier, string> = {
  VAREJO:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  ATACADO:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
};

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBRL(value: number) {
  return brlFormatter.format(value);
}

/* -------------------------------------------------------------------------- */
/*                              Componentes auxiliares                        */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: PricingTier }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${TIER_CLASSES[tier]}`}
    >
      {tier === "ATACADO" ? "Atacado" : "Varejo"}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Página                                   */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [today, setToday] = useState("");
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    setToday(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const matchedProducts = useMemo(() => {
    if (!normalizedQuery) {
      return PRODUCTS.slice(0, 3);
    }

    return PRODUCTS.filter(
      (product) =>
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.ean.includes(normalizedQuery) ||
        product.id.includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  const activeProduct =
    PRODUCTS.find((product) => product.id === selectedProductId) ??
    matchedProducts[0] ??
    PRODUCTS[0];

  const hasNoResults =
    normalizedQuery.length > 0 && matchedProducts.length === 0;

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:py-8">
        {/* Banner de boas-vindas white-label */}
        <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-violet-50 p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/40">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-200/50 blur-3xl dark:bg-violet-700/20"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-fuchsia-200/40 blur-3xl dark:bg-fuchsia-700/10"
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Sistema operacional
              </span>

              <h1 className="mt-3 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                <Store
                  className="h-6 w-6 text-violet-600 dark:text-violet-400"
                  aria-hidden
                />
                Bem-vindo à{" "}
                <span className="text-violet-700 dark:text-violet-300">
                  {TENANT.name}
                </span>
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                {TENANT.welcomeMessage}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                <CalendarDays className="h-5 w-5" aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Hoje
                </p>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {today || "Carregando data..."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section aria-labelledby="kpis-title">
          <h2 id="kpis-title" className="sr-only">
            Indicadores principais
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KPIS.map((kpi) => {
              const Icon = kpi.icon;
              const TrendIcon =
                kpi.trend === "up" ? TrendingUp : TrendingDown;

              return (
                <article
                  key={kpi.id}
                  className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900 ${
                    kpi.highlighted
                      ? "border-violet-300 dark:border-violet-800"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.iconClassName}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[kpi.tone]}`}
                    >
                      <TrendIcon className="h-3.5 w-3.5" aria-hidden />
                      {kpi.variation}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {kpi.detail}
                  </p>

                  {kpi.alert && (
                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                      <AlertCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      {kpi.alert}
                    </p>
                  )}

                  <div className="mt-auto flex flex-col gap-2 pt-4">
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {kpi.variationLabel}
                    </p>

                    {kpi.cta && (
                      <Link
                        href={kpi.cta.href}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
                      >
                        {kpi.cta.label}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Assistente de IA */}
        <section
          aria-labelledby="ai-title"
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-col gap-3 border-b border-zinc-200 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:from-violet-950/40 dark:via-fuchsia-950/20 dark:to-zinc-900">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="ai-title"
                    className="text-base font-bold tracking-tight"
                  >
                    Assistente de IA para Balcão
                  </h2>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                    Beta
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Consulte EAN, código de barras ou nome do produto para obter
                  venda cruzada e rendimento.
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-violet-200 bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-violet-700 dark:border-violet-800 dark:bg-zinc-900/60 dark:text-violet-300">
              <ScanBarcode className="h-3.5 w-3.5" aria-hidden />
              Leitura rápida no balcão
            </span>
          </div>

          <div className="p-5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedProductId(null);
                }}
                placeholder="Buscar por EAN, código de barras ou nome do produto..."
                aria-label="Buscar produto por EAN, código de barras ou nome"
                className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
              <ScanBarcode
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
            </div>

            {hasNoResults ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
                <PackageSearch
                  className="h-8 w-8 text-zinc-400"
                  aria-hidden
                />
                <p className="text-sm font-semibold">
                  Nenhum produto encontrado
                </p>
                <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                  Tente outro nome, EAN ou código de barras. O assistente
                  consulta o catálogo real da loja.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSelectedProductId(null);
                  }}
                  className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {normalizedQuery
                      ? "Produtos encontrados"
                      : "Sugestões rápidas"}
                  </p>

                  <ul className="mt-2 flex flex-col gap-2">
                    {matchedProducts.map((product) => {
                      const isActive = activeProduct.id === product.id;

                      return (
                        <li key={product.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setQuery(product.name);
                            }}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              isActive
                                ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40"
                                : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                            }`}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold">
                                {product.name}
                              </span>
                              <span className="shrink-0 text-xs font-bold text-violet-700 dark:text-violet-300">
                                {formatBRL(product.price)}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                              EAN {product.ean} · {product.unit}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {activeProduct.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        EAN {activeProduct.ean} · {activeProduct.unit}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-violet-700 dark:text-violet-300">
                      {formatBRL(activeProduct.price)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-violet-50 p-2.5 dark:bg-violet-950/40">
                    <Lightbulb
                      className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400"
                      aria-hidden
                    />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        Cálculo de rendimento
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                        {activeProduct.yieldInfo}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Venda cruzada sugerida
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {activeProduct.crossSell.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
                        >
                          <Plus
                            className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400"
                            aria-hidden
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={`/vendas/pedidos/novo?produto=${activeProduct.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                  >
                    Adicionar à nova venda
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Atalhos operacionais */}
        <section aria-labelledby="shortcuts-title">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="shortcuts-title"
                className="text-base font-bold tracking-tight sm:text-lg"
              >
                Atalhos Operacionais
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Acesso direto às rotinas mais usadas no dia a dia.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-800"
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.iconClassName}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-violet-500 dark:text-zinc-600"
                      aria-hidden
                    />
                  </span>

                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {action.label}
                    </span>
                    <span className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {action.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Monitoramento de vendas recentes */}
        <section aria-labelledby="recent-sales-title">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="recent-sales-title"
                className="text-base font-bold tracking-tight sm:text-lg"
              >
                Monitoramento de Vendas Recentes
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Últimas comandas geradas no balcão e seus status atuais.
              </p>
            </div>

            <Link
              href="/vendas/pedidos"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
            >
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {/* Tabela desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Comanda
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Cliente
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Vendedor
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Tabela
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {RECENT_SALES.map((sale) => (
                    <tr
                      key={sale.code}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold">#{sale.code}</span>
                        <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                          {sale.time}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        <span className="block max-w-[16rem] truncate">
                          {sale.customer}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {sale.seller}
                      </td>
                      <td className="px-4 py-3">
                        <TierBadge tier={sale.tier} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatBRL(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
              {RECENT_SALES.map((sale) => (
                <div key={sale.code} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">#{sale.code}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {sale.time} · {sale.seller}
                      </p>
                    </div>
                    <StatusBadge status={sale.status} />
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                        {sale.customer}
                      </p>
                      <div className="mt-1">
                        <TierBadge tier={sale.tier} />
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">
                      {formatBRL(sale.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
