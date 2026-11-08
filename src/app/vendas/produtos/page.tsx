"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Edit3,
  MapPin,
  PackagePlus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

type ProductCategory = "BASICO" | "HIDRAULICA" | "ELETRICA" | "ACABAMENTO";
type ProductUnit = "CX" | "UN" | "M2" | "KG" | "SACO";
type ProductModalTab = "dados" | "precos" | "fisico";
type StockStatus = "OK" | "BAIXO" | "ESGOTADO";

interface Product {
  id: string;
  sku: string;
  barcodeEan: string;
  name: string;
  category: ProductCategory;
  ncm: string;
  primaryUnit: ProductUnit;
  location: string;
  costPrice: number;
  targetMargin: number;
  retailPrice: number;
  wholesalePrice: number;
  minWholesaleQty: number;
  stockQuantity: number;
  minStock: number;
  maxStock: number;
  active: boolean;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1", sku: "CIM-001", barcodeEan: "7890000000011", name: "Cimento CP II 50 kg",
    category: "BASICO", ncm: "25232910", primaryUnit: "SACO", location: "Pátio A / Pilha 03",
    costPrice: 36.8, targetMargin: 24, retailPrice: 45.63, wholesalePrice: 42.9,
    minWholesaleQty: 20, stockQuantity: 320, minStock: 80, maxStock: 600, active: true,
  },
  {
    id: "prod-2", sku: "ARG-006", barcodeEan: "7890000000066", name: "Argamassa AC-III 20 kg",
    category: "BASICO", ncm: "32149000", primaryUnit: "SACO", location: "Rua 2 / Prateleira 11",
    costPrice: 39.15, targetMargin: 18, retailPrice: 46.2, wholesalePrice: 43.8,
    minWholesaleQty: 30, stockQuantity: 18, minStock: 50, maxStock: 300, active: true,
  },
  {
    id: "prod-3", sku: "TEL-008", barcodeEan: "7890000000080", name: "Tela Soldada Q-138",
    category: "BASICO", ncm: "73144100", primaryUnit: "UN", location: "Galpão 1 / Rua 4",
    costPrice: 176.4, targetMargin: 22, retailPrice: 215.21, wholesalePrice: 198,
    minWholesaleQty: 10, stockQuantity: 0, minStock: 15, maxStock: 150, active: true,
  },
  {
    id: "prod-4", sku: "HID-014", barcodeEan: "7890000000141", name: "Tubo PVC 100 mm 6 m",
    category: "HIDRAULICA", ncm: "39172200", primaryUnit: "UN", location: "Pátio B / Rack 02",
    costPrice: 74.9, targetMargin: 25, retailPrice: 93.63, wholesalePrice: 86.5,
    minWholesaleQty: 20, stockQuantity: 42, minStock: 30, maxStock: 120, active: true,
  },
  {
    id: "prod-5", sku: "ELE-021", barcodeEan: "7890000000219", name: "Cabo Flexível 2,5 mm - 100 m",
    category: "ELETRICA", ncm: "85444900", primaryUnit: "UN", location: "Rua 5 / Prateleira 07",
    costPrice: 286, targetMargin: 20, retailPrice: 343.2, wholesalePrice: 315,
    minWholesaleQty: 5, stockQuantity: 68, minStock: 20, maxStock: 100, active: true,
  },
];

const EMPTY_PRODUCT: Product = {
  id: "", sku: "", barcodeEan: "", name: "", category: "BASICO", ncm: "", primaryUnit: "UN",
  location: "", costPrice: 0, targetMargin: 0, retailPrice: 0, wholesalePrice: 0,
  minWholesaleQty: 10, stockQuantity: 0, minStock: 5, maxStock: 100, active: true,
};

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  BASICO: "Básico",
  HIDRAULICA: "Hidráulica",
  ELETRICA: "Elétrica",
  ACABAMENTO: "Acabamento",
};

const UNITS: ProductUnit[] = ["CX", "UN", "M2", "KG", "SACO"];
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function stockStatus(product: Product): StockStatus {
  if (product.stockQuantity <= 0) return "ESGOTADO";
  if (product.stockQuantity < product.minStock) return "BAIXO";
  return "OK";
}

