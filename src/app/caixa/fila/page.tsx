"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  DoorOpen,
  Eye,
  EyeOff,
  KeyRound,
  Landmark,
  Lock,
  Printer,
  QrCode,
  Receipt,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  Unlock,
  UserRound,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

type OrderStatus = "AGUARDANDO_CAIXA" | "PAGO";
type PaymentMethod = "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO" | "FATURADO";
type DeliveryMode = "RETIRADA" | "ENTREGA";
type PricingTier = "VAREJO" | "ATACADO";
type PrintVia = "CLIENTE" | "GALPAO";
type ProductUnit = "m²" | "m³" | "kg" | "un" | "saco" | "caixa" | "lata";
type CashMovementType = "ABERTURA" | "SANGRIA" | "SUPRIMENTO" | "GAVETA";
type CashOperation =
  | "ABERTURA"
  | "SANGRIA"
  | "SUPRIMENTO"
  | "GAVETA"
  | "FECHAMENTO";

interface CashierItem {
  id: string;
  name: string;
  unit: ProductUnit;
  quantity: number;
  retailPrice: number;
  wholesalePrice: number;
  tier: PricingTier;
}

interface CashierOrder {
  id: string;
  number: number;
  status: OrderStatus;
  enteredAt: string;
  customerName: string;
  customerDocument: string;
  sellerName: string;
  deliveryMode: DeliveryMode;
  deliveryAddress: string;
  notes: string;
  discountPercent: number;
  creditAvailable: number;
  items: CashierItem[];
}

interface PaymentDraft {
  method: PaymentMethod | null;
  cashReceived: string;
  installments: number;
  creditDays: number;
  pixConfirmed: boolean;
}

interface PaidOrder {
  order: CashierOrder;
  method: PaymentMethod;
  paidAt: Date;
  operatorName: string;
  cashReceived?: number;
  change?: number;
  installments?: number;
  creditDays?: number;
}

interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  operatorName: string;
  authorizedBy?: string;
  createdAt: Date;
}

interface SangriaReceiptData {
  id: string;
  amount: number;
  reason: string;
  authorizedBy: string;
  operatorName: string;
  createdAt: Date;
  balanceAfter: number;
}

interface ClosingReportData {
  closedAt: Date;
  openedAt: string;
  openingAmount: number;
  totalSangria: number;
  totalSuprimento: number;
  cashSales: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  operatorName: string;
  pendingOrders: number;
  movements: CashMovement[];
}

/* -------------------------------------------------------------------------- */
/*                                    Dados                                   */
/* -------------------------------------------------------------------------- */

const TENANT = {
  name: "MatCom Materiais",
  document: "12.345.678/0001-90",
  address: "Av. das Construções, 1450 — São Paulo/SP",
  phone: "(11) 4002-8922",
};

const OPERATOR = {
  name: "Marcos Vinícius",
  code: "0087",
  register: "CX-02",
};

const CASH_OPENING = 500;
const CASH_OPENED_AT = "08:00";

const MANAGER_NAME = "Gerente MatCom";
const MANAGER_PIN = "1975";

const CASH_MOVEMENT_LABELS: Record<CashMovementType, string> = {
  ABERTURA: "Abertura de caixa",
  SANGRIA: "Sangria",
  SUPRIMENTO: "Suprimento de troco",
  GAVETA: "Abertura de gaveta",
};

const UNAUTHORIZED_SANGRIA_MESSAGE =
  "Operação não autorizada. Exige validação do Gerente";

const PIX_KEY = "12.345.678/0001-90";
const MAX_INSTALLMENTS = 12;

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  DEBITO: "Cartão de débito",
  CREDITO: "Cartão de crédito",
  FATURADO: "Faturado / Crediário",
};

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  label: string;
  hint: string;
  icon: ReactNode;
}> = [
  {
    id: "DINHEIRO",
    label: "Dinheiro",
    hint: "Troco automático",
    icon: <Banknote className="h-4 w-4" aria-hidden />,
  },
  {
    id: "PIX",
    label: "PIX",
    hint: "QR Code instantâneo",
    icon: <QrCode className="h-4 w-4" aria-hidden />,
  },
  {
    id: "DEBITO",
    label: "Débito",
    hint: "À vista na maquininha",
    icon: <CreditCard className="h-4 w-4" aria-hidden />,
  },
  {
    id: "CREDITO",
    label: "Crédito",
    hint: "Em até 12x",
    icon: <CreditCard className="h-4 w-4" aria-hidden />,
  },
  {
    id: "FATURADO",
    label: "Faturado",
    hint: "Crediário do cliente",
    icon: <Landmark className="h-4 w-4" aria-hidden />,
  },
];

