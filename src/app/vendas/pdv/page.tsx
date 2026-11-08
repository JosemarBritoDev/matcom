/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Minus,
  PackageSearch,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  Send,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

type PricingTier = "VAREJO" | "ATACADO";
type TierStatus = "APROVADO" | "PENDENTE" | "REJEITADO";
type DeliveryMode = "RETIRADA_IMEDIATA" | "ENTREGA_PENDENTE";
type ProductUnit = "m²" | "m³" | "kg" | "un" | "saco" | "caixa" | "lata";

interface Customer {
  id: string;
  name: string;
  document: string;
  tier: PricingTier;
  tierStatus: TierStatus;
}

interface Product {
  id: string;
  ean: string;
  internalCode: string;
  name: string;
  imageUrl: string;
  stock: number;
  unit: ProductUnit;
  retailPrice: number;
  wholesalePrice: number;
  minWholesaleQty: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  tier: PricingTier;
}

/* -------------------------------------------------------------------------- */
/*                                    Dados                                   */
/* -------------------------------------------------------------------------- */

const TENANT = {
  name: "MatCom Materiais",
  document: "12.345.678/0001-90",
};

const SELLER = {
  name: "Ana Paula",
  code: "0042",
};

const MAX_DISCOUNT = 10;

const CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    name: "Construtora Horizonte Ltda.",
    document: "12.345.678/0001-90",
    tier: "ATACADO",
    tierStatus: "APROVADO",
  },
  {
    id: "cust-2",
    name: "Carlos Eduardo Martins",
    document: "123.456.789-00",
    tier: "VAREJO",
    tierStatus: "APROVADO",
  },
  {
    id: "cust-3",
    name: "Reforma Fácil Materiais",
    document: "98.765.432/0001-10",
    tier: "ATACADO",
    tierStatus: "PENDENTE",
  },
  {
    id: "cust-4",
    name: "Maria Aparecida Silva",
    document: "987.654.321-00",
    tier: "VAREJO",
    tierStatus: "APROVADO",
  },
];

const PRODUCTS: Product[] = [
  {
    id: "cimento-cpii",
    ean: "7891234500011",
    internalCode: "CIM-001",
    name: "Cimento CP II 50 kg",
    imageUrl: "/products/cimento.svg",
    stock: 320,
    unit: "saco",
    retailPrice: 38.9,
    wholesalePrice: 34.5,
    minWholesaleQty: 10,
  },
  {
    id: "areia-media",
    ean: "7891234500028",
    internalCode: "ARE-002",
    name: "Areia média lavada",
    imageUrl: "/products/areia.svg",
    stock: 18.5,
    unit: "m³",
    retailPrice: 129.9,
    wholesalePrice: 112,
    minWholesaleQty: 3,
  },
  {
    id: "bloco-concreto",
    ean: "7891234500035",
    internalCode: "BLO-003",
    name: "Bloco de concreto 14x19x39",
    imageUrl: "/products/bloco.svg",
    stock: 4800,
    unit: "un",
    retailPrice: 2.75,
    wholesalePrice: 2.35,
    minWholesaleQty: 500,
  },
  {
    id: "tinta-acrilica",
    ean: "7891234500042",
    internalCode: "TIN-004",
    name: "Tinta acrílica premium 18 L",
    imageUrl: "/products/tinta.svg",
    stock: 42,
    unit: "lata",
    retailPrice: 289.9,
    wholesalePrice: 259,
    minWholesaleQty: 6,
  },
  {
    id: "porcelanato-80",
    ean: "7891234500059",
    internalCode: "POR-005",
    name: "Porcelanato acetinado 80x80 cm",
    imageUrl: "/products/porcelanato.svg",
    stock: 96,
    unit: "caixa",
    retailPrice: 159.9,
    wholesalePrice: 142,
    minWholesaleQty: 10,
  },
  {
    id: "argamassa-aciii",
    ean: "7891234500066",
    internalCode: "ARG-006",
    name: "Argamassa AC-III 20 kg",
    imageUrl: "/products/cimento.svg",
    stock: 210,
    unit: "saco",
    retailPrice: 42.5,
    wholesalePrice: 37.9,
    minWholesaleQty: 12,
  },
  {
    id: "vergalhao-ca50",
    ean: "7891234500073",
    internalCode: "VER-007",
    name: "Vergalhão CA-50 10 mm 12 m",
    imageUrl: "/products/aco.svg",
    stock: 340,
    unit: "un",
    retailPrice: 68.9,
    wholesalePrice: 62,
    minWholesaleQty: 20,
  },
  {
    id: "tela-q138",
    ean: "7891234500080",
    internalCode: "TEL-008",
    name: "Tela soldada Q-138",
    imageUrl: "/products/aco.svg",
    stock: 75,
    unit: "un",
    retailPrice: 189.9,
    wholesalePrice: 172,
    minWholesaleQty: 5,
  },
];

