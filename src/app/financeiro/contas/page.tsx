"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  LockKeyhole,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

type FinanceTab = "pagar" | "receber" | "dre";
type TitleStatus = "PENDENTE" | "PAGO" | "ATRASADO";

interface Payable {
  id: string;
  supplier: string;
  supplierDocument: string;
  nfe: string;
  dueDate: string;
  value: number;
  status: TitleStatus;
}

interface Receivable {
  id: string;
  customer: string;
  command: string;
  dueDate: string;
  value: number;
  status: TitleStatus;
}

const INITIAL_PAYABLES: Payable[] = [
  {
    id: "pg-001",
    supplier: "Distribuidora Forte Materiais",
    supplierDocument: "12.345.678/0001-90",
    nfe: "NF-e 001011",
    dueDate: "2026-11-08",
    value: 7620.25,
    status: "PENDENTE",
  },
  {
    id: "pg-002",
    supplier: "Aço & Ferro Industrial",
    supplierDocument: "23.456.789/0001-12",
    nfe: "NF-e 000882",
    dueDate: "2026-11-03",
    value: 4380,
    status: "ATRASADO",
  },
  {
    id: "pg-003",
    supplier: "Cerâmica Delta",
    supplierDocument: "34.567.890/0001-34",
    nfe: "NF-e 000219",
    dueDate: "2026-11-18",
    value: 1890.6,
    status: "PENDENTE",
  },
  {
    id: "pg-004",
    supplier: "Tintas Aurora",
    supplierDocument: "45.678.901/0001-56",
    nfe: "NF-e 000645",
    dueDate: "2026-11-01",
    value: 1225.8,
    status: "PAGO",
  },
];

const INITIAL_RECEIVABLES: Receivable[] = [
  {
    id: "rc-001",
    customer: "Construtora Horizonte",
    command: "#1048",
    dueDate: "2026-11-12",
    value: 8350,
    status: "PENDENTE",
  },
  {
    id: "rc-002",
    customer: "Carlos Eduardo Souza",
    command: "#1042",
    dueDate: "2026-11-04",
    value: 2840.75,
    status: "ATRASADO",
  },
  {
    id: "rc-003",
    customer: "Obras Sigma Ltda.",
    command: "#1039",
    dueDate: "2026-11-22",
    value: 6320,
    status: "PENDENTE",
  },
  {
    id: "rc-004",
    customer: "Ana Paula Mendes",
    command: "#1034",
    dueDate: "2026-11-05",
    value: 985.2,
    status: "PAGO",
  },
];

