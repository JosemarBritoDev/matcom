"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck2,
  Filter,
  Landmark,
  RotateCcw,
  Search,
  ShieldCheck,
  Tag,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

type ManagerRole = "GERENTE_LOJA" | "SUPER_ADMIN";
type RequestType =
  | "ATACADO"
  | "DESCONTO_EXTRA"
  | "CREDIARIO"
  | "ESTORNO";
type RequestStatus = "PENDENTE" | "APROVADA" | "REJEITADA";

interface ApprovalRequest {
  id: string;
  code: string;
  type: RequestType;
  customer: string;
  requesterName: string;
  requesterId: string;
  originalValue: number;
  proposedValue: number;
  originalDiscount: number;
  proposedDiscount: number;
  justification: string;
  requestedAt: string;
}

interface AuditEntry {
  id: string;
  request: ApprovalRequest;
  status: Exclude<RequestStatus, "PENDENTE">;
  responsible: string;
  resolvedAt: string;
  justification: string;
}

const CURRENT_MANAGER = {
  id: "usr-gerente-01",
  name: "Gerente MatCom",
  role: "GERENTE_LOJA" as ManagerRole,
  registration: "GL-001",
  pin: "1975",
};

const TYPE_LABELS: Record<RequestType, string> = {
  ATACADO: "Tabela de Atacado",
  DESCONTO_EXTRA: "Desconto Extra (>10%)",
  CREDIARIO: "Crediário / Limite",
  ESTORNO: "Estorno / Cancelamento",
};

const TYPE_ICONS: Record<RequestType, typeof Tag> = {
  ATACADO: Tag,
  DESCONTO_EXTRA: FileCheck2,
  CREDIARIO: CreditCard,
  ESTORNO: RotateCcw,
};

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: "apr-1",
    code: "1051",
    type: "ATACADO",
    customer: "Construtora Horizonte Ltda.",
    requesterName: "Ana Paula",
    requesterId: "usr-vend-0042",
    originalValue: 6240,
    proposedValue: 6240,
    originalDiscount: 0,
    proposedDiscount: 8,
    justification: "Volume recorrente e projeção de 40 pedidos no trimestre.",
    requestedAt: "08/11/2026 15:42",
  },
  {
    id: "apr-2",
    code: "1053",
    type: "DESCONTO_EXTRA",
    customer: "Reforma Fácil Materiais",
    requesterName: "Ana Paula",
    requesterId: "usr-vend-0042",
    originalValue: 8950,
    proposedValue: 8047,
    originalDiscount: 10,
    proposedDiscount: 12,
    justification: "Fechamento imediato e pagamento à vista.",
    requestedAt: "08/11/2026 15:18",
  },
  {
    id: "apr-3",
    code: "1055",
    type: "CREDIARIO",
    customer: "Obra Nova Engenharia",
    requesterName: "Diego Rocha",
    requesterId: "usr-vend-0069",
    originalValue: 18200,
    proposedValue: 18200,
    originalDiscount: 5,
    proposedDiscount: 5,
    justification: "Limite atual de R$ 25.000 e histórico regular há 18 meses.",
    requestedAt: "08/11/2026 14:51",
  },
  {
    id: "apr-4",
    code: "1048",
    type: "ESTORNO",
    customer: "Carlos Eduardo Martins",
    requesterName: "Gerente MatCom",
    requesterId: CURRENT_MANAGER.id,
    originalValue: 1160,
    proposedValue: 1160,
    originalDiscount: 0,
    proposedDiscount: 0,
    justification: "Cancelamento solicitado por divergência na entrega dos blocos.",
    requestedAt: "08/11/2026 14:22",
  },
];

const INITIAL_HISTORY: AuditEntry[] = [
  {
    id: "aud-1",
    request: {
      ...INITIAL_REQUESTS[1],
      id: "apr-hist-1",
      code: "1042",
      customer: "Casa Nova Construções",
      requesterName: "Bruno Lima",
      originalValue: 4200,
      proposedValue: 3906,
      proposedDiscount: 7,
    },
    status: "APROVADA",
    responsible: "Gerente MatCom",
    resolvedAt: "08/11/2026 13:06",
    justification: "Desconto concedido dentro da margem mensal.",
  },
  {
    id: "aud-2",
    request: {
      ...INITIAL_REQUESTS[3],
      id: "apr-hist-2",
      code: "1040",
      type: "ESTORNO",
      customer: "Maria Aparecida Silva",
      requesterName: "Bruno Lima",
    },
    status: "REJEITADA",
    responsible: "Super Admin MatCom",
    resolvedAt: "08/11/2026 11:49",
    justification: "Aguardando conferência fiscal do item antes do estorno.",
  },
];

