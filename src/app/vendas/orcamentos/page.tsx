"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PackagePlus,
  Printer,
  Search,
  Send,
  TrendingUp,
  X,
} from "lucide-react";

type QuotationStatus = "ABERTO" | "CONVERTIDO" | "EXPIRADO" | "CANCELADO";
type PriceTable = "VAREJO" | "ATACADO";

interface Quotation {
  id: string;
  number: string;
  customer: string;
  seller: string;
  issuedAt: string;
  validityDays: number;
  total: number;
  status: QuotationStatus;
  payment: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

const INITIAL_QUOTES: Quotation[] = [
  {
    id: "q-205", number: "#ORC-205", customer: "Construtora Horizonte", seller: "Ana Paula",
    issuedAt: "2026-11-07", validityDays: 5, total: 18420, status: "ABERTO",
    payment: "Boleto 30/60 dias", items: [
      { description: "Cimento CP II 50 kg", quantity: 200, unitPrice: 42.9 },
      { description: "Argamassa AC-III 20 kg", quantity: 100, unitPrice: 43.8 },
    ],
  },
  {
    id: "q-204", number: "#ORC-204", customer: "Obra Residencial Silva", seller: "Carlos Lima",
    issuedAt: "2026-11-05", validityDays: 3, total: 7350, status: "ABERTO",
    payment: "PIX à vista", items: [{ description: "Tubo PVC 100 mm", quantity: 75, unitPrice: 86.5 }],
  },
  {
    id: "q-203", number: "#ORC-203", customer: "João Marcos Oliveira", seller: "Ana Paula",
    issuedAt: "2026-11-01", validityDays: 0, total: 2180.5, status: "EXPIRADO",
    payment: "Cartão até 3x", items: [{ description: "Tela soldada Q-138", quantity: 10, unitPrice: 198 }],
  },
  {
    id: "q-202", number: "#ORC-202", customer: "Sigma Engenharia", seller: "Bruno Lima",
    issuedAt: "2026-10-28", validityDays: 0, total: 28600, status: "CONVERTIDO",
    payment: "Crediário 30/60/90 dias", items: [{ description: "Vergalhão CA-50 10 mm", quantity: 300, unitPrice: 69.9 }],
  },
  {
    id: "q-201", number: "#ORC-201", customer: "Depósito Rocha", seller: "Carlos Lima",
    issuedAt: "2026-11-03", validityDays: 12, total: 4210, status: "CANCELADO",
    payment: "PIX à vista", items: [{ description: "Rejunte cinza 5 kg", quantity: 120, unitPrice: 35.08 }],
  },
];

const PRODUCTS = [
  { id: "p1", code: "CIM-001", name: "Cimento CP II 50 kg", retail: 45.63, wholesale: 42.9, wholesaleMin: 20 },
  { id: "p2", code: "ARG-006", name: "Argamassa AC-III 20 kg", retail: 46.2, wholesale: 43.8, wholesaleMin: 30 },
  { id: "p3", code: "TEL-008", name: "Tela Soldada Q-138", retail: 215.21, wholesale: 198, wholesaleMin: 10 },
  { id: "p4", code: "HID-014", name: "Tubo PVC 100 mm 6 m", retail: 93.63, wholesale: 86.5, wholesaleMin: 20 },
];

const CUSTOMERS = ["Construtora Horizonte", "Obra Residencial Silva", "Sigma Engenharia", "João Marcos Oliveira", "Depósito Rocha"];
const SELLERS = ["Ana Paula", "Carlos Lima", "Bruno Lima"];
const STATUS_LABELS: Record<QuotationStatus, string> = {
  ABERTO: "Aberto",
  CONVERTIDO: "Convertido em Venda",
  EXPIRADO: "Expirado",
  CANCELADO: "Cancelado",
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function OrcamentosPage() {
  const [quotes, setQuotes] = useState(INITIAL_QUOTES);
  const [sellerFilter, setSellerFilter] = useState("TODOS");
  const [customerFilter, setCustomerFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | QuotationStatus>("TODOS");
  const [modalOpen, setModalOpen] = useState(false);
  const [printQuote, setPrintQuote] = useState<Quotation | null>(null);
  const [notice, setNotice] = useState("");

  const [customer, setCustomer] = useState(CUSTOMERS[0]);
  const [priceTable, setPriceTable] = useState<PriceTable>("VAREJO");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0].id);
  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState("PIX à vista");
  const [validity, setValidity] = useState(7);

  const filtered = useMemo(() => quotes.filter((quote) =>
    (sellerFilter === "TODOS" || quote.seller === sellerFilter) &&
    (customerFilter === "TODOS" || quote.customer === customerFilter) &&
    (statusFilter === "TODOS" || quote.status === statusFilter),
  ), [quotes, sellerFilter, customerFilter, statusFilter]);

  const openQuotes = quotes.filter((quote) => quote.status === "ABERTO");
  const proposals = openQuotes.reduce((sum, quote) => sum + quote.total, 0);
  const conversion = quotes.length ? (quotes.filter((quote) => quote.status === "CONVERTIDO").length / quotes.length) * 100 : 0;
  const expired = quotes.filter((quote) => quote.status === "EXPIRADO").length;

  const visibleProducts = PRODUCTS.filter((product) =>
    `${product.code} ${product.name}`.toLowerCase().includes(productSearch.toLowerCase()),
  );

  function createQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const product = PRODUCTS.find((item) => item.id === selectedProduct);
    if (!product) return;
    const unitPrice = priceTable === "ATACADO" ? product.wholesale : product.retail;
    const wholesaleApplied = priceTable === "ATACADO" && quantity >= product.wholesaleMin;
    const effectivePrice = wholesaleApplied ? unitPrice : product.retail;

    const nextNumber = 205 + quotes.filter((quote) => quote.status !== "CANCELADO").length - 4;
    const quotation: Quotation = {
      id: crypto.randomUUID(),
      number: `#ORC-${nextNumber}`,
      customer,
      seller: "Ana Paula",
      issuedAt: new Date().toISOString().slice(0, 10),
      validityDays: validity,
      total: effectivePrice * quantity,
      status: "ABERTO",
      payment,
      items: [{ description: product.name, quantity, unitPrice: effectivePrice }],
    };
    setQuotes((current) => [quotation, ...current]);
    setModalOpen(false);
    setNotice(`Orçamento ${quotation.number} criado para ${customer}.`);
  }

