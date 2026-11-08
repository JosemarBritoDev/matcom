"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  PackageCheck,
  Printer,
  Route,
  Truck,
  X,
} from "lucide-react";

type LogisticsStatus =
  | "AGUARDANDO_SEPARACAO"
  | "PRONTO_PARA_CARGA"
  | "EM_TRANSITO"
  | "ENTREGUE";

interface LogisticsItem {
  id: string;
  command: string;
  customer: string;
  address: string;
  neighborhood: string;
  reference: string;
  weight: string;
  seller: string;
  status: LogisticsStatus;
  period: string;
  products: { description: string; quantity: string }[];
}

const ORDERS: LogisticsItem[] = [
  {
    id: "log-1051", command: "#1051", customer: "Construtora Horizonte", address: "Av. das Obras, 850",
    neighborhood: "Centro", reference: "Próximo ao Posto Central", weight: "1.240 kg / 18 vol.",
    seller: "Ana Paula", status: "AGUARDANDO_SEPARACAO", period: "2026-11-08",
    products: [
      { description: "Cimento CP II 50 kg", quantity: "60 sacos" },
      { description: "Argamassa AC-III 20 kg", quantity: "45 sacos" },
    ],
  },
  {
    id: "log-1050", command: "#1050", customer: "Obra Residencial Silva", address: "Rua das Palmeiras, 142",
    neighborhood: "Jardim América", reference: "Portão preto após a esquina", weight: "780 kg / 12 vol.",
    seller: "Carlos Lima", status: "PRONTO_PARA_CARGA", period: "2026-11-08",
    products: [
      { description: "Tubo PVC 100 mm", quantity: "18 unidades" },
      { description: "Conector PVC 100 mm", quantity: "24 unidades" },
    ],
  },
  {
    id: "log-1048", command: "#1048", customer: "Sigma Engenharia", address: "Estrada do Galpão, 2250",
    neighborhood: "Industrial", reference: "Fundo de lote, portaria 2", weight: "3.100 kg / 42 vol.",
    seller: "Bruno Lima", status: "EM_TRANSITO", period: "2026-11-08",
    products: [
      { description: "Vergalhão CA-50 10 mm", quantity: "120 barras" },
      { description: "Arame recozido BWG 18", quantity: "5 kg" },
    ],
  },
  {
    id: "log-1045", command: "#1045", customer: "João Marcos Oliveira", address: "Rua 15 de Novembro, 91",
    neighborhood: "Vila Nova", reference: "Casa térrea azul", weight: "320 kg / 8 vol.",
    seller: "Ana Paula", status: "ENTREGUE", period: "2026-11-08",
    products: [{ description: "Tela soldada Q-138", quantity: "4 unidades" }],
  },
  {
    id: "log-1041", command: "#1041", customer: "Depósito Rocha", address: "Av. Industrial, 410",
    neighborhood: "Industrial", reference: "Ao lado da balança", weight: "2.480 kg / 31 vol.",
    seller: "Carlos Lima", status: "AGUARDANDO_SEPARACAO", period: "2026-11-07",
    products: [
      { description: "Cerâmica piso 60x60", quantity: "80 caixas" },
      { description: "Rejunte cinza 5 kg", quantity: "30 sacos" },
    ],
  },
];

const STATUS_LABELS: Record<LogisticsStatus, string> = {
  AGUARDANDO_SEPARACAO: "Aguardando Separação",
  PRONTO_PARA_CARGA: "Pronto para Carga",
  EM_TRANSITO: "Em Trânsito",
  ENTREGUE: "Entregue",
};