export default function ProdutosPage() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ProductModalTab>("dados");
  const [draft, setDraft] = useState<Product>(EMPTY_PRODUCT);
  const [originalCost, setOriginalCost] = useState<number | null>(null);
  const [auditLog, setAuditLog] = useState<string[]>([]);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.barcodeEan, CATEGORY_LABELS[product.category]]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [products, search]);

  const lowCount = products.filter((product) => stockStatus(product) !== "OK").length;
  const stockCost = products.reduce((sum, product) => sum + product.stockQuantity * product.costPrice, 0);
  const stockRetail = products.reduce((sum, product) => sum + product.stockQuantity * product.retailPrice, 0);

  function openCreate() {
    setDraft({ ...EMPTY_PRODUCT, id: crypto.randomUUID(), sku: `MAT-${String(products.length + 1).padStart(4, "0")}` });
    setOriginalCost(null);
    setModalTab("dados");
    setError("");
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setDraft({ ...product });
    setOriginalCost(product.costPrice);
    setModalTab("dados");
    setError("");
    setModalOpen(true);
  }

  function updateDraft<K extends keyof Product>(key: K, value: Product[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.sku.trim()) {
      setError("Nome e código/SKU são obrigatórios.");
      setModalTab("dados");
      return;
    }

    if (originalCost !== null && Number(draft.costPrice) !== originalCost) {
      setAuditLog((current) => [
        ...current,
        `${new Date().toLocaleString("pt-BR")} · ${draft.sku} · custo ${currency.format(originalCost)} → ${currency.format(draft.costPrice)} · alteração manual sem NF-e`,
      ]);
    }

    setProducts((current) => {
      const exists = current.some((product) => product.id === draft.id);
      return exists
        ? current.map((product) => product.id === draft.id ? draft : product)
        : [...current, draft];
    });
    setModalOpen(false);
  }

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Estoque de Galpão</p>
            <h1 className="mt-1 text-2xl font-bold">Catálogo de Produtos &amp; Controle de Estoque</h1>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700">
            <PackagePlus className="h-4 w-4" aria-hidden />
            Cadastrar Produto
          </button>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Itens ativos" value={String(products.filter((item) => item.active).length)} icon={<Boxes />} tone="violet" />
          <SummaryCard label="Abaixo do mínimo" value={String(lowCount)} icon={<AlertTriangle />} tone="rose" />
          <SummaryCard label="Estoque a custo" value={currency.format(stockCost)} icon={<ShoppingCart />} tone="amber" />
          <SummaryCard label="Estoque a venda" value={currency.format(stockRetail)} icon={<CheckCircle2 />} tone="emerald" />
        </section>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900">
          <Search className="h-4 w-4 text-zinc-400" aria-hidden />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, código de barras EAN-13 ou categoria"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca">
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          )}
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Código / SKU</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Estoque físico</th>
                  <th className="px-4 py-3">Unidade</th>
                  <th className="px-4 py-3">Preço custo</th>
                  <th className="px-4 py-3">Varejo</th>
                  <th className="px-4 py-3">Atacado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((product) => {
                  const status = stockStatus(product);
                  return (
                    <tr key={product.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-4">
                        <p className="font-bold">{product.sku}</p>
                        <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">EAN {product.barcodeEan || "—"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold">{product.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400"><MapPin className="h-3 w-3" />{product.location || "Sem localização"}</p>
                      </td>
                      <td className="px-4 py-4">{CATEGORY_LABELS[product.category]}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{product.stockQuantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}</span>
                          <StockBadge status={status} />
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold">{product.primaryUnit}</td>
                      <td className="px-4 py-4">{currency.format(product.costPrice)}</td>
                      <td className="px-4 py-4 font-bold">{currency.format(product.retailPrice)}</td>
                      <td className="px-4 py-4">
                        <p>{currency.format(product.wholesalePrice)}</p>
                        <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">mín. {product.minWholesaleQty} {product.primaryUnit}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button type="button" onClick={() => openEdit(product)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 font-bold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length && <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Nenhum produto encontrado.</p>}
          </div>
        </section>

        {auditLog.length > 0 && (
          <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs dark:border-amber-900 dark:bg-amber-950/30">
            <summary className="cursor-pointer font-bold text-amber-700 dark:text-amber-300">Log local de alterações de custo ({auditLog.length})</summary>
            <ul className="mt-3 space-y-2 text-zinc-600 dark:text-zinc-300">
              {auditLog.map((entry) => <li key={entry}>• {entry}</li>)}
            </ul>
          </details>
        )}

        <footer className="py-7 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form onSubmit={saveProduct} className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Cadastro sincronizado com Product</p>
                <h2 className="mt-1 text-lg font-bold">{draft.id && products.some((product) => product.id === draft.id) ? "Editar Produto" : "Novo Produto"}</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /><span className="sr-only">Fechar</span></button>
            </div>

            <div className="flex gap-5 border-b border-zinc-200 px-5 dark:border-zinc-800">
              {([
                ["dados", "Dados Básicos"],
                ["precos", "Preços e Margem"],
                ["fisico", "Controle Físico"],
              ] as [ProductModalTab, string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setModalTab(key)} className={`border-b-2 py-3 text-xs font-bold ${modalTab === key ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400" : "border-transparent text-zinc-500"}`}>{label}</button>
              ))}
            </div>

            <div className="p-5">
              {modalTab === "dados" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome do produto" className="sm:col-span-2"><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} /></Field>
                  <Field label="Código de Barras (EAN)"><input value={draft.barcodeEan} onChange={(event) => updateDraft("barcodeEan", event.target.value.replace(/\D/g, ""))} maxLength={13} inputMode="numeric" /></Field>
                  <Field label="Código / SKU"><input value={draft.sku} onChange={(event) => updateDraft("sku", event.target.value)} /></Field>
                  <Field label="Categoria"><select value={draft.category} onChange={(event) => updateDraft("category", event.target.value as ProductCategory)}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                  <Field label="NCM"><input value={draft.ncm} onChange={(event) => updateDraft("ncm", event.target.value.replace(/\D/g, ""))} /></Field>
                  <Field label="Unidade de Medida"><select value={draft.primaryUnit} onChange={(event) => updateDraft("primaryUnit", event.target.value as ProductUnit)}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></Field>
                  <Field label="Localização (Rua / Prateleira / Pátio)"><input value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} /></Field>
                </div>
              )}

              {modalTab === "precos" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Preço de Custo (R$)"><input type="number" min="0" step="0.01" value={draft.costPrice} onChange={(event) => updateDraft("costPrice", Number(event.target.value))} /></Field>
                  <Field label="Margem Target (%)"><input type="number" min="0" step="0.1" value={draft.targetMargin} onChange={(event) => updateDraft("targetMargin", Number(event.target.value))} /></Field>
                  <Field label="Preço de Varejo (R$)"><input type="number" min="0" step="0.01" value={draft.retailPrice} onChange={(event) => updateDraft("retailPrice", Number(event.target.value))} /></Field>
                  <Field label="Preço de Atacado (R$)"><input type="number" min="0" step="0.01" value={draft.wholesalePrice} onChange={(event) => updateDraft("wholesalePrice", Number(event.target.value))} /></Field>
                  <Field label="Quantidade mínima para Atacado" className="sm:col-span-2"><input type="number" min="1" step="1" value={draft.minWholesaleQty} onChange={(event) => updateDraft("minWholesaleQty", Number(event.target.value))} /></Field>
                  {originalCost !== null && Number(draft.costPrice) !== originalCost && (
                    <div className="sm:col-span-2 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> A alteração manual de custo será registrada em auditoria, pois não está vinculada a uma entrada de NF-e.
                    </div>
                  )}
                </div>
              )}

              {modalTab === "fisico" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Estoque Atual"><input type="number" min="0" step="0.001" value={draft.stockQuantity} onChange={(event) => updateDraft("stockQuantity", Number(event.target.value))} /></Field>
                  <Field label="Estoque Mínimo"><input type="number" min="0" step="0.001" value={draft.minStock} onChange={(event) => updateDraft("minStock", Number(event.target.value))} /></Field>
                  <Field label="Estoque Máximo"><input type="number" min="0" step="0.001" value={draft.maxStock} onChange={(event) => updateDraft("maxStock", Number(event.target.value))} /></Field>
                </div>
              )}
              {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40">{error}</div>}
            </div>

            <div className="flex gap-3 border-t border-zinc-200 p-5 dark:border-zinc-800">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-zinc-300 py-3 text-xs font-bold dark:border-zinc-700">Cancelar</button>
              <button type="submit" className="flex-1 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-700">Salvar Produto</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: string; icon: ReactNode; tone: "violet" | "rose" | "amber" | "emerald" }) {
  const tones = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    rose: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  };
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>
        <div className={`rounded-xl p-2.5 [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}>{icon}</div>
      </div>
    </article>
  );
}

function StockBadge({ status }: { status: StockStatus }) {
  const classes = {
    OK: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    BAIXO: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    ESGOTADO: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  };
  const labels = { OK: "OK", BAIXO: "Estoque Baixo", ESGOTADO: "Esgotado" };
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${classes[status]}`}>{labels[status]}</span>;
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-bold ${className}`}>
      {label}
      <span className="[&_input]:mt-1 [&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-zinc-300 [&_input]:bg-white [&_input]:px-3 [&_input]:text-sm [&_input]:font-normal [&_select]:mt-1 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-zinc-300 [&_select]:bg-white [&_select]:px-3 [&_select]:text-sm [&_select]:font-normal dark:[&_input]:border-zinc-700 dark:[&_input]:bg-zinc-950 dark:[&_select]:border-zinc-700 dark:[&_select]:bg-zinc-950 [&_input]:outline-none [&_select]:outline-none">
        {children}
      </span>
    </label>
  );
}