  function convertQuotation(quote: Quotation) {
    if (quote.status !== "ABERTO") return;
    setQuotes((current) => current.map((item) =>
      item.id === quote.id ? { ...item, status: "CONVERTIDO" } : item,
    ));
    setNotice(`${quote.number} convertido em comanda. Pedido enviado à Fila do Caixa com status AGUARDANDO_CAIXA.`);
  }

  function printQuotation(quote: Quotation) {
    setPrintQuote(quote);
    window.setTimeout(() => window.print(), 100);
  }

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Pré-vendas</p>
            <h1 className="mt-1 text-2xl font-bold">Gestão de Orçamentos &amp; Pré-Vendas</h1>
          </div>
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700">
            <PackagePlus className="h-4 w-4" /> Novo Orçamento
          </button>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Orçamentos abertos" value={String(openQuotes.length)} icon={<Clock3 />} tone="violet" />
          <Metric label="Valor em propostas" value={currency.format(proposals)} icon={<TrendingUp />} tone="emerald" />
          <Metric label="Taxa de conversão" value={`${conversion.toFixed(1)}%`} icon={<CheckCircle2 />} tone="blue" />
          <Metric label="Orçamentos vencidos" value={String(expired)} icon={<AlertTriangle />} tone="rose" />
        </section>