const EMPTY_PAYMENT: PaymentDraft = {
  method: null,
  cashReceived: "",
  installments: 1,
  creditDays: 30,
  pixConfirmed: false,
};

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function buildSeedOrders(): CashierOrder[] {
  return [
    {
      id: "cmd-1051",
      number: 1051,
      status: "AGUARDANDO_CAIXA",
      enteredAt: minutesAgo(34),
      customerName: "Construtora Horizonte Ltda.",
      customerDocument: "12.345.678/0001-90",
      sellerName: "Ana Paula",
      deliveryMode: "ENTREGA",
      deliveryAddress: "Rua das Acácias, 220 — Galpão 3, São Paulo/SP",
      notes: "Entregar após as 14h. Separar argamassa em pallet e conferir lote.",
      discountPercent: 3,
      creditAvailable: 12000,
      items: [
        {
          id: "i-1",
          name: "Cimento CP II 50 kg",
          unit: "saco",
          quantity: 60,
          retailPrice: 38.9,
          wholesalePrice: 34.5,
          tier: "ATACADO",
        },
        {
          id: "i-2",
          name: "Areia média lavada",
          unit: "m³",
          quantity: 4.5,
          retailPrice: 129.9,
          wholesalePrice: 112,
          tier: "ATACADO",
        },
        {
          id: "i-3",
          name: "Bloco de concreto 14x19x39",
          unit: "un",
          quantity: 900,
          retailPrice: 2.75,
          wholesalePrice: 2.35,
          tier: "ATACADO",
        },
        {
          id: "i-4",
          name: "Vergalhão CA-50 10 mm 12 m",
          unit: "un",
          quantity: 40,
          retailPrice: 68.9,
          wholesalePrice: 62,
          tier: "ATACADO",
        },
      ],
    },
    {
      id: "cmd-1052",
      number: 1052,
      status: "AGUARDANDO_CAIXA",
      enteredAt: minutesAgo(22),
      customerName: "Carlos Eduardo Martins",
      customerDocument: "123.456.789-00",
      sellerName: "Bruno Lima",
      deliveryMode: "RETIRADA",
      deliveryAddress: "Retirada no balcão — MatCom Matriz",
      notes: "",
      discountPercent: 0,
      creditAvailable: 1800,
      items: [
        {
          id: "i-5",
          name: "Tinta acrílica premium 18 L",
          unit: "lata",
          quantity: 3,
          retailPrice: 289.9,
          wholesalePrice: 259,
          tier: "VAREJO",
        },
        {
          id: "i-6",
          name: "Argamassa AC-III 20 kg",
          unit: "saco",
          quantity: 6,
          retailPrice: 42.5,
          wholesalePrice: 37.9,
          tier: "VAREJO",
        },
      ],
    },
    {
      id: "cmd-1053",
      number: 1053,
      status: "AGUARDANDO_CAIXA",
      enteredAt: minutesAgo(15),
      customerName: "Reforma Fácil Materiais",
      customerDocument: "98.765.432/0001-10",
      sellerName: "Ana Paula",
      deliveryMode: "ENTREGA",
      deliveryAddress: "Av. Industrial, 780 — Vila Leopoldina, São Paulo/SP",
      notes: "Cliente pediu para ligar 30 min antes da entrega.",
      discountPercent: 2,
      creditAvailable: 8000,
      items: [
        {
          id: "i-7",
          name: "Porcelanato acetinado 80x80 cm",
          unit: "caixa",
          quantity: 18,
          retailPrice: 159.9,
          wholesalePrice: 142,
          tier: "ATACADO",
        },
        {
          id: "i-8",
          name: "Argamassa AC-III 20 kg",
          unit: "saco",
          quantity: 24,
          retailPrice: 42.5,
          wholesalePrice: 37.9,
          tier: "ATACADO",
        },
        {
          id: "i-9",
          name: "Rejunte flexível 5 kg",
          unit: "un",
          quantity: 12,
          retailPrice: 24.9,
          wholesalePrice: 21.5,
          tier: "ATACADO",
        },
      ],
    },
    {
      id: "cmd-1054",
      number: 1054,
      status: "AGUARDANDO_CAIXA",
      enteredAt: minutesAgo(8),
      customerName: "Maria Aparecida Silva",
      customerDocument: "987.654.321-00",
      sellerName: "Bruno Lima",
      deliveryMode: "RETIRADA",
      deliveryAddress: "Retirada no balcão — MatCom Matriz",
      notes: "Cliente aguardando no balcão com carro na vaga de carga.",
      discountPercent: 0,
      creditAvailable: 900,
      items: [
        {
          id: "i-10",
          name: "Tela soldada Q-138",
          unit: "un",
          quantity: 4,
          retailPrice: 189.9,
          wholesalePrice: 172,
          tier: "VAREJO",
        },
        {
          id: "i-11",
          name: "Cimento CP II 50 kg",
          unit: "saco",
          quantity: 10,
          retailPrice: 38.9,
          wholesalePrice: 34.5,
          tier: "VAREJO",
        },
      ],
    },
    {
      id: "cmd-1055",
      number: 1055,
      status: "AGUARDANDO_CAIXA",
      enteredAt: minutesAgo(3),
      customerName: "Obra Nova Engenharia",
      customerDocument: "45.678.912/0001-33",
      sellerName: "Diego Rocha",
      deliveryMode: "ENTREGA",
      deliveryAddress: "Rod. dos Bandeirantes, km 24 — Obra Bloco B, Cajamar/SP",
      notes: "Entrega em obra. Necessário agendar com o encarregado.",
      discountPercent: 5,
      creditAvailable: 25000,
      items: [
        {
          id: "i-12",
          name: "Cimento CP II 50 kg",
          unit: "saco",
          quantity: 120,
          retailPrice: 38.9,
          wholesalePrice: 34.5,
          tier: "ATACADO",
        },
        {
          id: "i-13",
          name: "Areia média lavada",
          unit: "m³",
          quantity: 8,
          retailPrice: 129.9,
          wholesalePrice: 112,
          tier: "ATACADO",
        },
        {
          id: "i-14",
          name: "Vergalhão CA-50 10 mm 12 m",
          unit: "un",
          quantity: 80,
          retailPrice: 68.9,
          wholesalePrice: 62,
          tier: "ATACADO",
        },
      ],
    },
  ];
}

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

function formatDateTime(date: Date | null | undefined) {
  if (!date || Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
  }).format(date);
}

function formatAmountInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function parseAmount(raw: string) {
  const value = raw.trim();

  if (!value) {
    return 0;
  }

  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeAmountInput(value: string) {
  return value.replace(/[^\d.,]/g, "").slice(0, 12);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getItemUnitPrice(item: CashierItem) {
  return item.tier === "ATACADO" ? item.wholesalePrice : item.retailPrice;
}

function getItemTotal(item: CashierItem) {
  return getItemUnitPrice(item) * item.quantity;
}

function getOrderSubtotal(order: CashierOrder) {
  return order.items.reduce(
    (accumulator, item) => accumulator + getItemTotal(item),
    0,
  );
}

function getOrderDiscount(order: CashierOrder) {
  return (getOrderSubtotal(order) * order.discountPercent) / 100;
}

function getOrderTotal(order: CashierOrder) {
  return Math.max(0, getOrderSubtotal(order) - getOrderDiscount(order));
}

function getWaitingMinutes(enteredAt: string, now: Date | null) {
  if (!now) {
    return null;
  }

  const entered = new Date(enteredAt);

  if (Number.isNaN(entered.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - entered.getTime()) / 60_000));
}

function formatWaiting(minutes: number | null) {
  if (minutes === null) {
    return "—";
  }

  if (minutes < 1) {
    return "agora";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining === 0
    ? `${hours} h`
    : `${hours} h ${String(remaining).padStart(2, "0")} min`;
}

/* -------------------------------------------------------------------------- */
/*                              Componentes auxiliares                        */
/* -------------------------------------------------------------------------- */

function WaitingBadge({
  enteredAt,
  now,
}: {
  enteredAt: string;
  now: Date | null;
}) {
  const minutes = getWaitingMinutes(enteredAt, now);

  const tone =
    minutes === null || minutes < 10
      ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      : minutes < 20
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
        : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${tone}`}
      title="Tempo de espera na fila"
    >
      <Clock className="h-3 w-3" aria-hidden />
      {formatWaiting(minutes)}
    </span>
  );
}

function DeliveryTag({ mode }: { mode: DeliveryMode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {mode === "ENTREGA" ? (
        <Truck className="h-3 w-3" aria-hidden />
      ) : (
        <Store className="h-3 w-3" aria-hidden />
      )}
      {mode === "ENTREGA" ? "Entrega" : "Retirada"}
    </span>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  if (status === "PAGO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        <BadgeCheck className="h-3 w-3" aria-hidden />
        Pago
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
      <Receipt className="h-3 w-3" aria-hidden />
      Aguardando caixa
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                    Componentes de operação do caixa                        */
/* -------------------------------------------------------------------------- */

type CashTone = "violet" | "amber" | "emerald" | "red" | "zinc";

const MODAL_TONE_CLASSES: Record<CashTone, string> = {
  violet:
    "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const TOOLBAR_TONE_CLASSES: Record<CashTone, string> = {
  violet:
    "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/70",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70",
  red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70",
  zinc: "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-800/60",
};

function CashToolbarButton({
  icon,
  label,
  hint,
  tone,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  tone: CashTone;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50 ${TOOLBAR_TONE_CLASSES[tone]}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wide">
          {label}
        </span>
        <span className="mt-0.5 block text-[10px] font-medium opacity-80">
          {hint}
        </span>
      </span>
    </button>
  );
}

function CashModalShell({
  id,
  title,
  subtitle,
  icon,
  tone = "violet",
  onClose,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone?: CashTone;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      className="fixed inset-0 z-[75] flex items-end justify-center bg-zinc-950/60 p-4 backdrop-blur-sm print:hidden sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${MODAL_TONE_CLASSES[tone]}`}
            >
              {icon}
            </span>
            <div>
              <h2 id={id} className="text-base font-bold tracking-tight">
                {title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Fechar ${title}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Vias de impressão térmica                         */
/* -------------------------------------------------------------------------- */

function ReceiptHeader({ via }: { via: string }) {
  return (
    <div className="text-center leading-tight">
      <p className="text-sm font-extrabold uppercase tracking-wide">
        {TENANT.name}
      </p>
      <p className="text-[9px]">CNPJ {TENANT.document}</p>
      <p className="text-[9px]">{TENANT.address}</p>
      <p className="text-[9px]">{TENANT.phone}</p>
      <p className="mt-1 border-y border-dashed border-black py-0.5 text-[10px] font-bold uppercase">
        {via}
      </p>
    </div>
  );
}

function ReceiptFooter() {
  return (
    <div className="mt-3 text-center text-[8px] leading-tight">
      <p>Obrigado pela preferência!</p>
      <p>Documento auxiliar — não substitui a NF-e.</p>
      <p className="mt-2 border-t border-dashed border-black pt-1 font-semibold">
        Criado por BCTech | Josemar Brito | Whatsapp 11972646617
      </p>
    </div>
  );
}

function ClientReceipt({ paid }: { paid: PaidOrder }) {
  const { order, method } = paid;
  const subtotal = getOrderSubtotal(order);
  const discount = getOrderDiscount(order);
  const total = getOrderTotal(order);

  return (
    <div className="hidden w-[80mm] bg-white p-1 text-black print:block">
      <ReceiptHeader via="Via do cliente — financeira" />

      <div className="mt-1 space-y-0.5 text-[9px] leading-snug">
        <p>
          <strong>Comanda:</strong> #{order.number} · <strong>Status:</strong>{" "}
          PAGO
        </p>
        <p>
          <strong>Data:</strong> {formatDateTime(paid.paidAt)}
        </p>
        <p>
          <strong>Operador:</strong> {paid.operatorName} ({OPERATOR.code})
        </p>
        <p>
          <strong>Vendedor:</strong> {order.sellerName}
        </p>
        <p>
          <strong>Cliente:</strong> {order.customerName}
        </p>
        <p>
          <strong>CPF/CNPJ:</strong> {order.customerDocument}
        </p>
        <p>
          <strong>Entrega:</strong>{" "}
          {order.deliveryMode === "ENTREGA" ? "Entrega" : "Retirada no balcão"}
        </p>
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-0.5 font-bold">Item</th>
            <th className="w-11 py-0.5 text-right font-bold">Qtd.</th>
            <th className="w-12 py-0.5 text-right font-bold">Unit.</th>
            <th className="w-14 py-0.5 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-dotted border-zinc-400 align-top"
            >
              <td className="py-0.5 pr-1">{item.name}</td>
              <td className="py-0.5 text-right whitespace-nowrap">
                {formatQuantity(item.quantity)} {item.unit}
              </td>
              <td className="py-0.5 text-right whitespace-nowrap">
                {formatBRL(getItemUnitPrice(item))}
              </td>
              <td className="py-0.5 text-right whitespace-nowrap">
                {formatBRL(getItemTotal(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-1 space-y-0.5 text-[9px]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatBRL(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Desconto ({order.discountPercent}%)</span>
          <span>- {formatBRL(discount)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-black pt-0.5 text-[11px] font-bold">
          <span>TOTAL</span>
          <span>{formatBRL(total)}</span>
        </div>
      </div>

      <div className="mt-1 border-t border-dashed border-black pt-1 text-[9px]">
        <p>
          <strong>Pagamento:</strong> {PAYMENT_LABELS[method]}
        </p>
        {method === "DINHEIRO" && (
          <>
            <p>Recebido: {formatBRL(paid.cashReceived ?? 0)}</p>
            <p>Troco: {formatBRL(paid.change ?? 0)}</p>
          </>
        )}
        {method === "CREDITO" && (
          <p>
            {paid.installments ?? 1}x de{" "}
            {formatBRL(total / (paid.installments ?? 1))}
          </p>
        )}
        {method === "FATURADO" && (
          <p>Vencimento em {paid.creditDays ?? 30} dias</p>
        )}
        {method === "PIX" && <p>PIX confirmado no ato do atendimento</p>}
        {method === "DEBITO" && <p>Débito à vista aprovado</p>}
      </div>

      {order.notes && (
        <p className="mt-1 text-[9px]">
          <strong>Obs.:</strong> {order.notes}
        </p>
      )}

      <p className="mt-2 text-center text-[8px]">
        Assinatura do cliente: ______________________
      </p>

      <ReceiptFooter />
    </div>
  );
}

function WarehouseReceipt({ paid }: { paid: PaidOrder }) {
  const { order } = paid;

  return (
    <div className="hidden w-[80mm] bg-white p-1 text-black print:block">
      <ReceiptHeader via="Via do galpão — separação / pátio" />

      <div className="mt-1 space-y-0.5 text-[9px] leading-snug">
        <p>
          <strong>Comanda:</strong> #{order.number} ·{" "}
          <strong>Status:</strong> PAGO
        </p>
        <p>
          <strong>Data:</strong> {formatDateTime(paid.paidAt)}
        </p>
        <p>
          <strong>Cliente:</strong> {order.customerName}
        </p>
        <p>
          <strong>Vendedor:</strong> {order.sellerName}
        </p>
        <p>
          <strong>Operador do caixa:</strong> {paid.operatorName}
        </p>
      </div>

      <div className="mt-1 border-2 border-black p-1 text-[9px] leading-tight">
        <p className="text-[10px] font-extrabold uppercase">
          {order.deliveryMode === "ENTREGA"
            ? "Local de entrega"
            : "Local de retirada"}
        </p>
        <p>{order.deliveryAddress}</p>
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="w-4 py-0.5 font-bold">Sep.</th>
            <th className="py-0.5 font-bold">Item</th>
            <th className="w-14 py-0.5 text-right font-bold">Qtd.</th>
            <th className="w-8 py-0.5 text-right font-bold">Un.</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-dotted border-zinc-400 align-top"
            >
              <td className="py-1">
                <span className="inline-block h-2.5 w-2.5 border border-black" />
              </td>
              <td className="py-1 pr-1">{item.name}</td>
              <td className="py-1 text-right font-bold whitespace-nowrap">
                {formatQuantity(item.quantity)}
              </td>
              <td className="py-1 text-right whitespace-nowrap">
                {item.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.notes && (
        <div className="mt-1 border border-black p-1 text-[9px] leading-snug">
          <p className="font-bold uppercase">Observações de separação</p>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="mt-3 space-y-2 text-[8px]">
        <p>Separado por: ______________________</p>
        <p>Conferido por: _____________________</p>
        <p>Recebido por: ______________________</p>
      </div>

      <ReceiptFooter />
    </div>
  );
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function SangriaReceipt({ data }: { data: SangriaReceiptData }) {
  return (
    <div className="hidden w-[80mm] bg-white p-1 text-black print:block">
      <ReceiptHeader via="Recibo de sangria" />

      <div className="mt-1 space-y-0.5 text-[9px] leading-snug">
        <p>
          <strong>Recibo:</strong> {data.id}
        </p>
        <p>
          <strong>Data:</strong> {formatDateTime(data.createdAt)}
        </p>
        <p>
          <strong>Operador:</strong> {data.operatorName} ({OPERATOR.code})
        </p>
        <p>
          <strong>Autorizado por:</strong> {data.authorizedBy}
        </p>
        <p>
          <strong>Motivo:</strong> {data.reason}
        </p>
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <div className="flex items-baseline justify-between text-[12px] font-bold">
        <span>VALOR DA SANGRIA</span>
        <span>{formatBRL(data.amount)}</span>
      </div>

      <div className="mt-1 flex justify-between text-[9px]">
        <span>Saldo em gaveta após retirada</span>
        <span>{formatBRL(data.balanceAfter)}</span>
      </div>

      <div className="mt-2 border-t border-dashed border-black pt-1 text-[9px]">
        <p>Declaro a retirada de espécie acima descrita.</p>
        <div className="mt-6 border-t border-black pt-0.5 text-center text-[8px]">
          Assinatura do operador
        </div>
        <div className="mt-5 border-t border-black pt-0.5 text-center text-[8px]">
          Assinatura do Gerente
        </div>
      </div>

      <ReceiptFooter />
    </div>
  );
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function ClosingReport({ data }: { data: ClosingReportData }) {
  const resultLabel =
    data.difference === 0
      ? "Caixa conferido"
      : data.difference > 0
        ? "Sobra de caixa"
        : "Falta de caixa";

  const cashMovements = data.movements.filter(
    (movement) =>
      movement.type === "SANGRIA" || movement.type === "SUPRIMENTO",
  );

  return (
    <div className="hidden w-[80mm] bg-white p-1 text-black print:block">
      <ReceiptHeader via="Fechamento de caixa — conferência" />

      <div className="mt-1 space-y-0.5 text-[9px] leading-snug">
        <p>
          <strong>Fechamento:</strong> {formatDateTime(data.closedAt)}
        </p>
        <p>
          <strong>Abertura:</strong> às {data.openedAt}
        </p>
        <p>
          <strong>Operador:</strong> {data.operatorName} ({OPERATOR.code})
        </p>
        <p>
          <strong>Comandas pendentes:</strong> {data.pendingOrders}
        </p>
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <div className="space-y-0.5 text-[9px]">
        <div className="flex justify-between">
          <span>Saldo inicial de troco</span>
          <span>{formatBRL(data.openingAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Suprimentos</span>
          <span>+ {formatBRL(data.totalSuprimento)}</span>
        </div>
        <div className="flex justify-between">
          <span>Vendas em dinheiro</span>
          <span>+ {formatBRL(data.cashSales)}</span>
        </div>
        <div className="flex justify-between">
          <span>Sangrias</span>
          <span>- {formatBRL(data.totalSangria)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-black pt-0.5 font-bold">
          <span>Valor esperado em gaveta</span>
          <span>{formatBRL(data.expectedCash)}</span>
        </div>
        <div className="flex justify-between">
          <span>Valor contado</span>
          <span>{formatBRL(data.countedCash)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-black pt-0.5 text-[11px] font-bold">
          <span>Diferença</span>
          <span>
            {data.difference > 0 ? "+" : ""}
            {formatBRL(data.difference)}
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Resultado</span>
          <span>{resultLabel}</span>
        </div>
      </div>

      {cashMovements.length > 0 && (
        <>
          <div className="my-1 border-t border-dashed border-black" />
          <p className="text-[9px] font-bold uppercase">
            Sangrias e suprimentos
          </p>
          <ul className="mt-0.5 space-y-0.5 text-[8px] leading-snug">
            {cashMovements.map((movement) => (
              <li key={movement.id} className="flex justify-between gap-1">
                <span className="truncate">
                  {formatTime(movement.createdAt)} ·{" "}
                  {CASH_MOVEMENT_LABELS[movement.type]} · {movement.reason}
                </span>
                <span className="shrink-0 font-semibold">
                  {formatBRL(movement.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-2 border-t border-dashed border-black pt-1 text-[9px]">
        <p>Declaro a conferência do caixa acima descrita.</p>
        <div className="mt-6 border-t border-black pt-0.5 text-center text-[8px]">
          Assinatura do operador
        </div>
        <div className="mt-5 border-t border-black pt-0.5 text-center text-[8px]">
          Assinatura do Gerente
        </div>
      </div>

      <ReceiptFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Página                                   */
/* -------------------------------------------------------------------------- */

export default function FilaDoCaixaPage() {
  const [orders, setOrders] = useState<CashierOrder[]>(buildSeedOrders);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState<PaymentDraft>({ ...EMPTY_PAYMENT });
  const [now, setNow] = useState<Date | null>(null);
  const [lastPaid, setLastPaid] = useState<PaidOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [printRequest, setPrintRequest] = useState<{
    via: PrintVia;
  } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [cashRegisterOpen, setCashRegisterOpen] = useState(true);
  const [cashOperation, setCashOperation] = useState<CashOperation | null>(
    null,
  );
  const [operationAmount, setOperationAmount] = useState("");
  const [operationReason, setOperationReason] = useState("");
  const [managerAuthorization, setManagerAuthorization] = useState("");
  const [sangriaError, setSangriaError] = useState<string | null>(null);
  const [managerPasswordVisible, setManagerPasswordVisible] = useState(false);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);

  const panelRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOrder =
    orders.find((order) => order.id === selectedId) ?? null;

  const pendingOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status === "AGUARDANDO_CAIXA")
        .sort(
          (first, second) =>
            new Date(first.enteredAt).getTime() -
            new Date(second.enteredAt).getTime(),
        ),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim();

    if (!term) {
      return pendingOrders;
    }

    const text = normalizeText(term);
    const digits = term.replace(/\D/g, "");

    return pendingOrders.filter((order) => {
      const numberMatch =
        digits.length > 0 && String(order.number).includes(digits);
      const documentMatch =
        digits.length >= 3 &&
        order.customerDocument.replace(/\D/g, "").includes(digits);
      const nameMatch = normalizeText(order.customerName).includes(text);

      return numberMatch || documentMatch || nameMatch;
    });
  }, [pendingOrders, search]);

  const oldestWaiting = useMemo(() => {
    const oldest = pendingOrders[0];

    return oldest ? getWaitingMinutes(oldest.enteredAt, now) : null;
  }, [pendingOrders, now]);

  const selectedSubtotal = selectedOrder
    ? getOrderSubtotal(selectedOrder)
    : 0;
  const selectedDiscount = selectedOrder
    ? getOrderDiscount(selectedOrder)
    : 0;
  const selectedTotal = selectedOrder ? getOrderTotal(selectedOrder) : 0;

  const cashReceived = parseAmount(payment.cashReceived);
  const changeValue = Math.max(0, cashReceived - selectedTotal);
  const missingValue = Math.max(0, selectedTotal - cashReceived);

  const canFinalize = useMemo(() => {
    if (!selectedOrder || !payment.method) {
      return false;
    }

    switch (payment.method) {
      case "DINHEIRO":
        return cashReceived >= selectedTotal;
      case "PIX":
        return payment.pixConfirmed;
      case "CREDITO":
        return (
          payment.installments >= 1 &&
          payment.installments <= MAX_INSTALLMENTS
        );
      case "FATURADO":
        return (
          selectedTotal <= selectedOrder.creditAvailable &&
          payment.creditDays > 0
        );
      default:
        return true;
    }
  }, [selectedOrder, payment, cashReceived, selectedTotal]);

  const blockReason = useMemo(() => {
    if (!selectedOrder) {
      return null;
    }

    if (!payment.method) {
      return "Selecione a forma de pagamento para liberar o selo da comanda.";
    }

    if (payment.method === "DINHEIRO" && cashReceived < selectedTotal) {
      return `Valor recebido insuficiente. Faltam ${formatBRL(missingValue)}.`;
    }

    if (payment.method === "PIX" && !payment.pixConfirmed) {
      return "Confirme o crédito do PIX para liberar o selo da comanda.";
    }

    if (
      payment.method === "FATURADO" &&
      selectedTotal > selectedOrder.creditAvailable
    ) {
      return "Limite de crediário insuficiente. Solicite aprovação do Gerente.";
    }

    return null;
  }, [selectedOrder, payment.method, payment.pixConfirmed, cashReceived, selectedTotal, missingValue]);

  useEffect(() => {
    function updateNow() {
      setNow(new Date());
    }

    updateNow();

    const interval = window.setInterval(updateNow, 30_000);

    return () => {
      window.clearInterval(interval);
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
        setPrintRequest(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!printRequest) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [printRequest]);

  function resetPayment() {
    setPayment({ ...EMPTY_PAYMENT });
  }

  function selectOrder(orderId: string) {
    setSelectedId(orderId);
    resetPayment();

    if (window.matchMedia("(max-width: 1279px)").matches) {
      window.requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  function selectPaymentMethod(method: PaymentMethod) {
    setPayment((current) => ({
      ...current,
      method,
      cashReceived:
        method === "DINHEIRO" && current.cashReceived === ""
          ? formatAmountInput(selectedTotal)
          : current.cashReceived,
      pixConfirmed: method === "PIX" ? current.pixConfirmed : false,
    }));
  }

  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2_500);
    } catch {
      setPixCopied(false);
    }
  }

  function handleFinalize() {
    if (!selectedOrder || !payment.method || !canFinalize) {
      return;
    }

    const paid: PaidOrder = {
      order: { ...selectedOrder, status: "PAGO" },
      method: payment.method,
      paidAt: new Date(),
      operatorName: OPERATOR.name,
      cashReceived:
        payment.method === "DINHEIRO" ? cashReceived : undefined,
      change: payment.method === "DINHEIRO" ? changeValue : undefined,
      installments:
        payment.method === "CREDITO" ? payment.installments : undefined,
      creditDays:
        payment.method === "FATURADO" ? payment.creditDays : undefined,
    };

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === selectedOrder.id
          ? { ...order, status: "PAGO" as const }
          : order,
      ),
    );

    setLastPaid(paid);
    setSelectedId(null);
    setPrintRequest(null);
    resetPayment();
    setModalOpen(true);
  }

  function handlePrint(via: PrintVia) {
    setPrintRequest({ via });
  }

  function closeModal() {
    setModalOpen(false);
    setPrintRequest(null);
  }

  function openCashOperation(operation: CashOperation) {
    setOperationAmount("");
    setOperationReason("");
    setManagerAuthorization("");
    setSangriaError(null);
    setManagerPasswordVisible(false);
    setCashOperation(operation);
  }

  function closeCashOperation() {
    setCashOperation(null);
    setSangriaError(null);
  }

  function handleCashOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cashOperation) {
      return;
    }

    if (cashOperation === "SANGRIA") {
      const amount = parseAmount(operationAmount);

      if (amount <= 0) {
        setSangriaError("Informe um valor válido para a sangria.");
        return;
      }

      if (!operationReason.trim()) {
        setSangriaError("Informe o motivo da sangria.");
        return;
      }

      if (managerAuthorization !== MANAGER_PIN) {
        setSangriaError(UNAUTHORIZED_SANGRIA_MESSAGE);
        return;
      }

      const movement: CashMovement = {
        id: `mov-${Date.now()}`,
        type: "SANGRIA",
        amount,
        reason: operationReason.trim(),
        operatorName: OPERATOR.name,
        authorizedBy: MANAGER_NAME,
        createdAt: new Date(),
      };

      setCashMovements((current) => [...current, movement]);
      closeCashOperation();
      window.print();
      return;
    }

    if (cashOperation === "ABERTURA") {
      setCashRegisterOpen(true);
    } else if (cashOperation === "FECHAMENTO") {
      setCashRegisterOpen(false);
    } else {
      const amount = parseAmount(operationAmount);
      const type: CashMovementType =
        cashOperation === "SUPRIMENTO"
          ? "SUPRIMENTO"
          : cashOperation === "GAVETA"
            ? "GAVETA"
            : "ABERTURA";

      setCashMovements((current) => [
        ...current,
        {
          id: `mov-${Date.now()}`,
          type,
          amount,
          reason: operationReason.trim() || CASH_MOVEMENT_LABELS[type],
          operatorName: OPERATOR.name,
          createdAt: new Date(),
        },
      ]);
    }

    closeCashOperation();
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 4mm;
          }

          html,
          body {
            background: #ffffff !important;
          }
        }
      `}</style>

      <div className="min-h-full bg-zinc-50 text-zinc-900 print:hidden dark:bg-zinc-950 dark:text-zinc-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:gap-6 lg:py-8">
          {/* Cabeçalho do caixa */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
                  <Wallet className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                    Fila do Caixa &amp; Recebimento
                  </h1>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Comandas aguardando pagamento · selagem imutável após o
                    recebimento
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Caixa aberto
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {/* Operador */}
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Operador de caixa
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {OPERATOR.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Matrícula {OPERATOR.code} · {OPERATOR.register}
                  </p>
                </div>
              </div>

              {/* Abertura de caixa */}
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Banknote className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Abertura de caixa
                  </p>
                  <p className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatBRL(CASH_OPENING)}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Aberto às {CASH_OPENED_AT} por {OPERATOR.name}
                  </p>
                </div>
              </div>

              {/* Fila */}
              <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900 dark:bg-violet-950/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  <Receipt className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80">
                    Comandas na fila
                  </p>
                  <p className="text-xl font-bold text-violet-700 dark:text-violet-300">
                    {pendingOrders.length}
                  </p>
                  <p className="text-[11px] text-violet-700/70 dark:text-violet-300/70">
                    Mais antiga há {formatWaiting(oldestWaiting)}
                  </p>
                </div>
              </div>
            </div>

            {/* Ferramentas operacionais */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <CashToolbarButton
                icon={<Unlock className="h-4 w-4" />}
                label="Abertura de caixa"
                hint={cashRegisterOpen ? "Caixa aberto" : "Abrir turno"}
                tone="emerald"
                onClick={() => openCashOperation("ABERTURA")}
                disabled={cashRegisterOpen}
              />
              <CashToolbarButton
                icon={<ArrowDownToLine className="h-4 w-4" />}
                label="Realizar sangria"
                hint={
                  cashMovements.length
                    ? `${cashMovements.length} movimento(s) registrado(s)`
                    : "Requer autorização"
                }
                tone="amber"
                onClick={() => openCashOperation("SANGRIA")}
                disabled={!cashRegisterOpen}
              />
              <CashToolbarButton
                icon={<ArrowUpFromLine className="h-4 w-4" />}
                label="Suprimento"
                hint="Reforçar troco"
                tone="violet"
                onClick={() => openCashOperation("SUPRIMENTO")}
                disabled={!cashRegisterOpen}
              />
              <CashToolbarButton
                icon={<DoorOpen className="h-4 w-4" />}
                label="Abrir gaveta"
                hint="Movimento autorizado"
                tone="zinc"
                onClick={() => openCashOperation("GAVETA")}
                disabled={!cashRegisterOpen}
              />
              <CashToolbarButton
                icon={<Lock className="h-4 w-4" />}
                label="Fechar caixa"
                hint="Encerrar turno"
                tone="red"
                onClick={() => openCashOperation("FECHAMENTO")}
                disabled={!cashRegisterOpen}
              />
            </div>

            {/* Busca instantânea */}
            <div className="relative mt-4">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busque por nº da comanda (#1051), CPF/CNPJ ou nome do cliente..."
                aria-label="Buscar comandas por número, CPF/CNPJ ou nome do cliente"
                className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start xl:gap-6">
            {/* Fila de espera */}
            <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Receipt
                    className="h-4 w-4 text-violet-600 dark:text-violet-400"
                    aria-hidden
                  />
                  <h2 className="text-sm font-bold tracking-tight">
                    Comandas pendentes
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {filteredOrders.length} de {pendingOrders.length}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Ordenadas por tempo de espera
                </span>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
                  <Receipt
                    className="h-10 w-10 text-zinc-300 dark:text-zinc-700"
                    aria-hidden
                  />
                  <p className="text-sm font-semibold">
                    Nenhuma comanda encontrada
                  </p>
                  <p className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                    {pendingOrders.length === 0
                      ? "Todas as comandas foram atendidas. Novas comandas enviadas pelo PDV aparecerão aqui."
                      : "Confira o número da comanda, o CPF/CNPJ ou o nome digitado."}
                  </p>
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Limpar busca
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredOrders.map((order) => {
                    const total = getOrderTotal(order);
                    const isSelected = order.id === selectedId;

                    return (
                      <li key={order.id}>
                        <div
                          className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                            isSelected
                              ? "bg-violet-50/70 dark:bg-violet-950/20"
                              : ""
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-[9px] font-semibold uppercase leading-none text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                              <span className="text-[8px]">Nº</span>
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                                {order.number}
                              </span>
                            </span>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="text-sm font-bold">
                                  Comanda #{order.number}
                                </h3>
                                <StatusBadge status={order.status} />
                                <WaitingBadge
                                  enteredAt={order.enteredAt}
                                  now={now}
                                />
                              </div>

                              <p className="mt-1 truncate text-sm font-medium">
                                {order.customerName}
                              </p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {order.customerDocument} ·{" "}
                                {order.items.length}{" "}
                                {order.items.length === 1 ? "item" : "itens"}
                              </p>

                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                  <UserRound
                                    className="h-3 w-3"
                                    aria-hidden
                                  />
                                  {order.sellerName}
                                </span>
                                <DeliveryTag mode={order.deliveryMode} />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-end">
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Total
                              </p>
                              <p className="text-lg font-bold tabular-nums">
                                {formatBRL(total)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => selectOrder(order.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                            >
                              Atender comanda
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Painel de recebimento */}
            <aside ref={panelRef} className="xl:sticky xl:top-20">
              {selectedOrder ? (
                <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold tracking-tight">
                          Recebimento da comanda
                        </h2>
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                          #{selectedOrder.number}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        Confira os itens e registre o pagamento.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        resetPayment();
                      }}
                      aria-label="Fechar comanda selecionada"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>

                  <div className="p-4">
                    {/* Cliente e entrega */}
                    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {selectedOrder.customerName}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {selectedOrder.customerDocument}
                          </p>
                        </div>
                        <DeliveryTag mode={selectedOrder.deliveryMode} />
                      </div>

                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {selectedOrder.deliveryMode === "ENTREGA" ? (
                          <Truck
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden
                          />
                        ) : (
                          <Store
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden
                          />
                        )}
                        <span>{selectedOrder.deliveryAddress}</span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <UserRound className="h-3.5 w-3.5" aria-hidden />
                        Vendedor: {selectedOrder.sellerName}
                      </div>
                    </div>

                    {/* Trava imutável */}
                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      Após o pagamento, esta comanda será selada e não poderá
                      mais ser alterada.
                    </p>

                    {/* Itens */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Itens da comanda
                        </p>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {selectedOrder.items.length}{" "}
                          {selectedOrder.items.length === 1 ? "item" : "itens"}
                        </span>
                      </div>

                      <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                        {selectedOrder.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {formatQuantity(item.quantity)} {item.unit} ×{" "}
                                {formatBRL(getItemUnitPrice(item))}
                                {item.tier === "ATACADO" && (
                                  <span className="ml-1 font-semibold text-violet-600 dark:text-violet-400">
                                    atacado
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="shrink-0 font-semibold tabular-nums">
                              {formatBRL(getItemTotal(item))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Totais */}
                    <dl className="mt-3 space-y-1 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <dt className="text-zinc-500 dark:text-zinc-400">
                          Subtotal
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {formatBRL(selectedSubtotal)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-zinc-500 dark:text-zinc-400">
                          Desconto ({selectedOrder.discountPercent}%)
                        </dt>
                        <dd className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                          - {formatBRL(selectedDiscount)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
                        <dt className="text-base font-bold">Total a pagar</dt>
                        <dd className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatBRL(selectedTotal)}
                        </dd>
                      </div>
                    </dl>

                    {/* Formas de pagamento */}
                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Forma de pagamento
                      </p>

                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        {PAYMENT_METHODS.map((method) => {
                          const active = payment.method === method.id;

                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => selectPaymentMethod(method.id)}
                              aria-pressed={active}
                              className={`flex flex-col items-start gap-0.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                                active
                                  ? "border-violet-400 bg-violet-50 text-violet-700 ring-2 ring-violet-500/20 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              } ${method.id === "FATURADO" ? "col-span-2" : ""}`}
                            >
                              <span className="flex items-center gap-1.5 text-[11px] font-bold">
                                {method.icon}
                                {method.label}
                              </span>
                              <span
                                className={`text-[10px] ${
                                  active
                                    ? "text-violet-600/80 dark:text-violet-300/80"
                                    : "text-zinc-500 dark:text-zinc-400"
                                }`}
                              >
                                {method.hint}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dinheiro */}
                      {payment.method === "DINHEIRO" && (
                        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                          <label
                            htmlFor="cash-received"
                            className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                          >
                            Valor recebido
                          </label>

                          <div className="relative mt-1">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                              R$
                            </span>
                            <input
                              id="cash-received"
                              type="text"
                              inputMode="decimal"
                              value={payment.cashReceived}
                              onChange={(event) =>
                                setPayment((current) => ({
                                  ...current,
                                  cashReceived: sanitizeAmountInput(
                                    event.target.value,
                                  ),
                                }))
                              }
                              placeholder="0,00"
                              className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-2.5 text-sm font-bold text-zinc-900 tabular-nums focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                            />
                          </div>

                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPayment((current) => ({
                                  ...current,
                                  cashReceived: formatAmountInput(selectedTotal),
                                }))
                              }
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              Valor exato
                            </button>
                            {[50, 100, 200].map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  setPayment((current) => ({
                                    ...current,
                                    cashReceived: formatAmountInput(value),
                                  }))
                                }
                                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                R$ {value}
                              </button>
                            ))}
                          </div>

                          <div className="mt-2 flex items-center justify-between rounded-lg bg-white px-2.5 py-2 dark:bg-zinc-900">
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                              {cashReceived >= selectedTotal
                                ? "Troco"
                                : "Faltam"}
                            </span>
                            <span
                              className={`text-sm font-bold tabular-nums ${
                                cashReceived >= selectedTotal
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {cashReceived >= selectedTotal
                                ? formatBRL(changeValue)
                                : formatBRL(missingValue)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* PIX */}
                      {payment.method === "PIX" && (
                        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                          <div className="flex items-start gap-3">
                            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
                              <QrCode className="h-14 w-14" aria-hidden />
                            </span>

                            <div className="min-w-0">
                              <p className="text-xs font-bold">
                                Escaneie o QR Code PIX
                              </p>
                              <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                                Peça ao cliente para abrir o app do banco,
                                escolher PIX e apontar a câmera. O valor de{" "}
                                <strong className="text-zinc-700 dark:text-zinc-200">
                                  {formatBRL(selectedTotal)}
                                </strong>{" "}
                                já vem preenchido.
                              </p>
                              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                Chave:{" "}
                                <strong className="text-zinc-700 dark:text-zinc-200">
                                  {PIX_KEY}
                                </strong>
                              </p>

                              <button
                                type="button"
                                onClick={copyPixKey}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                {pixCopied ? (
                                  <CheckCircle2
                                    className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
                                    aria-hidden
                                  />
                                ) : (
                                  <Copy className="h-3 w-3" aria-hidden />
                                )}
                                {pixCopied ? "Chave copiada" : "Copiar chave PIX"}
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setPayment((current) => ({
                                ...current,
                                pixConfirmed: !current.pixConfirmed,
                              }))
                            }
                            aria-pressed={payment.pixConfirmed}
                            className={`mt-3 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${
                              payment.pixConfirmed
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                payment.pixConfirmed
                                  ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                                  : "border-zinc-400 dark:border-zinc-600"
                              }`}
                            >
                              {payment.pixConfirmed && (
                                <CheckCircle2
                                  className="h-3 w-3"
                                  aria-hidden
                                />
                              )}
                            </span>
                            Confirmo que o PIX foi creditado na conta da loja
                          </button>
                        </div>
                      )}

                      {/* Débito */}
                      {payment.method === "DEBITO" && (
                        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                          <p className="flex items-center gap-1.5 font-semibold">
                            <CreditCard className="h-3.5 w-3.5" aria-hidden />
                            Débito à vista
                          </p>
                          <p className="mt-1 leading-snug">
                            Insira ou aproxime o cartão na maquininha e confirme
                            o débito no valor de{" "}
                            <strong className="text-zinc-900 dark:text-zinc-50">
                              {formatBRL(selectedTotal)}
                            </strong>
                            . Aguarde a aprovação antes de selar a comanda.
                          </p>
                        </div>
                      )}

                      {/* Crédito */}
                      {payment.method === "CREDITO" && (
                        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                          <label
                            htmlFor="installments"
                            className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                          >
                            Parcelamento no crédito
                          </label>

                          <div className="relative mt-1">
                            <select
                              id="installments"
                              value={payment.installments}
                              onChange={(event) =>
                                setPayment((current) => ({
                                  ...current,
                                  installments: Number(event.target.value),
                                }))
                              }
                              className="h-10 w-full appearance-none rounded-lg border border-zinc-300 bg-white py-1.5 pl-2.5 pr-8 text-sm font-semibold text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                            >
                              {Array.from(
                                { length: MAX_INSTALLMENTS },
                                (_, index) => index + 1,
                              ).map((installment) => (
                                <option key={installment} value={installment}>
                                  {installment}x de{" "}
                                  {formatBRL(selectedTotal / installment)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                              aria-hidden
                            />
                          </div>

                          <p className="mt-1.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                            Parcelamento em até {MAX_INSTALLMENTS}x. Confirme a
                            aprovação na maquininha antes de selar.
                          </p>
                        </div>
                      )}

                      {/* Faturado */}
                      {payment.method === "FATURADO" && (
                        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                              Limite de crediário
                            </span>
                            <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatBRL(selectedOrder.creditAvailable)}
                            </span>
                          </div>

                          <label
                            htmlFor="credit-days"
                            className="mt-2 block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                          >
                            Prazo de vencimento (dias)
                          </label>

                          <div className="relative mt-1">
                            <CalendarClock
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                              aria-hidden
                            />
                            <select
                              id="credit-days"
                              value={payment.creditDays}
                              onChange={(event) =>
                                setPayment((current) => ({
                                  ...current,
                                  creditDays: Number(event.target.value),
                                }))
                              }
                              className="h-10 w-full appearance-none rounded-lg border border-zinc-300 bg-white py-1.5 pl-9 pr-8 text-sm font-semibold text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                            >
                              {[15, 30, 45, 60, 90].map((days) => (
                                <option key={days} value={days}>
                                  {days} dias
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                              aria-hidden
                            />
                          </div>

                          {selectedTotal > selectedOrder.creditAvailable ? (
                            <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                              Limite insuficiente. Faltam{" "}
                              {formatBRL(
                                selectedTotal - selectedOrder.creditAvailable,
                              )}{" "}
                              — solicite aprovação do Gerente.
                            </p>
                          ) : (
                            <p className="mt-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                              Lançado no crediário do cliente com vencimento em{" "}
                              {payment.creditDays} dias. Saldo após esta compra:{" "}
                              <strong className="text-zinc-700 dark:text-zinc-200">
                                {formatBRL(
                                  selectedOrder.creditAvailable - selectedTotal,
                                )}
                              </strong>
                              .
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ação final */}
                    <button
                      type="button"
                      onClick={handleFinalize}
                      disabled={!canFinalize}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:shadow-none dark:disabled:bg-emerald-900/50"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                      Finalizar pagamento e selar comanda
                    </button>

                    <p className="mt-2 text-center text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {blockReason ??
                        "Ao finalizar, a comanda recebe o status PAGO e fica imutável."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
                  <Receipt
                    className="h-10 w-10 text-zinc-300 dark:text-zinc-700"
                    aria-hidden
                  />
                  <p className="text-sm font-semibold">
                    Nenhuma comanda selecionada
                  </p>
                  <p className="max-w-[15rem] text-xs text-zinc-500 dark:text-zinc-400">
                    Escolha uma comanda na fila e clique em{" "}
                    <strong className="text-zinc-700 dark:text-zinc-200">
                      Atender comanda
                    </strong>{" "}
                    para iniciar o recebimento.
                  </p>
                </div>
              )}
            </aside>
          </div>

          <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500">
            Fluxo: PDV gera a comanda → Caixa recebe e sela o pagamento →
            Galpão separa com a via sem preços.
          </p>
        </div>
      </div>

      {/* Modal de emissão e dupla impressão */}
      {modalOpen && lastPaid && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="caixa-confirmation-title"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/60 p-4 backdrop-blur-sm print:hidden sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <BadgeCheck className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2
                    id="caixa-confirmation-title"
                    className="text-base font-bold tracking-tight"
                  >
                    Pagamento aprovado e comanda selada
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    A comanda já está imutável. Emita as vias de impressão.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar modal de emissão"
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
                      #{lastPaid.order.number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Total pago
                    </p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBRL(getOrderTotal(lastPaid.order))}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Cliente
                    </p>
                    <p className="truncate font-semibold">
                      {lastPaid.order.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Pagamento
                    </p>
                    <p className="font-semibold">
                      {PAYMENT_LABELS[lastPaid.method]}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {lastPaid.method === "DINHEIRO" ? "Troco" : "Situação"}
                    </p>
                    <p className="font-semibold">
                      {lastPaid.method === "DINHEIRO"
                        ? formatBRL(lastPaid.change ?? 0)
                        : "PAGO"}
                    </p>
                  </div>
                  {lastPaid.method === "CREDITO" && (
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Parcelas
                      </p>
                      <p className="font-semibold">
                        {lastPaid.installments ?? 1}x de{" "}
                        {formatBRL(
                          getOrderTotal(lastPaid.order) /
                            (lastPaid.installments ?? 1),
                        )}
                      </p>
                    </div>
                  )}
                  {lastPaid.method === "FATURADO" && (
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Crediário
                      </p>
                      <p className="font-semibold">
                        Vencimento em {lastPaid.creditDays ?? 30} dias
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Dupla impressão
              </p>

              <div className="mt-1.5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint("CLIENTE")}
                  className="flex items-center justify-between gap-3 rounded-xl bg-violet-600 px-4 py-3 text-left text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                >
                  <span className="flex items-center gap-2.5">
                    <FileReceiptIcon />
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-wide">
                        Imprimir via do cliente
                      </span>
                      <span className="block text-[10px] font-medium text-violet-100/90">
                        Financeira · com valores, totais e pagamento
                      </span>
                    </span>
                  </span>
                  <Printer className="h-4 w-4 shrink-0" aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => handlePrint("GALPAO")}
                  className="flex items-center justify-between gap-3 rounded-xl bg-amber-600 px-4 py-3 text-left text-white shadow-lg shadow-amber-600/20 transition-colors hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                >
                  <span className="flex items-center gap-2.5">
                    <Warehouse className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-wide">
                        Imprimir via do galpão
                      </span>
                      <span className="block text-[10px] font-medium text-amber-100/90">
                        Separação / pátio · sem preços
                      </span>
                    </span>
                  </span>
                  <Printer className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="mt-3 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Concluir atendimento
              </button>

              <p className="mt-2 text-center text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                As vias são impressas em bobina térmica de 80 mm. A via do
                galpão não exibe valores.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Operações de caixa */}
      {cashOperation && (
        <CashModalShell
          id="cash-operation-title"
          title={
            cashOperation === "SANGRIA"
              ? "Realizar sangria"
              : CASH_MOVEMENT_LABELS[
                  cashOperation === "ABERTURA"
                    ? "ABERTURA"
                    : cashOperation === "SUPRIMENTO"
                      ? "SUPRIMENTO"
                      : cashOperation === "GAVETA"
                        ? "GAVETA"
                        : "ABERTURA"
                ]
          }
          subtitle={
            cashOperation === "SANGRIA"
              ? "Autorização exclusiva de GERENTE_LOJA ou SUPER_ADMIN"
              : "Registre o movimento do caixa"
          }
          icon={
            cashOperation === "SANGRIA" ? (
              <KeyRound className="h-5 w-5" aria-hidden />
            ) : (
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
            )
          }
          tone={cashOperation === "SANGRIA" ? "amber" : "violet"}
          onClose={closeCashOperation}
        >
          <form onSubmit={handleCashOperation} className="space-y-3">
            {cashOperation !== "GAVETA" && (
              <div>
                <label
                  htmlFor="cash-operation-amount"
                  className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                >
                  Valor (R$)
                </label>
                <input
                  id="cash-operation-amount"
                  inputMode="decimal"
                  required
                  value={operationAmount}
                  onChange={(event) =>
                    setOperationAmount(sanitizeAmountInput(event.target.value))
                  }
                  placeholder="0,00"
                  className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
            )}

            {cashOperation !== "ABERTURA" &&
              cashOperation !== "FECHAMENTO" && (
                <div>
                  <label
                    htmlFor="cash-operation-reason"
                    className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                  >
                    Motivo
                  </label>
                  <textarea
                    id="cash-operation-reason"
                    required={cashOperation === "SANGRIA"}
                    rows={2}
                    value={operationReason}
                    onChange={(event) =>
                      setOperationReason(event.target.value.slice(0, 160))
                    }
                    placeholder="Descreva o movimento"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </div>
              )}

            {cashOperation === "SANGRIA" && (
              <div>
                <label
                  htmlFor="manager-authorization"
                  className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                >
                  Senha de autorização do Gerente
                </label>
                <div className="relative mt-1">
                  <input
                    id="manager-authorization"
                    type={managerPasswordVisible ? "text" : "password"}
                    inputMode="numeric"
                    required
                    value={managerAuthorization}
                    onChange={(event) => {
                      setManagerAuthorization(event.target.value);
                      setSangriaError(null);
                    }}
                    placeholder="PIN do gerente"
                    className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 pr-10 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setManagerPasswordVisible((visible) => !visible)
                    }
                    aria-label={
                      managerPasswordVisible
                        ? "Ocultar senha do gerente"
                        : "Mostrar senha do gerente"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
                  >
                    {managerPasswordVisible ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            )}

            {sangriaError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {sangriaError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeCashOperation}
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-violet-700"
              >
                Confirmar
              </button>
            </div>
          </form>
        </CashModalShell>
      )}

      {/* Área de impressão: via do cliente */}
      {lastPaid && printRequest?.via === "CLIENTE" && (
        <ClientReceipt paid={lastPaid} />
      )}

      {/* Área de impressão: via do galpão */}
      {lastPaid && printRequest?.via === "GALPAO" && (
        <WarehouseReceipt paid={lastPaid} />
      )}
    </>
  );
}

function FileReceiptIcon() {
  return <Receipt className="h-4 w-4 shrink-0" aria-hidden />;
}