export default function ExpedicaoPage() {
  const [orders, setOrders] = useState(ORDERS);
  const [selected, setSelected] = useState<string[]>([]);
  const [period, setPeriod] = useState("2026-11");
  const [route, setRoute] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | LogisticsStatus>("TODOS");
  const [driver, setDriver] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [deliveryTarget, setDeliveryTarget] = useState<LogisticsItem | null>(null);
  const [receiver, setReceiver] = useState("");
  const [observations, setObservations] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => orders.filter((order) => {
    const matchesRoute = route === "TODAS" ||
      order.neighborhood.toLowerCase().includes(route.toLowerCase());
    const matchesStatus = statusFilter === "TODOS" || order.status === statusFilter;
    const month = order.period.slice(0, 7);
    const matchesPeriod = !period || month === period;
    return matchesRoute && matchesStatus && matchesPeriod;
  }), [orders, route, statusFilter, period]);

  const selectedOrders = orders.filter((order) => selected.includes(order.id));
  const deliveredToday = orders.filter((order) => order.status === "ENTREGUE" && order.period === "2026-11-08").length;

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function generateRomaneio() {
    if (!selectedOrders.length) {
      setNotice("Selecione ao menos um pedido para montar a carga.");
      return;
    }
    if (!driver.trim() || !vehicle.trim()) {
      setNotice("Informe o motorista e a placa do veículo.");
      return;
    }

    setNotice(`Romaneio gerado para ${selectedOrders.length} pedido(s) · ${driver} · ${vehicle.toUpperCase()}`);
    window.setTimeout(() => window.print(), 80);
  }

  function confirmDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deliveryTarget || !receiver.trim()) return;
    setOrders((current) => current.map((order) =>
      order.id === deliveryTarget.id ? { ...order, status: "ENTREGUE" } : order,
    ));
    setNotice(`Entrega da comanda ${deliveryTarget.command} concluída por ${receiver}. ${observations ? `Observações: ${observations}` : ""}`);
    setDeliveryTarget(null);
    setReceiver("");
    setObservations("");
  }

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Logística</p>
            <h1 className="mt-1 text-2xl font-bold">Central de Expedição &amp; Romaneio de Carga</h1>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Route className="h-4 w-4" /> Operação no pátio
          </div>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Entregas pendentes no pátio" value={String(orders.filter((order) => order.status !== "ENTREGUE").length)} icon={<ClipboardCheck />} tone="amber" />
          <Metric label="Cargas em trânsito" value={String(orders.filter((order) => order.status === "EM_TRANSITO").length)} icon={<Truck />} tone="violet" />
          <Metric label="Entregas concluídas hoje" value={String(deliveredToday)} icon={<CheckCircle2 />} tone="emerald" />
          <Metric label="Veículos disponíveis" value="4" icon={<Route />} tone="blue" />
        </section>

        <section className="mt-5 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3">
          <label className="text-xs font-bold">
            Período
            <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label className="text-xs font-bold">
            Rota / Bairro
            <select value={route} onChange={(event) => setRoute(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="TODAS">Todas as rotas</option>
              <option value="Centro">Centro</option>
              <option value="Industrial">Industrial</option>
              <option value="Jardim América">Jardim América</option>
              <option value="Vila Nova">Vila Nova</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Status de entrega
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "TODOS" | LogisticsStatus)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="TODOS">Todos</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </section>

        {notice && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {notice}
          </div>
        )}

        <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-bold">Fila de Separação / Romaneio</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Pedidos configurados para entrega na obra ou endereço de obra.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3"><span className="sr-only">Selecionar</span></th>
                  <th className="px-4 py-3">Comanda / Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Bairro / Endereço</th>
                  <th className="px-4 py-3">Peso / Volume</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Status logística</th>
                  <th className="px-4 py-3 text-right">Baixa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selected.includes(order.id)} onChange={() => toggleSelected(order.id)} disabled={order.status === "ENTREGUE"} className="h-4 w-4 accent-violet-600" aria-label={`Selecionar comanda ${order.command}`} />
                    </td>
                    <td className="px-4 py-4 font-bold">{order.command}</td>
                    <td className="px-4 py-4 font-semibold">{order.customer}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{order.neighborhood}</p>
                      <p className="mt-1 max-w-[260px] text-[10px] text-zinc-500 dark:text-zinc-400">{order.address}</p>
                    </td>
                    <td className="px-4 py-4">{order.weight}</td>
                    <td className="px-4 py-4">{order.seller}</td>
                    <td className="px-4 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-4 text-right">
                      {order.status === "ENTREGUE" ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">CONCLUÍDA</span>
                      ) : (
                        <button type="button" onClick={() => setDeliveryTarget(order)} className="rounded-lg border border-zinc-300 px-3 py-2 font-bold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Confirmar entrega</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Nenhuma entrega encontrada para os filtros selecionados.</p>}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Montagem de Romaneio</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{selected.length} pedido(s) selecionado(s) para esta carga.</p>
            </div>
            <PackageCheck className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs font-bold">Motorista<input value={driver} onChange={(event) => setDriver(event.target.value)} placeholder="Nome do motorista" className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal dark:border-zinc-700 dark:bg-zinc-950" /></label>
            <label className="text-xs font-bold">Placa do veículo<input value={vehicle} onChange={(event) => setVehicle(event.target.value.toUpperCase())} placeholder="ABC1D23" maxLength={8} className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal uppercase dark:border-zinc-700 dark:bg-zinc-950" /></label>
            <button type="button" onClick={generateRomaneio} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700"><Printer className="h-4 w-4" />Gerar Romaneio</button>
          </div>
          {selectedOrders.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedOrders.map((order) => (
                <button key={order.id} type="button" onClick={() => toggleSelected(order.id)} className="rounded-full border border-violet-300 bg-white px-3 py-1 text-[10px] font-bold dark:border-violet-800 dark:bg-zinc-950">
                  {order.command} · {order.neighborhood} <X className="ml-1 inline h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </section>

        <footer className="py-7 text-center text-[10px] text-zinc-400 dark:text-zinc-500">Criado por BCTech | Josemar Brito | Whatsapp 11972646617</footer>
      </div>

      {selectedOrders.length > 0 && (
        <section className="hidden print:block print:p-8">
          <header className="border-b-2 border-black pb-4">
            <h1 className="text-xl font-bold">ROMANEIO DE CARGA — VIA DE PÁTIO</h1>
            <p className="mt-1 text-sm">Motorista: {driver || "________________"} · Veículo: {vehicle || "____________"} · Saída: {new Date().toLocaleString("pt-BR")}</p>
          </header>
          {selectedOrders.map((order) => (
            <article key={order.id} className="break-inside-avoid border-b border-black py-5">
              <h2 className="text-lg font-bold">{order.command} — {order.customer}</h2>
              <p className="mt-1 text-sm"><strong>{order.neighborhood}</strong> · {order.address}</p>
              <p className="mt-1 text-sm"><strong>Ponto de referência:</strong> {order.reference}</p>
              <table className="mt-3 w-full border-collapse text-sm">
                <thead><tr className="border-b border-black"><th className="py-1 text-left">Produto</th><th className="py-1 text-right">Quantidade</th></tr></thead>
                <tbody>{order.products.map((product) => <tr key={product.description} className="border-b border-zinc-300"><td className="py-1">{product.description}</td><td className="py-1 text-right">{product.quantity}</td></tr>)}</tbody>
              </table>
            </article>
          ))}
          <footer className="mt-8 flex justify-between gap-8 pt-8 text-xs">
            <div className="w-1/2 border-t border-black pt-2 text-center">Conferente do Pátio</div>
            <div className="w-1/2 border-t border-black pt-2 text-center">Motorista / Recebimento da carga</div>
          </footer>
          <p className="mt-8 text-center text-[10px]">Criado por BCTech | Josemar Brito | Whatsapp 11972646617</p>
        </section>
      )}

      {deliveryTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden">
          <form onSubmit={confirmDelivery} className="w-full rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Baixa de Pátio</p><h2 className="mt-1 text-lg font-bold">Confirmar entrega {deliveryTarget.command}</h2></div>
              <button type="button" onClick={() => setDeliveryTarget(null)} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex gap-2 rounded-xl bg-zinc-100 p-3 text-xs dark:bg-zinc-950"><MapPin className="h-4 w-4 shrink-0 text-violet-500" /><span><strong>{deliveryTarget.customer}</strong><br />{deliveryTarget.address}</span></div>
              <label className="block text-xs font-bold">Nome do recebedor na obra
                <input required value={receiver} onChange={(event) => setReceiver(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label className="block text-xs font-bold">Observações de descarregamento
                <textarea value={observations} onChange={(event) => setObservations(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-xl border border-zinc-300 bg-white p-3 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <p className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400"><Clock3 className="h-4 w-4" />Data/hora da baixa: {new Date().toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex gap-3 border-t border-zinc-200 p-5 dark:border-zinc-800">
              <button type="button" onClick={() => setDeliveryTarget(null)} className="flex-1 rounded-xl border border-zinc-300 py-3 text-xs font-bold dark:border-zinc-700">Cancelar</button>
              <button type="submit" className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700">Confirmar entrega</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: ReactNode; tone: "amber" | "violet" | "emerald" | "blue" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  };
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><div className={`rounded-xl p-2.5 [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}>{icon}</div></div>
    </article>
  );
}

function StatusBadge({ status }: { status: LogisticsStatus }) {
  const classes = {
    AGUARDANDO_SEPARACAO: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    PRONTO_PARA_CARGA: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    EM_TRANSITO: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    ENTREGUE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${classes[status]}`}>{STATUS_LABELS[status]}</span>;
}