const FILTERS: Array<{ id: "TODAS" | RequestType; label: string }> = [
  { id: "TODAS", label: "Todas" },
  { id: "ATACADO", label: "Tabelas de Atacado" },
  { id: "DESCONTO_EXTRA", label: "Desconto Extra (>10%)" },
  { id: "CREDIARIO", label: "Crediário / Limite" },
  { id: "ESTORNO", label: "Estornos / Cancelamentos" },
];

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBRL(value: number) {
  return brlFormatter.format(value);
}

export default function GerenciaAprovacoesPage() {
  const [requests, setRequests] =
    useState<ApprovalRequest[]>(INITIAL_REQUESTS);
  const [history, setHistory] = useState<AuditEntry[]>(INITIAL_HISTORY);
  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTERS)[number]["id"]>("TODAS");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);
  const [action, setAction] = useState<"APROVAR" | "REJEITAR" | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [actionError, setActionError] = useState("");
  const [discountAdjustment, setDiscountAdjustment] = useState("0");
  const [rejectReason, setRejectReason] = useState("");

  const hasManagerRole =
    CURRENT_MANAGER.role === "GERENTE_LOJA" ||
    CURRENT_MANAGER.role === "SUPER_ADMIN";

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter =
        activeFilter === "TODAS" || request.type === activeFilter;
      const matchesSearch =
        !normalizedSearch ||
        request.customer.toLowerCase().includes(normalizedSearch) ||
        request.requesterName.toLowerCase().includes(normalizedSearch) ||
        request.code.includes(normalizedSearch.replace(/^#/, ""));

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, requests, search]);

  const pendingValue = useMemo(
    () =>
      requests.reduce(
        (total, request) => total + Math.max(request.proposedValue, 0),
        0,
      ),
    [requests],
  );

  const isSelfApproval =
    selectedRequest?.requesterId === CURRENT_MANAGER.id;

  function openAction(
    request: ApprovalRequest,
    nextAction: "APROVAR" | "REJEITAR",
  ) {
    if (request.requesterId === CURRENT_MANAGER.id) {
      return;
    }

    setSelectedRequest(request);
    setAction(nextAction);
    setPin("");
    setShowPin(false);
    setActionError("");
    setDiscountAdjustment(String(request.proposedDiscount));
    setRejectReason("");
  }

  function closeAction() {
    setSelectedRequest(null);
    setAction(null);
    setActionError("");
  }

  function handleAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRequest || !action || isSelfApproval) {
      return;
    }

    if (action === "APROVAR" && pin !== CURRENT_MANAGER.pin) {
      setActionError("PIN/Senha incorreto. A solicitação não foi alterada.");
      return;
    }

    if (action === "REJEITAR" && rejectReason.trim().length < 5) {
      setActionError("Informe uma justificativa de recusa com pelo menos 5 caracteres.");
      return;
    }

    const resolvedAt = "08/11/2026 16:35";
    const adjustedRequest =
      action === "APROVAR"
        ? {
            ...selectedRequest,
            proposedDiscount: Math.min(
              100,
              Math.max(0, Number(discountAdjustment) || 0),
            ),
          }
        : selectedRequest;

    setHistory((current) => [
      {
        id: `aud-${Date.now()}`,
        request: adjustedRequest,
        status: action === "APROVAR" ? "APROVADA" : "REJEITADA",
        responsible: CURRENT_MANAGER.name,
        resolvedAt,
        justification:
          action === "APROVAR"
            ? `Aprovado pelo gerente. Ajuste concedido: ${adjustedRequest.proposedDiscount}% de desconto/tabela.`
            : rejectReason.trim(),
      },
      ...current,
    ]);
    setRequests((current) =>
      current.filter((request) => request.id !== selectedRequest.id),
    );
    closeAction();
  }

  if (!hasManagerRole) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900 dark:bg-zinc-900">
          <LockIcon />
          <h1 className="mt-3 text-lg font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Este módulo exige o papel GERENTE_LOJA ou SUPER_ADMIN.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                  Aprovações do Gerente
                </p>
                <h1 className="text-xl font-bold">Central de decisões</h1>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <UserRound className="h-5 w-5 text-zinc-400" aria-hidden />
              <div>
                <p className="text-sm font-bold">{CURRENT_MANAGER.name}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {CURRENT_MANAGER.role} · {CURRENT_MANAGER.registration}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard
              icon={<Clock3 className="h-5 w-5" />}
              label="Solicitações pendentes"
              value={String(requests.length)}
              tone="violet"
            />
            <MetricCard
              icon={<Landmark className="h-5 w-5" />}
              label="Valor sob análise"
              value={formatBRL(pendingValue)}
              tone="amber"
            />
            <MetricCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Tempo médio de resposta"
              value="18 min"
              tone="emerald"
            />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      activeFilter === filter.id
                        ? "bg-white text-violet-700 shadow-sm dark:bg-zinc-800 dark:text-violet-300"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <label className="relative block min-w-[18rem]">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <span className="sr-only">Buscar aprovações</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cliente, vendedor ou #comanda"
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {filteredRequests.map((request) => {
              const selfApproval =
                request.requesterId === CURRENT_MANAGER.id;
              const Icon = TYPE_ICONS[request.type];

              return (
                <article
                  key={request.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                          {TYPE_LABELS[request.type]}
                        </p>
                        <p className="font-bold">#{request.code}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                      Pendente
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <dt className="text-zinc-500 dark:text-zinc-400">Cliente</dt>
                      <dd className="mt-0.5 font-bold">{request.customer}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Solicitante
                      </dt>
                      <dd className="mt-0.5 font-semibold">
                        {request.requesterName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Solicitado em
                      </dt>
                      <dd className="mt-0.5 font-semibold">
                        {request.requestedAt}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Valor original
                      </p>
                      <p className="mt-1 font-bold">
                        {formatBRL(request.originalValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Valor proposto
                      </p>
                      <p className="mt-1 font-bold text-violet-700 dark:text-violet-300">
                        {formatBRL(request.proposedValue)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border-l-2 border-violet-400 bg-violet-50/60 px-3 py-2 text-xs dark:bg-violet-950/20">
                    <p className="font-bold text-zinc-700 dark:text-zinc-200">
                      Justificativa do vendedor
                    </p>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                      {request.justification}
                    </p>
                  </div>

                  {selfApproval && (
                    <div
                      role="alert"
                      className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      Anti-fraude: O vendedor não pode aprovar a própria solicitação.
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={selfApproval}
                      onClick={() => openAction(request, "REJEITAR")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      Rejeitar
                    </button>
                    <button
                      type="button"
                      disabled={selfApproval}
                      onClick={() => openAction(request, "APROVAR")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Aprovar
                    </button>
                  </div>
                </article>
              );
            })}

            {filteredRequests.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <Filter className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" aria-hidden />
                <p className="mt-2 text-sm font-semibold">
                  Nenhuma solicitação encontrada
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-bold">Histórico de auditoria</h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Decisões concluídas recentemente
            </p>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-3 px-4 py-3 text-xs md:grid-cols-[1fr_1fr_1fr_2fr]"
              >
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Solicitação</p>
                  <p className="mt-0.5 font-bold">
                    #{entry.request.code} · {TYPE_LABELS[entry.request.type]}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Responsável</p>
                  <p className="mt-0.5 font-semibold">{entry.responsible}</p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Data / hora</p>
                  <p className="mt-0.5 font-semibold">{entry.resolvedAt}</p>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      entry.status === "APROVADA"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                    }`}
                  >
                    {entry.status}
                  </span>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                    {entry.justification}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="py-6 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>

      {selectedRequest && action && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-zinc-950/60 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAction();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h2 className="font-bold">
                  {action === "APROVAR"
                    ? "Aprovar Solicitação"
                    : "Rejeitar Solicitação"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Comanda #{selectedRequest.code} · {selectedRequest.customer}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAction}
                aria-label="Fechar modal"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleAction} className="space-y-4 p-5">
              {action === "APROVAR" ? (
                <>
                  <div>
                    <label
                      htmlFor="discount-adjustment"
                      className="text-xs font-semibold"
                    >
                      Ajuste concedido (desconto/tabela)
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="discount-adjustment"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={discountAdjustment}
                        onChange={(event) =>
                          setDiscountAdjustment(event.target.value)
                        }
                        className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 pr-8 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                        %
                      </span>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="manager-pin"
                      className="text-xs font-semibold"
                    >
                      PIN/Senha do Gerente
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="manager-pin"
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        required
                        value={pin}
                        onChange={(event) => {
                          setPin(event.target.value);
                          setActionError("");
                        }}
                        className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 pr-10 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin((current) => !current)}
                        aria-label={showPin ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      >
                        {showPin ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label
                    htmlFor="reject-reason"
                    className="text-xs font-semibold"
                  >
                    Justificativa da recusa *
                  </label>
                  <textarea
                    id="reject-reason"
                    required
                    rows={4}
                    value={rejectReason}
                    onChange={(event) => {
                      setRejectReason(event.target.value);
                      setActionError("");
                    }}
                    placeholder="Descreva o motivo da rejeição"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </div>
              )}

              {actionError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300"
                >
                  {actionError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeAction}
                  className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold uppercase dark:border-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold uppercase text-white ${
                    action === "APROVAR"
                      ? "bg-violet-600 hover:bg-violet-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "violet" | "amber" | "emerald";
}) {
  const tones = {
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}
      >
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
      <XCircle className="h-6 w-6" aria-hidden />
    </span>
  );
}