/* -------------------------------------------------------------------------- */
/*                                  Utilitários                               */
/* -------------------------------------------------------------------------- */

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

function formatBRL(value: number) {
  return brlFormatter.format(value);
}

function formatQuantity(value: number) {
  return quantityFormatter.format(value);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

function getQuantityStep(unit: ProductUnit) {
  return unit === "m²" || unit === "m³" || unit === "kg" ? 0.5 : 1;
}

function getUnitPrice(item: CartItem) {
  return item.tier === "ATACADO"
    ? item.product.wholesalePrice
    : item.product.retailPrice;
}

function getItemTotal(item: CartItem) {
  return getUnitPrice(item) * item.quantity;
}

/* -------------------------------------------------------------------------- */
/*                              Componentes auxiliares                        */
/* -------------------------------------------------------------------------- */

function CustomerTierBadge({ customer }: { customer: Customer }) {
  if (customer.tier === "VAREJO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        Varejo
      </span>
    );
  }

  if (customer.tierStatus === "APROVADO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Atacado Aprovado
      </span>
    );
  }

  if (customer.tierStatus === "PENDENTE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
        <Clock className="h-3 w-3" aria-hidden />
        Atacado Pendente
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
      <XCircle className="h-3 w-3" aria-hidden />
      Atacado Rejeitado
    </span>
  );
}

function ItemTierToggle({
  tier,
  onToggle,
}: {
  tier: PricingTier;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title="Alternar entre Varejo e Atacado avulso"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
        tier === "ATACADO"
          ? "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      {tier === "ATACADO" ? "Atacado avulso" : "Varejo"}
      <ArrowLeftRight className="h-3 w-3" aria-hidden />
    </button>
  );
}