        {notice && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
            <Send className="h-4 w-4 shrink-0" /> {notice}
            <button type="button" onClick={() => setNotice("")} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        <section className="mt-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3">
          <FilterSelect label="Vendedor" value={sellerFilter} options={SELLERS} onChange={setSellerFilter} />
          <FilterSelect label="Cliente" value={customerFilter} options={CUSTOMERS} onChange={setCustomerFilter} />
          <label className="text-xs font-bold">Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "TODOS" | QuotationStatus)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="TODOS">Todos</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Nº Orçamento</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Emissão</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Valor Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-4 py-4 font-bold text-violet-600 dark:text-violet-400">{quote.number}</td>
                    <td className="px-4 py-4 font-semibold">{quote.customer}</td>
                    <td className="px-4 py-4">{quote.seller}</td>
                    <td className="px-4 py-4">{new Date(`${quote.issuedAt}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-4"><ValidityDays days={quote.validityDays} /></td>
                    <td className="px-4 py-4 font-bold">{currency.format(quote.total)}</td>
                    <td className="px-4 py-4"><StatusBadge status={quote.status} /></td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {quote.status === "ABERTO" && (
                          <button type="button" onClick={() => convertQuotation(quote)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-700">
                            Transformar em Comanda/Venda
                          </button>
                        )}
                        <button type="button" onClick={() => printQuotation(quote)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-[10px] font-bold dark:border-zinc-700">
                          <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Nenhum orçamento encontrado.</p>}
          </div>
        </section>

        <footer className="py-7 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>

      {printQuote && (
        <section className="hidden bg-white p-10 text-black print:block print:p-0">
          <header className="border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold">MatCom Materiais de Construção</h1>
            <p className="text-xs">Orçamento comercial · {printQuote.number}</p>
            <p className="mt-2 text-sm"><strong>Cliente:</strong> {printQuote.customer}</p>
            <p className="text-sm"><strong>Vendedor:</strong> {printQuote.seller}</p>
            <p className="text-sm"><strong>Validade da proposta:</strong> {printQuote.validityDays} dias</p>
          </header>
          <table className="mt-6 w-full border-collapse text-sm">
            <thead><tr className="border-y border-black"><th className="py-2 text-left">Item</th><th className="py-2 text-center">Qtd.</th><th className="py-2 text-right">Unitário</th><th className="py-2 text-right">Total</th></tr></thead>
            <tbody>
              {printQuote.items.map((item) => (
                <tr key={item.description} className="border-b border-zinc-300">
                  <td className="py-2">{item.description}</td><td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{currency.format(item.unitPrice)}</td>
                  <td className="py-2 text-right">{currency.format(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 text-right text-lg font-bold">Total: {currency.format(printQuote.total)}</div>
          <p className="mt-8 text-sm"><strong>Condição de pagamento:</strong> {printQuote.payment}</p>
          <p className="mt-3 text-xs">Preços e condições válidos pelo prazo informado nesta proposta.</p>
          <footer className="mt-16 border-t border-black pt-3 text-center text-[10px]">Criado por BCTech | Josemar Brito | Whatsapp 11972646617</footer>
        </section>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden">
          <form onSubmit={createQuotation} className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Nova proposta</p><h2 className="mt-1 text-lg font-bold">Novo Orçamento</h2></div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-xs font-bold">Cliente
                <select value={customer} onChange={(event) => setCustomer(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">{CUSTOMERS.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <div>
                <label className="text-xs font-bold" htmlFor="quotation-product-search">Produto</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
                  <input id="quotation-product-search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar nome ou código" className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
                </div>
                <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  {visibleProducts.map((product) => (
                    <button key={product.id} type="button" onClick={() => setSelectedProduct(product.id)} className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${selectedProduct === product.id ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
                      <span><strong>{product.code}</strong> · {product.name}</span>
                      <span className="font-bold">{currency.format(priceTable === "ATACADO" ? product.wholesale : product.retail)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">Tabela de preço
                  <select value={priceTable} onChange={(event) => setPriceTable(event.target.value as PriceTable)} className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"><option>VAREJO</option><option>ATACADO</option></select>
                </label>
                <label className="text-xs font-bold">Quantidade
                  <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
                </label>
              </div>
              {priceTable === "ATACADO" && quantity < (PRODUCTS.find((item) => item.id === selectedProduct)?.wholesaleMin ?? 10) && (
                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0" />Quantidade mínima do Atacado não atingida; o sistema aplicará o Varejo.</div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">Condição de pagamento
                  <select value={payment} onChange={(event) => setPayment(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
                    <option>PIX à vista</option><option>Dinheiro à vista</option><option>Cartão até 12x</option><option>Boleto 30/60 dias</option><option>Crediário 30/60/90 dias</option>
                  </select>
                </label>
                <label className="text-xs font-bold">Validade do preço (dias)
                  <input type="number" min="1" value={validity} onChange={(event) => setValidity(Number(event.target.value))} className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
                </label>
              </div>
            </div>
            <div className="flex gap-3 border-t border-zinc-200 p-5 dark:border-zinc-800">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-zinc-300 py-3 text-xs font-bold dark:border-zinc-700">Cancelar</button>
              <button type="submit" className="flex-1 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-700">Criar Orçamento</button>
            </div>
          </form>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </main>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold">{label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
        <option value="TODOS">Todos</option>
        {options.map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: ReactNode; tone: "violet" | "emerald" | "blue" | "rose" }) {
  const tones = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    rose: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  };
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div><div className={`rounded-xl p-2.5 [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}>{icon}</div></div>
    </article>
  );
}

function StatusBadge({ status }: { status: QuotationStatus }) {
  const classes = {
    ABERTO: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    CONVERTIDO: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    EXPIRADO: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    CANCELADO: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${classes[status]}`}>{STATUS_LABELS[status]}</span>;
}

function ValidityDays({ days }: { days: number }) {
  return <span className={`font-semibold ${days <= 3 ? "text-red-600 dark:text-red-400" : ""}`}>{days > 0 ? `${days} dias restantes` : "Vencido hoje"}</span>;
}
