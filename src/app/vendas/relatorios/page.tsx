"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Download,
  PackageSearch,
  Printer,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

type ReportTab = "vendedores" | "abc" | "pagamentos" | "canais";
type Period = "HOJE" | "7_DIAS" | "MES" | "PERSONALIZADO";
type CustomerProfile = "TODOS" | "VAREJO" | "ATACADO";

interface SellerPerformance {
  seller: string;
  orders: number;
  total: number;
  commission: number;
}

interface AbcProduct {
  product: string;
  sku: string;
  quantity: number;
  revenue: number;
  margin: number;
  share: number;
}

const SELLER_DATA: SellerPerformance[] = [
  { seller: "Ana Paula", orders: 48, total: 128450, commission: 2569 },
  { seller: "Carlos Lima", orders: 39, total: 96780, commission: 1935.6 },
  { seller: "Bruno Lima", orders: 31, total: 82120, commission: 1642.4 },
];

const ABC_DATA: AbcProduct[] = [
  { product: "Cimento CP II 50 kg", sku: "CIM-001", quantity: 1840, revenue: 83912, margin: 24, share: 27.4 },
  { product: "Vergalhão CA-50 10 mm", sku: "VER-007", quantity: 1220, revenue: 78438, margin: 18.5, share: 25.6 },
  { product: "Argamassa AC-III 20 kg", sku: "ARG-006", quantity: 1325, revenue: 61215, margin: 16.2, share: 20 },
  { product: "Tela soldada Q-138", sku: "TEL-008", quantity: 148, revenue: 31850, margin: 21, share: 10.4 },
  { product: "Tubo PVC 100 mm", sku: "HID-014", quantity: 310, revenue: 29012, margin: 19.4, share: 9.5 },
  { product: "Cabo flexível 2,5 mm", sku: "ELE-021", quantity: 52, revenue: 17846, margin: 15.5, share: 5.8 },
];