function QuantityControl({
  item,
  onChange,
}: {
  item: CartItem;
  onChange: (value: number) => void;
}) {
  const step = getQuantityStep(item.product.unit);

  return (
    <div className="inline-flex items-center rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() =>
          onChange(roundQuantity(Math.max(step, item.quantity - step)))
        }
        aria-label={`Diminuir quantidade de ${item.product.name}`}
        className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:text-violet-700 dark:text-zinc-400 dark:hover:text-violet-300"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>

      <input
        type="number"
        inputMode="decimal"
        min={step}
        step={step}
        value={item.quantity}
        onChange={(event) => {
          const value = Number(event.target.value);

          if (Number.isFinite(value)) {
            onChange(Math.max(0, value));
          }
        }}
        aria-label={`Quantidade de ${item.product.name}`}
        className="h-8 w-14 border-x border-zinc-300 bg-transparent text-center text-xs font-semibold text-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-zinc-50"
      />

      <button
        type="button"
        onClick={() => onChange(roundQuantity(item.quantity + step))}
        aria-label={`Aumentar quantidade de ${item.product.name}`}
        className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:text-violet-700 dark:text-zinc-400 dark:hover:text-violet-300"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Página                                   */
/* -------------------------------------------------------------------------- */

export default function PdvPage() {
  const [customerId, setCustomerId] = useState(CUSTOMERS[0].id);
  const [draftCode, setDraftCode] = useState(1051);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [deliveryMode, setDeliveryMode] =
    useState<DeliveryMode>("RETIRADA_IMEDIATA");
  const [notes, setNotes] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const selectedCustomer =
    CUSTOMERS.find((customer) => customer.id === customerId) ?? CUSTOMERS[0];

  const defaultTier: PricingTier =
    selectedCustomer.tier === "ATACADO" &&
    selectedCustomer.tierStatus === "APROVADO"
      ? "ATACADO"
      : "VAREJO";

  const normalizedSearch = search.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) {
      return [];
    }

    return PRODUCTS.filter(
      (product) =>
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.ean.includes(normalizedSearch) ||
        product.internalCode.toLowerCase().includes(normalizedSearch),
    ).slice(0, 6);
  }, [normalizedSearch]);

  const subtotal = cart.reduce(
    (accumulator, item) => accumulator + getItemTotal(item),
    0,
  );
  const discountValue = (subtotal * discountPercent) / 100;
  const total = Math.max(0, subtotal - discountValue);
  const hasAtacado = cart.some((item) => item.tier === "ATACADO");
  const hasInvalidQuantity = cart.some((item) => item.quantity <= 0);
  const canSubmit = cart.length > 0 && !hasInvalidQuantity;
  const atacadoNeedsApproval =
    hasAtacado &&
    !(
      selectedCustomer.tier === "ATACADO" &&
      selectedCustomer.tierStatus === "APROVADO"
    );

  const allVarejo =
    cart.length > 0 && cart.every((item) => item.tier === "VAREJO");
  const allAtacado =
    cart.length > 0 && cart.every((item) => item.tier === "ATACADO");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  function addProduct(product: Product) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        const step = getQuantityStep(product.unit);

        return currentCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: roundQuantity(item.quantity + step),
              }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          product,
          quantity: getQuantityStep(product.unit),
          tier: defaultTier,
        },
      ];
    });

    setSearch("");
    setSearchOpen(false);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function changeQuantity(productId: string, quantity: number) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  }

  function removeItem(productId: string) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.product.id !== productId),
    );
  }

  function toggleItemTier(productId: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              tier: item.tier === "ATACADO" ? "VAREJO" : "ATACADO",
            }
          : item,
      ),
    );
  }

  function applyTierToAll(tier: PricingTier) {
    setCart((currentCart) =>
      currentCart.map((item) => ({ ...item, tier })),
    );
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && filteredProducts.length > 0) {
      event.preventDefault();
      addProduct(filteredProducts[0]);
    }
  }

  function handleGenerateOrder() {
    if (!canSubmit) {
      return;
    }

    setGeneratedAt(new Date());
    setModalOpen(true);
  }

  function startNewSale() {
    setCart([]);
    setDiscountPercent(0);
    setDeliveryMode("RETIRADA_IMEDIATA");
    setNotes("");
    setModalOpen(false);
    setGeneratedAt(null);
    setSearch("");
    setSearchOpen(false);
    setDraftCode((currentCode) => currentCode + 1);
  }

  return (
    <>
      <div className="min-h-full bg-zinc-50 text-zinc-900 print:hidden dark:bg-zinc-950 dark:text-zinc-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:gap-6 lg:py-8">
          {/* Cabeçalho do PDV */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
                  <ShoppingCart className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                    PDV Balcão
                  </h1>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Atendimento rápido · comanda imutável após o caixa
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Caixa aberto
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {/* Vendedor */}
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Vendedor logado
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {SELLER.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Matrícula {SELLER.code}
                  </p>
                </div>
              </div>

              {/* Cliente */}
              <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <Users className="h-3 w-3" aria-hidden />
                    Cliente
                  </p>
                  <CustomerTierBadge customer={selectedCustomer} />
                </div>

                <div className="relative mt-1.5">
                  <select
                    value={customerId}
                    onChange={(event) => {
                      const nextCustomer =
                        CUSTOMERS.find(
                          (customer) => customer.id === event.target.value,
                        ) ?? CUSTOMERS[0];

                      setCustomerId(nextCustomer.id);

                      const nextTier: PricingTier =
                        nextCustomer.tier === "ATACADO" &&
                        nextCustomer.tierStatus === "APROVADO"
                          ? "ATACADO"
                          : "VAREJO";

                      setCart((currentCart) =>
                        currentCart.map((item) => ({
                          ...item,
                          tier: nextTier,
                        })),
                      );
                    }}
                    aria-label="Selecionar cliente da comanda"
                    className="w-full appearance-none rounded-lg border border-zinc-300 bg-white py-1.5 pl-2 pr-8 text-sm font-medium text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {CUSTOMERS.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                </div>

                <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {selectedCustomer.document}
                </p>
              </div>

              {/* Comanda em rascunho */}
              <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900 dark:bg-violet-950/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80">
                    Comanda em rascunho
                  </p>
                  <p className="text-xl font-bold text-violet-700 dark:text-violet-300">
                    #{draftCode}
                  </p>
                  <p className="text-[11px] text-violet-700/70 dark:text-violet-300/70">
                    Ainda não enviada ao caixa
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px] xl:items-start xl:gap-6">
            <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
              {/* Busca rápida */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold tracking-tight">
                    Busca rápida de produtos
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <ScanBarcode className="h-3 w-3" aria-hidden />
                    Leitor EAN ativo
                  </span>
                </div>

                <div
                  ref={searchContainerRef}
                  className="relative mt-3"
                >
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Bipe o código de barras ou busque por EAN, código interno ou nome..."
                    aria-label="Buscar produto por código de barras, EAN, código interno ou nome"
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  />
                  <ScanBarcode
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />

                  {searchOpen && normalizedSearch.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl shadow-zinc-900/15 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/50">
                      {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
                          <PackageSearch
                            className="h-6 w-6 text-zinc-400"
                            aria-hidden
                          />
                          <p className="text-sm font-semibold">
                            Nenhum produto encontrado
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Confira o EAN, código interno ou nome digitado.
                          </p>
                        </div>
                      ) : (
                        <ul aria-label="Sugestões de produtos">
                          {filteredProducts.map((product) => (
                            <li key={product.id}>
                              <button
                                type="button"
                                onMouseDown={(event) =>
                                  event.preventDefault()
                                }
                                onClick={() => addProduct(product)}
                                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/40"
                              >
                                <img
                                  src={product.imageUrl}
                                  alt=""
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                                />

                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-semibold">
                                      {product.name}
                                    </span>
                                    <span className="shrink-0 text-xs font-bold text-violet-700 dark:text-violet-300">
                                      {formatBRL(product.retailPrice)}
                                    </span>
                                  </span>

                                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    <span>EAN {product.ean}</span>
                                    <span aria-hidden>•</span>
                                    <span>Cód. {product.internalCode}</span>
                                    <span aria-hidden>•</span>
                                    <span
                                      className={
                                        product.stock > 0
                                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                                          : "font-medium text-red-600 dark:text-red-400"
                                      }
                                    >
                                      Estoque: {formatQuantity(product.stock)}{" "}
                                      {product.unit}
                                    </span>
                                  </span>

                                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                                    <span className="text-zinc-600 dark:text-zinc-300">
                                      Varejo{" "}
                                      <strong>
                                        {formatBRL(product.retailPrice)}
                                      </strong>
                                    </span>
                                    <span className="text-violet-700 dark:text-violet-300">
                                      Atacado{" "}
                                      <strong>
                                        {formatBRL(product.wholesalePrice)}
                                      </strong>
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-500">
                                      mín.{" "}
                                      {formatQuantity(
                                        product.minWholesaleQty,
                                      )}{" "}
                                      {product.unit}
                                    </span>
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Bipe o código de barras ou pressione{" "}
                  <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-[10px] font-semibold dark:border-zinc-700 dark:bg-zinc-800">
                    Enter
                  </kbd>{" "}
                  para adicionar o primeiro resultado.
                </p>
              </section>

              {/* Carrinho */}
              <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShoppingCart
                      className="h-4 w-4 text-violet-600 dark:text-violet-400"
                      aria-hidden
                    />
                    <h2 className="text-sm font-bold tracking-tight">
                      Carrinho de compras
                    </h2>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {cart.length} {cart.length === 1 ? "item" : "itens"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      Tabela global:
                    </span>
                    <div className="inline-flex rounded-lg border border-zinc-300 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-950">
                      <button
                        type="button"
                        onClick={() => applyTierToAll("VAREJO")}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          allVarejo
                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        Varejo
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTierToAll("ATACADO")}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          allAtacado
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-zinc-500 hover:text-violet-700 dark:text-zinc-400 dark:hover:text-violet-300"
                        }`}
                      >
                        Atacado avulso
                      </button>
                    </div>
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
                    <PackageSearch
                      className="h-10 w-10 text-zinc-300 dark:text-zinc-700"
                      aria-hidden
                    />
                    <p className="text-sm font-semibold">Carrinho vazio</p>
                    <p className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                      Bipe um código de barras ou busque pelo nome para iniciar
                      a comanda.
                    </p>
                    <button
                      type="button"
                      onClick={() => searchInputRef.current?.focus()}
                      className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Buscar produto
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Tabela desktop */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                          <tr>
                            <th scope="col" className="px-4 py-2.5 font-semibold">
                              Produto
                            </th>
                            <th scope="col" className="px-4 py-2.5 font-semibold">
                              Preço un.
                            </th>
                            <th scope="col" className="px-4 py-2.5 font-semibold">
                              Quantidade
                            </th>
                            <th scope="col" className="px-4 py-2.5 font-semibold">
                              Tabela
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-2.5 text-right font-semibold"
                            >
                              Total
                            </th>
                            <th scope="col" className="px-3 py-2.5">
                              <span className="sr-only">Ações</span>
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {cart.map((item) => (
                            <tr
                              key={item.product.id}
                              className={
                                item.quantity <= 0
                                  ? "bg-red-50/50 dark:bg-red-950/10"
                                  : "transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                              }
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.product.imageUrl}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                                  />
                                  <div className="min-w-0">
                                    <p className="max-w-[15rem] truncate font-semibold">
                                      {item.product.name}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                      EAN {item.product.ean} ·{" "}
                                      {item.product.unit}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <span className="font-semibold">
                                  {formatBRL(getUnitPrice(item))}
                                </span>
                                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                                  por {item.product.unit}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <QuantityControl
                                  item={item}
                                  onChange={(value) =>
                                    changeQuantity(item.product.id, value)
                                  }
                                />
                              </td>

                              <td className="px-4 py-3">
                                <ItemTierToggle
                                  tier={item.tier}
                                  onToggle={() =>
                                    toggleItemTier(item.product.id)
                                  }
                                />
                              </td>

                              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                {formatBRL(getItemTotal(item))}
                              </td>

                              <td className="px-3 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.product.id)}
                                  aria-label={`Remover ${item.product.name} do carrinho`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Cards mobile */}
                    <div className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className={`flex flex-col gap-3 p-4 ${
                            item.quantity <= 0
                              ? "bg-red-50/50 dark:bg-red-950/10"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={item.product.imageUrl}
                              alt=""
                              width={44}
                              height={44}
                              className="h-11 w-11 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">
                                {item.product.name}
                              </p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                EAN {item.product.ean} ·{" "}
                                {formatQuantity(item.product.stock)}{" "}
                                {item.product.unit} em estoque
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.product.id)}
                              aria-label={`Remover ${item.product.name} do carrinho`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <ItemTierToggle
                              tier={item.tier}
                              onToggle={() => toggleItemTier(item.product.id)}
                            />
                            <QuantityControl
                              item={item}
                              onChange={(value) =>
                                changeQuantity(item.product.id, value)
                              }
                            />
                            <p className="ml-auto text-sm font-bold tabular-nums">
                              {formatBRL(getItemTotal(item))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>

            {/* Painel de fechamento */}
            <aside className="xl:sticky xl:top-20">
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold tracking-tight">
                      Fechamento da comanda
                    </h2>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                      #{draftCode}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Revise os itens e os dados antes de enviar ao caixa.
                  </p>
                </div>

                <div className="p-4">
                  {/* Resumo do cliente */}
                  <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/50">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Cliente
                      </span>
                      <span className="truncate font-semibold">
                        {selectedCustomer.name}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Tabela
                      </span>
                      <CustomerTierBadge customer={selectedCustomer} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Vendedor
                      </span>
                      <span className="font-semibold">{SELLER.name}</span>
                    </div>
                  </div>

                  {/* Resumo dos itens */}
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Resumo dos itens
                    </p>

                    {cart.length > 0 ? (
                      <ul className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
                        {cart.map((item) => (
                          <li
                            key={item.product.id}
                            className="flex items-start justify-between gap-2 text-xs"
                          >
                            <span className="min-w-0 text-zinc-600 dark:text-zinc-300">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                                {formatQuantity(item.quantity)}{" "}
                                {item.product.unit}
                              </span>{" "}
                              ×{" "}
                              <span className="truncate">
                                {item.product.name}
                              </span>
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums">
                              {formatBRL(getItemTotal(item))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Nenhum item adicionado.
                      </p>
                    )}
                  </div>

                  {/* Totais */}
                  <dl className="mt-4 space-y-1.5 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Subtotal
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {formatBRL(subtotal)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Desconto ({discountPercent}%)
                      </dt>
                      <dd className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                        - {formatBRL(discountValue)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
                      <dt className="text-base font-bold">Total</dt>
                      <dd className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatBRL(total)}
                      </dd>
                    </div>
                  </dl>

                  {/* Desconto */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="discount"
                        className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                      >
                        Desconto permitido
                      </label>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        máx. {MAX_DISCOUNT}%
                      </span>
                    </div>

                    <div className="relative mt-1">
                      <input
                        id="discount"
                        type="number"
                        min={0}
                        max={MAX_DISCOUNT}
                        step={0.5}
                        value={discountPercent}
                        onChange={(event) => {
                          const value = Number(event.target.value);

                          if (Number.isFinite(value)) {
                            setDiscountPercent(
                              Math.min(MAX_DISCOUNT, Math.max(0, value)),
                            );
                          }
                        }}
                        className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-2.5 pr-8 text-sm font-semibold text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Modo de entrega */}
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      Modo de entrega
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryMode("RETIRADA_IMEDIATA")}
                        aria-pressed={
                          deliveryMode === "RETIRADA_IMEDIATA"
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                          deliveryMode === "RETIRADA_IMEDIATA"
                            ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                            : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <Store className="h-3.5 w-3.5" aria-hidden />
                        Retirada
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryMode("ENTREGA_PENDENTE")}
                        aria-pressed={deliveryMode === "ENTREGA_PENDENTE"}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                          deliveryMode === "ENTREGA_PENDENTE"
                            ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                            : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <Truck className="h-3.5 w-3.5" aria-hidden />
                        Entrega
                      </button>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="mt-4">
                    <label
                      htmlFor="order-notes"
                      className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                    >
                      Observações da entrega / galpão
                    </label>
                    <textarea
                      id="order-notes"
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Ex.: separar 2 caixas para entrega na obra, cliente retira às 16h..."
                      className="mt-1 w-full resize-none rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                    />
                  </div>

                  {atacadoNeedsApproval && (
                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                      <Clock
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      Cliente sem Atacado aprovado. A comanda será enviada para
                      análise do Gerente.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerateOrder}
                    disabled={!canSubmit}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:shadow-none dark:disabled:bg-emerald-900/50"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                    Gerar comanda / Enviar ao caixa
                  </button>

                  <p className="mt-2 text-center text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Após o pagamento no caixa, a comanda não poderá ser
                    alterada. Correções exigem estorno autorizado.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {modalOpen && generatedAt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdv-confirmation-title"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/60 p-4 backdrop-blur-sm print:hidden sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2
                    id="pdv-confirmation-title"
                    className="text-base font-bold tracking-tight"
                  >
                    Comanda gerada com sucesso!
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    A comanda foi salva e enviada para a fila do caixa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar modal de confirmação"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Comanda
                    </p>
                    <p className="font-bold text-violet-700 dark:text-violet-300">
                      #{draftCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Total
                    </p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBRL(total)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Cliente
                    </p>
                    <p className="truncate font-semibold">
                      {selectedCustomer.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Itens
                    </p>
                    <p className="font-semibold">{cart.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Tabela
                    </p>
                    <p className="font-semibold">
                      {hasAtacado ? "Atacado avulso" : "Varejo"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Entrega
                    </p>
                    <p className="font-semibold">
                      {deliveryMode === "ENTREGA_PENDENTE"
                        ? "Entrega pendente"
                        : "Retirada imediata"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  <Printer className="h-4 w-4" aria-hidden />
                  Imprimir pré-via do cliente
                </button>

                <button
                  type="button"
                  onClick={startNewSale}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Nova venda
                </button>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="mt-2 w-full text-center text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pré-via impressa do cliente */}
      {generatedAt && (
        <div className="hidden print:block print:bg-white p-6 text-black">
          <div className="border-b-2 border-black pb-3 text-center">
            <h1 className="text-xl font-bold uppercase">{TENANT.name}</h1>
            <p className="text-xs">CNPJ {TENANT.document} · MatCom SaaS</p>
            <p className="mt-1 text-sm font-bold">PRÉ-VIA DO CLIENTE</p>
            <p className="text-[10px]">Não é documento fiscal</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
            <p>
              <strong>Comanda:</strong> #{draftCode}
            </p>
            <p>
              <strong>Data:</strong> {formatDateTime(generatedAt)}
            </p>
            <p>
              <strong>Vendedor:</strong> {SELLER.name} ({SELLER.code})
            </p>
            <p>
              <strong>Cliente:</strong> {selectedCustomer.name}
            </p>
            <p>
              <strong>Tabela:</strong>{" "}
              {hasAtacado ? "Atacado avulso" : "Varejo"}
            </p>
            <p>
              <strong>Entrega:</strong>{" "}
              {deliveryMode === "ENTREGA_PENDENTE"
                ? "Pendente"
                : "Retirada imediata"}
            </p>
          </div>

          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1">Item</th>
                <th className="py-1">Qtd.</th>
                <th className="py-1 text-right">Preço un.</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr
                  key={item.product.id}
                  className="border-b border-zinc-300 align-top"
                >
                  <td className="py-1">{item.product.name}</td>
                  <td className="py-1">
                    {formatQuantity(item.quantity)} {item.product.unit}
                  </td>
                  <td className="py-1 text-right">
                    {formatBRL(getUnitPrice(item))}
                  </td>
                  <td className="py-1 text-right">
                    {formatBRL(getItemTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex justify-end">
            <div className="w-56 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Desconto ({discountPercent}%)</span>
                <span>- {formatBRL(discountValue)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-black pt-1 text-sm font-bold">
                <span>Total</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>
          </div>

          {notes && (
            <div className="mt-3 border border-zinc-400 p-2 text-xs">
              <strong>Observações:</strong> {notes}
            </div>
          )}

          <div className="mt-8 border-t border-zinc-400 pt-2 text-center text-[10px]">
            <p>Obrigado pela preferência!</p>
            <p>Este documento é uma pré-via e não substitui a nota fiscal.</p>
            <p className="mt-1">
              Criado por BCTech | Josemar Brito | Whatsapp 11972646617
            </p>
          </div>
        </div>
      )}
    </>
  );
}