const ACCOUNTS = [
  { id: "caixa", label: "Caixa da Loja" },
  { id: "banco-principal", label: "Banco Itaú · Conta principal" },
  { id: "banco-reserva", label: "Banco Bradesco · Reserva" },
  { id: "pix", label: "Conta digital / PIX" },
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function brl(value: number) {
  return currency.format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function ContasFinanceirasPage() {
  const [tab, setTab] = useState<FinanceTab>("pagar");
  const [payables, setPayables] = useState(INITIAL_PAYABLES);
  const [receivables, setReceivables] = useState(INITIAL_RECEIVABLES);
  const [settlementTarget, setSettlementTarget] = useState<
    ((Payable | Receivable) & { type: "pagar" | "receber" }) | null
  >(null);
  const [account, setAccount] = useState(ACCOUNTS[0].id);
  const [interest, setInterest] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [managerPin, setManagerPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [period, setPeriod] = useState("2026-11");

  const currentBalance = 248750.35;
  const receivableMonth = receivables
    .filter((item) => item.status !== "PAGO")
    .reduce((sum, item) => sum + item.value, 0);
  const payableMonth = payables
    .filter((item) => item.status !== "PAGO")
    .reduce((sum, item) => sum + item.value, 0);
  const overdueReceivable = receivables.filter(
    (item) => item.status === "ATRASADO",
  ).reduce((sum, item) => sum + item.value, 0);
  const delinquency =
    receivables.reduce((sum, item) => sum + item.value, 0) > 0
      ? (overdueReceivable /
          receivables.reduce((sum, item) => sum + item.value, 0)) *
        100
      : 0;

  const calculation = useMemo(() => {
    const amount = settlementTarget?.value ?? 0;
    const interestValue = Math.max(0, Number(interest) || 0);
    const discountValue = Math.max(0, Number(discount) || 0);
    return {
      amount,
      interestValue,
      discountValue,
      total: amount + interestValue - discountValue,
    };
  }, [settlementTarget, interest, discount]);

  function openSettlement(target: Payable | Receivable, type: "pagar" | "receber") {
    const amount = target.value;
    const dueDate = new Date(`${target.dueDate}T12:00:00`);
    const today = new Date();
    const difference = Math.floor(
      (today.getTime() - dueDate.getTime()) / 86_400_000,
    );
    const automaticInterest =
      difference > 0 && type === "receber" ? amount * 0.01 * Math.min(difference, 30) : 0;
    const automaticDiscount =
      difference < 0 ? amount * 0.01 : 0;

    setSettlementTarget({ ...target, type });
    setInterest(automaticInterest.toFixed(2));
    setDiscount(automaticDiscount.toFixed(2));
    setAccount(ACCOUNTS[0].id);
    setManagerPin("");
    setError("");
    setSuccess("");
  }

  function closeSettlement() {
    setSettlementTarget(null);
    setManagerPin("");
    setError("");
  }

  function submitSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settlementTarget) return;

    if (calculation.total > 5000 && managerPin !== "1357") {
      setError("Baixas acima de R$ 5.000 exigem o PIN de um gerente autorizado.");
      return;
    }

    if (settlementTarget.type === "pagar") {
      setPayables((current) =>
        current.map((item) =>
          item.id === settlementTarget.id ? { ...item, status: "PAGO" } : item,
        ),
      );
    } else {
      setReceivables((current) =>
        current.map((item) =>
          item.id === settlementTarget.id ? { ...item, status: "PAGO" } : item,
        ),
      );
    }
    setSuccess(
      `Baixa registrada por ${brl(calculation.total)} em ${ACCOUNTS.find((item) => item.id === account)?.label}.`,
    );
    closeSettlement();
  }

  const tabs: { key: FinanceTab; label: string }[] = [
    { key: "pagar", label: "Contas a Pagar" },
    { key: "receber", label: "Contas a Receber" },
    { key: "dre", label: "DRE Gerencial" },
  ];

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
              Tesouraria
            </p>
            <h1 className="mt-1 text-2xl font-bold">Contas &amp; Financeiro</h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Liquidação, fluxo de caixa e resultado gerencial.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <CalendarDays className="h-4 w-4 text-violet-500" aria-hidden />
            Período
            <input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="bg-transparent font-bold outline-none"
            />
          </label>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Saldo em Caixa/Bancos"
            value={brl(currentBalance)}
            detail="Saldo conciliado"
            icon={<Landmark className="h-5 w-5" />}
            tone="violet"
          />
          <Kpi
            label="A Receber no Mês"
            value={brl(receivableMonth)}
            detail={`${receivables.filter((item) => item.status !== "PAGO").length} títulos abertos`}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="emerald"
          />
          <Kpi
            label="A Pagar no Mês"
            value={brl(payableMonth)}
            detail={`${payables.filter((item) => item.status !== "PAGO").length} títulos abertos`}
            icon={<TrendingDown className="h-5 w-5" />}
            tone="amber"
          />
          <Kpi
            label="Inadimplência do Crediário"
            value={`${delinquency.toFixed(1)}%`}
            detail={brl(overdueReceivable)}
            icon={<CircleDollarSign className="h-5 w-5" />}
            tone="rose"
          />
        </section>

        <div className="mt-5 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex min-w-max gap-6">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`border-b-2 px-1 py-3 text-xs font-bold ${
                  tab === item.key
                    ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {success && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {success}
            <button type="button" onClick={() => setSuccess("")} className="ml-auto">
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Fechar</span>
            </button>
          </div>
        )}

        {tab === "pagar" && (
          <PayablesTable
            payables={payables}
            onSettle={(item) => openSettlement(item, "pagar")}
          />
        )}
        {tab === "receber" && (
          <ReceivablesTable
            receivables={receivables}
            onReceive={(item) => openSettlement(item, "receber")}
          />
        )}
        {tab === "dre" && <Dre period={period} />}

        <footer className="py-7 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>

      {settlementTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={submitSettlement}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-start justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                  Liquidação financeira
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  {settlementTarget.type === "pagar" ? "Dar baixa" : "Registrar recebimento"}
                </h2>
              </div>
              <button type="button" onClick={closeSettlement} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-5 w-5" aria-hidden />
                <span className="sr-only">Fechar</span>
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-950">
                <p className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">
                  {settlementTarget.type === "pagar" ? "Fornecedor" : "Cliente"}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {"supplier" in settlementTarget
                    ? settlementTarget.supplier
                    : settlementTarget.customer}
                </p>
                {"supplierDocument" in settlementTarget && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    CNPJ {settlementTarget.supplierDocument} · {settlementTarget.nfe}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="finance-account" className="text-xs font-bold">
                  Conta / Caixa de {settlementTarget.type === "pagar" ? "origem" : "destino"}
                </label>
                <select
                  id="finance-account"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {ACCOUNTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="interest"
                  label="Juros (R$)"
                  value={interest}
                  onChange={setInterest}
                />
                <NumberField
                  id="discount"
                  label="Desconto (R$)"
                  value={discount}
                  onChange={setDiscount}
                />
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                <AmountLine label="Valor do título" value={brl(calculation.amount)} />
                <AmountLine label="Juros por pontualidade/atraso" value={brl(calculation.interestValue)} color="text-red-600 dark:text-red-400" />
                <AmountLine label="Desconto concedido" value={`- ${brl(calculation.discountValue)}`} color="text-emerald-600 dark:text-emerald-400" />
                <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <span className="font-bold">Total da liquidação</span>
                  <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                    {brl(calculation.total)}
                  </span>
                </div>
              </div>

              {calculation.total > 5000 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex gap-2">
                    <LockKeyhole className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                    <div>
                      <p className="text-xs font-bold">Autorização do Gerente necessária</p>
                      <label htmlFor="manager-pin" className="mt-2 block text-[11px] font-semibold">
                        PIN / Senha
                      </label>
                      <input
                        id="manager-pin"
                        type="password"
                        value={managerPin}
                        onChange={(event) => {
                          setManagerPin(event.target.value);
                          setError("");
                        }}
                        maxLength={12}
                        className="mt-1 h-10 w-full rounded-lg border border-amber-400 bg-white px-3 text-sm tracking-widest dark:border-amber-800 dark:bg-zinc-950"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-zinc-200 p-5 dark:border-zinc-800">
              <button type="button" onClick={closeSettlement} className="flex-1 rounded-xl border border-zinc-300 py-3 text-xs font-bold dark:border-zinc-700">
                Cancelar
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-700">
                Confirmar baixa
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Kpi({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "violet" | "emerald" | "amber" | "rose";
}) {
  const toneClasses = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  };

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-xl font-bold">{value}</p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{detail}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${toneClasses[tone]}`}>{icon}</div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: TitleStatus }) {
  const classes = {
    PENDENTE: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    PAGO: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    ATRASADO: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${classes[status]}`}>
      {status}
    </span>
  );
}

function PayablesTable({
  payables,
  onSettle,
}: {
  payables: Payable[];
  onSettle: (item: Payable) => void;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-bold">Contas a Pagar</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">NF-e de Origem</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {payables.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <p className="font-bold">{item.supplier}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">CNPJ {item.supplierDocument}</p>
                </td>
                <td className="px-4 py-4 font-semibold">{item.nfe}</td>
                <td className="px-4 py-4">{formatDate(item.dueDate)}</td>
                <td className="px-4 py-4 font-bold">{brl(item.value)}</td>
                <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-4 text-right">
                  {item.status === "PAGO" ? (
                    <span className="text-[10px] font-bold text-zinc-400">LIQUIDADO</span>
                  ) : (
                    <button type="button" onClick={() => onSettle(item)} className="rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-violet-700">
                      Dar baixa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReceivablesTable({
  receivables,
  onReceive,
}: {
  receivables: Receivable[];
  onReceive: (item: Receivable) => void;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-bold">Contas a Receber</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Comanda de Origem</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {receivables.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4 font-bold">{item.customer}</td>
                <td className="px-4 py-4 font-semibold">{item.command}</td>
                <td className="px-4 py-4">{formatDate(item.dueDate)}</td>
                <td className="px-4 py-4 font-bold">{brl(item.value)}</td>
                <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-4 text-right">
                  {item.status === "PAGO" ? (
                    <span className="text-[10px] font-bold text-zinc-400">RECEBIDO</span>
                  ) : (
                    <button type="button" onClick={() => onReceive(item)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-700">
                      Registrar recebimento
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Dre({ period }: { period: string }) {
  const values = [
    { label: "Receita Bruta", value: 486420.8, type: "positive" },
    { label: "(-) Custo de Estoque Vendido (COGS)", value: -302480.15, type: "negative" },
    { label: "Margem Bruta", value: 183940.65, type: "subtotal" },
    { label: "(-) Despesas Operacionais e Administrativas", value: -98420.3, type: "negative" },
    { label: "Lucro Líquido do Período", value: 85520.35, type: "result" },
  ];

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold">DRE Gerencial</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Competência de {period}</p>
        </div>
        <ReceiptText className="h-5 w-5 text-violet-500" aria-hidden />
      </div>
      <div className="p-4">
        {values.map((item) => (
          <div
            key={item.label}
            className={"flex items-center justify-between border-b border-zinc-100 py-4 text-sm dark:border-zinc-800 " +
              (item.type === "result"
                ? "mt-2 border-none rounded-xl bg-violet-50 px-4 dark:bg-violet-950/30"
                : item.type === "subtotal" ? "font-bold" : "")}
          >
            <span className={item.type === "result" ? "font-bold" : "text-zinc-600 dark:text-zinc-300"}>{item.label}</span>
            <span className={"font-bold " + (item.value < 0 ? "text-red-600 dark:text-red-400" : item.type === "result" ? "text-violet-600 dark:text-violet-400" : "")}>
              {brl(item.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-3 border-t border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
          <p className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">Margem líquida</p>
          <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">17,6%</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
          <p className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">Margem bruta</p>
          <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">37,8%</p>
        </div>
      </div>
    </section>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold">{label}</label>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
    </div>
  );
}

function AmountLine({
  label,
  value,
  color = "",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="mt-2 flex justify-between text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={"font-bold " + color}>{value}</span>
    </div>
  );
}