const PAYMENTS = [
  { name: "PIX", value: 92580, share: 30.2 },
  { name: "Cartão Débito", value: 44210, share: 14.4 },
  { name: "Cartão Crédito", value: 68940, share: 22.5 },
  { name: "Dinheiro em Espécie", value: 28680, share: 9.4 },
  { name: "Crediário / Fiado", value: 71990, share: 23.5 },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function abcClass(index: number) {
  if (index < 2) return "A";
  if (index < 4) return "B";
  return "C";
}

export default function RelatoriosVendasPage() {
  const [period, setPeriod] = useState<Period>("MES");
  const [seller, setSeller] = useState("TODOS");
  const [profile, setProfile] = useState<CustomerProfile>("TODOS");
  const [tab, setTab] = useState<ReportTab>("vendedores");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-08");
  const [notice, setNotice] = useState("");

  const totalSales = useMemo(
    () => SELLER_DATA.reduce((sum, item) => sum + item.total, 0),
    [],
  );
  const totalOrders = useMemo(
    () => SELLER_DATA.reduce((sum, item) => sum + item.orders, 0),
    [],
  );
  const commissions = SELLER_DATA.reduce((sum, item) => sum + item.commission, 0);
  const ticketAverage = totalOrders ? totalSales / totalOrders : 0;

  function exportCsv() {
    const rows = [
      ["Relatório", "Valor"],
      ["Faturamento total", totalSales.toFixed(2)],
      ["Pedidos concluídos", String(totalOrders)],
      ["Ticket médio", ticketAverage.toFixed(2)],
      ["Comissões", commissions.toFixed(2)],
      [],
      ["Vendedor", "Pedidos", "Faturado", "Comissão"],
      ...SELLER_DATA.map((item) => [item.seller, String(item.orders), item.total.toFixed(2), item.commission.toFixed(2)]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio-vendas-matcom.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Relatório CSV exportado com sucesso.");
  }

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "vendedores", label: "Desempenho por Vendedor" },
    { key: "abc", label: "Curva ABC de Produtos" },
    { key: "pagamentos", label: "Vendas por Forma de Pagamento" },
    { key: "canais", label: "Varejo vs. Atacado" },
  ];

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
              Business Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold">Relatórios Gerenciais &amp; Inteligência de Vendas</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 px-3 text-xs font-bold dark:border-zinc-700 print:hidden">
              <Printer className="h-4 w-4" /> PDF / Imprimir
            </button>
            <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700 print:hidden">
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
          </div>
        </div>

        <section className="mt-5 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:grid-cols-[1fr_1fr_1fr_auto] print:hidden">
          <label className="text-xs font-bold">
            Intervalo
            <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="HOJE">Hoje</option>
              <option value="7_DIAS">Últimos 7 dias</option>
              <option value="MES">Este Mês</option>
              <option value="PERSONALIZADO">Personalizado</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Vendedor
            <select value={seller} onChange={(event) => setSeller(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="TODOS">Todos os vendedores</option>
              <option>Ana Paula</option>
              <option>Carlos Lima</option>
              <option>Bruno Lima</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Perfil de cliente
            <select value={profile} onChange={(event) => setProfile(event.target.value as CustomerProfile)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="TODOS">Todos</option>
              <option value="VAREJO">Varejo</option>
              <option value="ATACADO">Atacado</option>
            </select>
          </label>
          {period === "PERSONALIZADO" ? (
            <div className="grid grid-cols-2 gap-2 lg:col-span-3">
              <label className="text-xs font-bold">De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" /></label>
              <label className="text-xs font-bold">Até<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" /></label>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 text-xs dark:bg-zinc-950">
              <CalendarDays className="h-4 w-4 text-violet-500" />
              {period === "HOJE" ? "08 nov 2026" : period === "7_DIAS" ? "02–08 nov 2026" : "Novembro de 2026"}
            </div>
          )}
        </section>

        {notice && (
          <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 print:hidden">
            {notice}
          </div>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Faturamento no período" value={currency.format(totalSales)} icon={<TrendingUp />} tone="violet" />
          <Kpi label="Pedidos concluídos" value={String(totalOrders)} icon={<ShoppingBag />} tone="emerald" />
          <Kpi label="Ticket médio" value={currency.format(ticketAverage)} icon={<Store />} tone="blue" />
          <Kpi label="Comissões geradas" value={currency.format(commissions)} icon={<Users />} tone="amber" />
        </section>

        <div className="mt-5 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 print:hidden">
          <div className="flex min-w-max gap-6">
            {tabs.map((item) => (
              <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`border-b-2 py-3 text-xs font-bold ${tab === item.key ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400" : "border-transparent text-zinc-500 dark:text-zinc-400"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "vendedores" && <SellerReport data={SELLER_DATA} max={Math.max(...SELLER_DATA.map((item) => item.total))} />}
        {tab === "abc" && <AbcReport />}
        {tab === "pagamentos" && <PaymentsReport />}
        {tab === "canais" && <ChannelsReport />}

        <footer className="py-7 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { background: white !important; }
        }
      `}</style>
    </main>
  );
}

function SellerReport({ data, max }: { data: SellerPerformance[]; max: number }) {
  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <ReportTable title="Desempenho por vendedor">
        <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          <tr><th className="px-4 py-3">Vendedor</th><th className="px-4 py-3">Vendas</th><th className="px-4 py-3">Ticket médio</th><th className="px-4 py-3">Total faturado</th><th className="px-4 py-3">Comissão</th></tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {data.map((item) => (
            <tr key={item.seller}><td className="px-4 py-4 font-bold">{item.seller}</td><td className="px-4 py-4">{item.orders}</td><td className="px-4 py-4">{currency.format(item.orders ? item.total / item.orders : 0)}</td><td className="px-4 py-4 font-bold">{currency.format(item.total)}</td><td className="px-4 py-4 text-emerald-600 dark:text-emerald-400">{currency.format(item.commission)}</td></tr>
          ))}
        </tbody>
      </ReportTable>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-sm font-bold"><BarChart3 className="h-4 w-4 text-violet-500" /> Faturamento comparativo</div>
        <div className="mt-5 space-y-5">
          {data.map((item) => (
            <div key={item.seller}><div className="mb-1 flex justify-between text-xs"><span>{item.seller}</span><strong>{currency.format(item.total)}</strong></div><div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-violet-600" style={{ width: `${(item.total / max) * 100}%` }} /></div></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AbcReport() {
  return (
    <ReportTable title="Curva ABC de produtos">
      <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
        <tr><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Produto / SKU</th><th className="px-4 py-3">Qtd. vendida</th><th className="px-4 py-3">Faturamento</th><th className="px-4 py-3">% faturamento</th><th className="px-4 py-3">Margem</th></tr>
      </thead>
      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {ABC_DATA.map((item, index) => (
          <tr key={item.sku}><td className="px-4 py-4"><ClassBadge value={abcClass(index)} /></td><td className="px-4 py-4"><p className="font-bold">{item.product}</p><p className="mt-1 text-[10px] text-zinc-500">{item.sku}</p></td><td className="px-4 py-4">{item.quantity.toLocaleString("pt-BR")}</td><td className="px-4 py-4 font-bold">{currency.format(item.revenue)}</td><td className="px-4 py-4">{item.share.toFixed(1)}%</td><td className="px-4 py-4 text-emerald-600 dark:text-emerald-400">{item.margin.toFixed(1)}%</td></tr>
        ))}
      </tbody>
    </ReportTable>
  );
}

function PaymentsReport() {
  const total = PAYMENTS.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
      <ReportTable title="Vendas por forma de pagamento">
        <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          <tr><th className="px-4 py-3">Forma</th><th className="px-4 py-3">Faturamento</th><th className="px-4 py-3">Participação</th></tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {PAYMENTS.map((item) => <tr key={item.name}><td className="px-4 py-4 font-bold"><CreditCard className="mr-2 inline h-4 w-4 text-violet-500" />{item.name}</td><td className="px-4 py-4 font-bold">{currency.format(item.value)}</td><td className="px-4 py-4">{item.share.toFixed(1)}%</td></tr>)}
        </tbody>
      </ReportTable>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">Total conciliado</p>
        <p className="mt-2 text-2xl font-bold">{currency.format(total)}</p>
      </div>
    </section>
  );
}

function ChannelsReport() {
  const channels = [
    { name: "Varejo / Balcão", volume: 118, revenue: 139870, margin: 22.8 },
    { name: "Atacado", volume: 63, revenue: 167480, margin: 18.4 },
  ];
  return (
    <section className="mt-4 grid gap-4 sm:grid-cols-2">
      {channels.map((item) => (
        <article key={item.name} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-sm font-bold">{item.name === "Atacado" ? <PackageSearch className="h-5 w-5 text-violet-500" /> : <Store className="h-5 w-5 text-emerald-500" />}{item.name}</div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div><p className="text-[10px] uppercase text-zinc-500">Pedidos</p><p className="mt-1 text-lg font-bold">{item.volume}</p></div>
            <div><p className="text-[10px] uppercase text-zinc-500">Faturamento</p><p className="mt-1 text-lg font-bold">{currency.format(item.revenue)}</p></div>
            <div><p className="text-[10px] uppercase text-zinc-500">Margem bruta</p><p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{item.margin}%</p></div>
          </div>
        </article>
      ))}
    </section>
  );
}

function ReportTable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800"><h2 className="text-sm font-bold">{title}</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs">{children}</table></div>
    </section>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: ReactNode; tone: "violet" | "emerald" | "blue" | "amber" }) {
  const tones = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  };
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div><div className={`rounded-xl p-2.5 [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}>{icon}</div></div>
    </article>
  );
}

function ClassBadge({ value }: { value: "A" | "B" | "C" }) {
  const classes = {
    A: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    B: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    C: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-bold ${classes[value]}`}>{value}</span>;
}
