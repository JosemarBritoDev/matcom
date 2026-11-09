"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Boxes,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Play,
  Printer,
  Route,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import {
  ROTULOS_CATEGORIA,
  ROTULOS_MODALIDADE,
  ROTULOS_STATUS,
  calcularIndicadoresExpedicao,
  calcularProgressoConferencia,
  comandaTemMaterialPesado,
  conferirItem,
  conferirTodosItens,
  confirmarSaidaGalpao,
  contarComandasPorStatus,
  iniciarSeparacao,
  itensConferidos,
  montarRomaneio,
  type CategoriaMaterial,
  type ComandaExpedicao,
  type ItemSeparacao,
  type ModalidadeEntrega,
  type ResultadoMovimentacao,
  type RomaneioCarga,
  type StatusExpedicao,
} from "@/lib/expedicao-service";
import {
  MODULOS_PADRAO,
  mensagemModuloNaoContratado,
  verificarAcessoModulo,
  type TenantModulesConfig,
} from "@/lib/permissions";
import { imagemDoProduto } from "@/lib/product-images";

/* -------------------------------------------------------------------------- */
/*                                Configuração                                */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "matcom.tenant.modules";

/** Data de referência dos dados demonstrativos, usada também no primeiro render. */
const REFERENCIA_DEMO = "2026-11-09T12:00:00.000Z";

const CONFIG_MODULOS_INICIAL: TenantModulesConfig = { ...MODULOS_PADRAO };

/* -------------------------------------------------------------------------- */
/*                               Dados demo                                   */
/* -------------------------------------------------------------------------- */

function item(
  id: string,
  descricao: string,
  categoria: CategoriaMaterial,
  unidade: string,
  quantidade: number,
  localizacao: string,
  conferido = false,
): ItemSeparacao {
  return {
    id,
    descricao,
    imagemUrl: imagemDoProduto(descricao),
    categoria,
    unidade,
    quantidade,
    localizacao,
    conferido,
  };
}

const COMANDAS_DEMO: ComandaExpedicao[] = [
  {
    id: "exp-1051",
    numero: "#1051",
    cliente: "Construtora Horizonte Ltda.",
    documento: "12.345.678/0001-90",
    vendedor: "Ana Paula",
    modalidade: "ENTREGA",
    status: "AGUARDANDO_SEPARACAO",
    bairro: "Centro",
    endereco: "Av. das Obras, 850",
    referencia: "Próximo ao Posto Central",
    pesoKg: 5240,
    volumes: 24,
    pagoEm: "2026-11-09T08:20:00.000Z",
    itens: [
      item("1051-1", "Cimento CP II 50 kg", "CIMENTO", "SC", 60, "Corredor A · Pallet 02"),
      item("1051-2", "Areia Média Lavada", "AREIA", "M3", 4.5, "Pátio externo · Baia 1"),
      item("1051-3", "Vergalhão CA-50 10 mm · 12 m", "FERRO", "BR", 80, "Corredor C · Rack 04"),
      item("1051-4", "Tubo PVC 100 mm · 6 m", "TUBO", "PC", 18, "Corredor D · Rack 01"),
    ],
  },
  {
    id: "exp-1050",
    numero: "#1050",
    cliente: "Obra Residencial Silva",
    vendedor: "Carlos Lima",
    modalidade: "ENTREGA",
    status: "EM_SEPARACAO",
    bairro: "Jardim América",
    endereco: "Rua das Palmeiras, 142",
    referencia: "Portão preto após a esquina",
    pesoKg: 8640,
    volumes: 18,
    pagoEm: "2026-11-09T08:05:00.000Z",
    iniciadaEm: "2026-11-09T08:35:00.000Z",
    itens: [
      item("1050-1", "Tijolo baiano 8 furos", "TIJOLO", "UN", 2000, "Pátio externo · Baia 3", true),
      item("1050-2", "Cimento CP III 50 kg", "CIMENTO", "SC", 40, "Corredor A · Pallet 04", true),
      item("1050-3", "Areia Grossa Lavada", "AREIA", "M3", 6, "Pátio externo · Baia 2"),
      item("1050-4", "Tubo PVC 75 mm · 6 m", "TUBO", "PC", 12, "Corredor D · Rack 02"),
    ],
  },
  {
    id: "exp-1049",
    numero: "#1049",
    cliente: "Sigma Engenharia",
    documento: "98.765.432/0001-10",
    vendedor: "Bruno Lima",
    modalidade: "RETIRADA",
    status: "EM_SEPARACAO",
    bairro: "Industrial",
    endereco: "Estrada do Galpão, 2250",
    referencia: "Portaria 2 · Fundo de lote",
    pesoKg: 3100,
    volumes: 9,
    pagoEm: "2026-11-09T07:55:00.000Z",
    iniciadaEm: "2026-11-09T08:40:00.000Z",
    itens: [
      item("1049-1", "Vergalhão CA-50 12,5 mm · 12 m", "FERRO", "BR", 120, "Corredor C · Rack 01", true),
      item("1049-2", "Arame recozido BWG 18 · 10 kg", "FERRO", "KG", 10, "Corredor C · Gaveta 07", true),
      item("1049-3", "Tela soldada Q-138", "FERRO", "PC", 6, "Corredor C · Rack 09"),
    ],
  },
  {
    id: "exp-1048",
    numero: "#1048",
    cliente: "João Marcos Oliveira",
    vendedor: "Ana Paula",
    modalidade: "RETIRADA",
    status: "PRONTO",
    bairro: "Vila Nova",
    endereco: "Rua 15 de Novembro, 91",
    referencia: "Casa térrea azul",
    pesoKg: 1200,
    volumes: 7,
    pagoEm: "2026-11-09T07:40:00.000Z",
    iniciadaEm: "2026-11-09T07:50:00.000Z",
    prontaEm: "2026-11-09T08:12:00.000Z",
    itens: [
      item("1048-1", "Cimento CP II 50 kg", "CIMENTO", "SC", 20, "Corredor A · Pallet 01", true),
      item("1048-2", "Areia Média Lavada", "AREIA", "M3", 2, "Pátio externo · Baia 1", true),
      item("1048-3", "Tubo PVC 50 mm · 6 m", "TUBO", "PC", 8, "Corredor D · Rack 03", true),
    ],
  },
  {
    id: "exp-1047",
    numero: "#1047",
    cliente: "Depósito Rocha",
    documento: "45.678.901/0001-23",
    vendedor: "Carlos Lima",
    modalidade: "ENTREGA",
    status: "PRONTO",
    bairro: "Industrial",
    endereco: "Av. Industrial, 410",
    referencia: "Ao lado da balança",
    pesoKg: 12400,
    volumes: 32,
    pagoEm: "2026-11-09T07:05:00.000Z",
    iniciadaEm: "2026-11-09T07:15:00.000Z",
    prontaEm: "2026-11-09T07:58:00.000Z",
    motorista: "Marcos Vieira",
    veiculo: "ABC1D23",
    itens: [
      item("1047-1", "Tijolo cerâmico 9x19x19", "TIJOLO", "UN", 3000, "Pátio externo · Baia 4", true),
      item("1047-2", "Cimento CP II 50 kg", "CIMENTO", "SC", 100, "Corredor A · Pallet 05", true),
      item("1047-3", "Areia Grossa Lavada", "AREIA", "M3", 8, "Pátio externo · Baia 2", true),
    ],
  },
  {
    id: "exp-1046",
    numero: "#1046",
    cliente: "Maria Aparecida Santos",
    vendedor: "Bruno Lima",
    modalidade: "RETIRADA",
    status: "PRONTO",
    bairro: "Centro",
    endereco: "Rua São José, 45",
    referencia: "Ao lado da farmácia",
    pesoKg: 420,
    volumes: 5,
    pagoEm: "2026-11-09T06:50:00.000Z",
    iniciadaEm: "2026-11-09T06:58:00.000Z",
    prontaEm: "2026-11-09T07:21:00.000Z",
    itens: [
      item("1046-1", "Argamassa AC-III 20 kg", "ARGAMASSA", "SC", 15, "Corredor B · Pallet 01", true),
      item("1046-2", "Rejunte cinza 5 kg", "ARGAMASSA", "SC", 10, "Corredor B · Gaveta 03", true),
      item("1046-3", "Tubo PVC 25 mm · 6 m", "TUBO", "PC", 6, "Corredor D · Rack 05", true),
    ],
  },
  {
    id: "exp-1045",
    numero: "#1045",
    cliente: "Construtora Horizonte Ltda.",
    documento: "12.345.678/0001-90",
    vendedor: "Ana Paula",
    modalidade: "ENTREGA",
    status: "CONCLUIDO",
    bairro: "Centro",
    endereco: "Av. das Obras, 850",
    referencia: "Próximo ao Posto Central",
    pesoKg: 6300,
    volumes: 22,
    pagoEm: "2026-11-09T06:25:00.000Z",
    iniciadaEm: "2026-11-09T06:40:00.000Z",
    prontaEm: "2026-11-09T06:58:00.000Z",
    concluidaEm: "2026-11-09T07:10:00.000Z",
    emTransito: true,
    motorista: "Marcos Vieira",
    veiculo: "ABC1D23",
    itens: [
      item("1045-1", "Cimento CP II 50 kg", "CIMENTO", "SC", 80, "Corredor A · Pallet 03", true),
      item("1045-2", "Vergalhão CA-50 10 mm · 12 m", "FERRO", "BR", 100, "Corredor C · Rack 04", true),
      item("1045-3", "Areia Média Lavada", "AREIA", "M3", 5, "Pátio externo · Baia 1", true),
    ],
  },
  {
    id: "exp-1044",
    numero: "#1044",
    cliente: "José Carlos Pereira",
    vendedor: "Carlos Lima",
    modalidade: "RETIRADA",
    status: "CONCLUIDO",
    bairro: "Vila Nova",
    endereco: "Rua das Acácias, 12",
    referencia: "Casa com muro branco",
    pesoKg: 2600,
    volumes: 6,
    pagoEm: "2026-11-09T06:05:00.000Z",
    iniciadaEm: "2026-11-09T06:20:00.000Z",
    prontaEm: "2026-11-09T06:32:00.000Z",
    concluidaEm: "2026-11-09T06:37:00.000Z",
    retiradaRealizada: true,
    itens: [
      item("1044-1", "Tijolo baiano 8 furos", "TIJOLO", "UN", 1000, "Pátio externo · Baia 3", true),
      item("1044-2", "Cimento CP II 50 kg", "CIMENTO", "SC", 20, "Corredor A · Pallet 01", true),
      item("1044-3", "Tubo PVC 100 mm · 6 m", "TUBO", "PC", 4, "Corredor D · Rack 01", true),
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                             Formatação e metadados                         */
/* -------------------------------------------------------------------------- */

const pesoFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});
const quantidadeFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});
const dataHoraFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

type FiltroAba = "TODAS" | StatusExpedicao;
type FormatoRomaneio = "A4" | "80MM";

function formatarPeso(valor: number): string {
  return `${pesoFormatter.format(valor)} kg`;
}

function formatarQuantidade(valor: number): string {
  return quantidadeFormatter.format(valor);
}

function formatarDataHora(valor?: string | null): string {
  if (!valor) return "—";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";

  return dataHoraFormatter.format(data);
}

const STATUS_META: Record<
  StatusExpedicao,
  { className: string; icon: LucideIcon }
> = {
  AGUARDANDO_SEPARACAO: {
    className:
      "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
    icon: Clock3,
  },
  EM_SEPARACAO: {
    className:
      "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-900",
    icon: ClipboardCheck,
  },
  PRONTO: {
    className:
      "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-900",
    icon: PackageCheck,
  },
  CONCLUIDO: {
    className:
      "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900",
    icon: CheckCircle2,
  },
};

const MODALIDADE_META: Record<
  ModalidadeEntrega,
  { className: string; icon: LucideIcon }
> = {
  RETIRADA: {
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    icon: Store,
  },
  ENTREGA: {
    className:
      "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
    icon: Truck,
  },
};

const CATEGORIA_META: Record<CategoriaMaterial, string> = {
  CIMENTO:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  AREIA:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
  TIJOLO:
    "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-900",
  FERRO:
    "bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700",
  TUBO:
    "bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900",
  ARGAMASSA:
    "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:ring-fuchsia-900",
  OUTRO:
    "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
};

const ABAS: Array<{ valor: FiltroAba; rotulo: string; icon: LucideIcon }> = [
  { valor: "TODAS", rotulo: "Todas", icon: ClipboardList },
  {
    valor: "AGUARDANDO_SEPARACAO",
    rotulo: "Aguardando Separação",
    icon: Clock3,
  },
  { valor: "EM_SEPARACAO", rotulo: "Em Separação", icon: ClipboardCheck },
  { valor: "PRONTO", rotulo: "Pronto p/ Retirada", icon: PackageCheck },
  { valor: "CONCLUIDO", rotulo: "Entregue", icon: CheckCircle2 },
];

/* -------------------------------------------------------------------------- */
/*                              Componentes de UI                            */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: StatusExpedicao }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${meta.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {ROTULOS_STATUS[status]}
    </span>
  );
}

function ModalidadeBadge({ modalidade }: { modalidade: ModalidadeEntrega }) {
  const meta = MODALIDADE_META[modalidade];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${meta.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {ROTULOS_MODALIDADE[modalidade]}
    </span>
  );
}

function CategoriaBadge({ categoria }: { categoria: CategoriaMaterial }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${CATEGORIA_META[categoria]}`}
    >
      {ROTULOS_CATEGORIA[categoria]}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: "amber" | "sky" | "emerald" | "violet";
}) {
  const tones = {
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  } as const;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
        {helper}
      </p>
    </article>
  );
}

function ComandaCard({
  comanda,
  onIniciar,
  onConferir,
  onConferirTodos,
  onRomaneio,
  onSaida,
}: {
  comanda: ComandaExpedicao;
  onIniciar: (id: string) => void;
  onConferir: (comandaId: string, itemId: string) => void;
  onConferirTodos: (id: string) => void;
  onRomaneio: (id: string) => void;
  onSaida: (id: string) => void;
}) {
  const progresso = calcularProgressoConferencia(comanda);
  const conferidos = itensConferidos(comanda).length;
  const podeConferir = comanda.status === "EM_SEPARACAO";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {comanda.numero}
              </h3>
              <ModalidadeBadge modalidade={comanda.modalidade} />
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {comanda.cliente}
            </p>
          </div>
          <StatusBadge status={comanda.status} />
        </div>

        <div className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <strong className="text-zinc-700 dark:text-zinc-200">
                {comanda.bairro}
              </strong>{" "}
              · {comanda.endereco}
              {comanda.referencia ? (
                <span className="block text-[10px] italic">
                  Ref.: {comanda.referencia}
                </span>
              ) : null}
            </span>
          </p>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-2.5 text-[10px] dark:bg-zinc-950">
          <div>
            <dt className="font-bold uppercase tracking-wide text-zinc-400">
              Vendedor
            </dt>
            <dd className="mt-0.5 font-semibold text-zinc-700 dark:text-zinc-200">
              {comanda.vendedor}
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-zinc-400">
              Peso / Volumes
            </dt>
            <dd className="mt-0.5 font-semibold text-zinc-700 dark:text-zinc-200">
              {formatarPeso(comanda.pesoKg)} · {comanda.volumes} vol.
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-zinc-400">
              Pago no caixa
            </dt>
            <dd className="mt-0.5 font-semibold text-zinc-700 dark:text-zinc-200">
              {formatarDataHora(comanda.pagoEm)}
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-zinc-400">
              Início da separação
            </dt>
            <dd className="mt-0.5 font-semibold text-zinc-700 dark:text-zinc-200">
              {formatarDataHora(comanda.iniciadaEm)}
            </dd>
          </div>
        </dl>
      </header>

      <div className="flex-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Checklist de separação
          </p>
          <p className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-200">
            {conferidos}/{comanda.itens.length} · {progresso}%
          </p>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${
              progresso === 100 ? "bg-emerald-500" : "bg-violet-500"
            }`}
            style={{ width: `${progresso}%` }}
          />
        </div>

        <ul className="mt-3 space-y-2">
          {comanda.itens.map((produto) => (
            <li key={produto.id}>
              <label
                className={`flex items-start gap-2 rounded-xl border p-2.5 transition-colors ${
                  produto.conferido
                    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40"
                } ${
                  podeConferir
                    ? "cursor-pointer hover:border-violet-300 dark:hover:border-violet-800"
                    : "cursor-default"
                }`}
              >
                <input
                  type="checkbox"
                  checked={produto.conferido}
                  disabled={!podeConferir}
                  onChange={() => onConferir(comanda.id, produto.id)}
                  aria-label={`Conferir ${produto.descricao}`}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                />
                <img
                  src={
                    produto.imagemUrl ?? imagemDoProduto(produto.descricao)
                  }
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200 bg-white object-cover dark:border-zinc-700 dark:bg-zinc-900"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-snug text-zinc-800 dark:text-zinc-100">
                    {produto.descricao}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                    <CategoriaBadge categoria={produto.categoria} />
                    <span>{produto.localizacao}</span>
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-[11px] font-extrabold text-zinc-700 dark:text-zinc-200">
                  {formatarQuantidade(produto.quantidade)}{" "}
                  <span className="text-[9px] text-zinc-400">
                    {produto.unidade}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {comanda.status === "PRONTO" ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-sky-50 px-2.5 py-2 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
            <PackageCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Checklist completo. Libere a carga no romaneio e confirme a saída.
          </p>
        ) : null}

        {comanda.status === "CONCLUIDO" ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-2 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {comanda.retiradaRealizada
              ? `Retirada realizada no balcão em ${formatarDataHora(comanda.concluidaEm)}.`
              : comanda.emTransito
                ? `Carga em trânsito${comanda.motorista ? ` com ${comanda.motorista}` : ""} desde ${formatarDataHora(comanda.concluidaEm)}.`
                : `Comanda concluída em ${formatarDataHora(comanda.concluidaEm)}.`}
          </p>
        ) : null}
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        {comanda.status === "AGUARDANDO_SEPARACAO" ? (
          <button
            type="button"
            onClick={() => onIniciar(comanda.id)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700"
          >
            <Play className="h-4 w-4" aria-hidden />
            Iniciar Separação
          </button>
        ) : null}

        {comanda.status === "EM_SEPARACAO" ? (
          <>
            <button
              type="button"
              onClick={() => onConferirTodos(comanda.id)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/70"
            >
              <CheckCheck className="h-4 w-4" aria-hidden />
              Conferir Todos
            </button>
            <span className="flex items-center gap-1 px-1 text-[9px] font-semibold text-zinc-400">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Marque item a item
            </span>
          </>
        ) : null}

        {comanda.status === "PRONTO" ? (
          <>
            <button
              type="button"
              onClick={() => onRomaneio(comanda.id)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Gerar Romaneio de Carregamento
            </button>
            <button
              type="button"
              onClick={() => onSaida(comanda.id)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
            >
              <Truck className="h-4 w-4" aria-hidden />
              Confirmar Retirada / Saída do Galpão
            </button>
          </>
        ) : null}

        {comanda.status === "CONCLUIDO" ? (
          <p className="flex w-full items-center justify-center gap-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Expedição concluída
          </p>
        ) : null}
      </footer>
    </article>
  );
}

function RomaneioDocumento({
  romaneio,
  formato,
}: {
  romaneio: RomaneioCarga;
  formato: FormatoRomaneio;
}) {
  if (formato === "80MM") {
    return (
      <article className="mx-auto w-[80mm] max-w-full bg-white p-3 font-mono text-[9px] leading-tight text-black">
        <header className="border-b border-dashed border-black pb-2 text-center">
          <p className="text-[10px] font-black uppercase tracking-wide">
            MatCom Materiais
          </p>
          <p className="text-[8px] font-bold uppercase">
            Romaneio de Carga
          </p>
          <p className="text-[8px]">Via do Galpão · Expedição</p>
          <p className="mt-1 text-[8px]">
            {formatarDataHora(romaneio.geradoEm)}
          </p>
        </header>

        <dl className="mt-2 space-y-0.5 text-[8px]">
          <div className="flex justify-between gap-2">
            <dt>Motorista</dt>
            <dd className="text-right font-bold">{romaneio.motorista}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Veículo</dt>
            <dd className="text-right font-bold">{romaneio.veiculo}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Comandas</dt>
            <dd>{romaneio.totalComandas}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Peso / Volumes</dt>
            <dd className="text-right">
              {formatarPeso(romaneio.totalPesoKg)} ·{" "}
              {romaneio.totalVolumes} vol.
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Rotas</dt>
            <dd>{romaneio.rotas.length}</dd>
          </div>
        </dl>

        {romaneio.rotas.map((rota) => (
          <section
            key={rota.bairro}
            className="mt-2 break-inside-avoid border-t border-dashed border-black pt-1"
          >
            <p className="text-[9px] font-black uppercase">
              Rota: {rota.bairro}
            </p>
            <p className="text-[8px]">
              {rota.comandas.length} comanda(s) ·{" "}
              {formatarPeso(rota.pesoKg)} · {rota.volumes} vol.
            </p>

            {rota.comandas.map((comanda) => (
              <div
                key={comanda.id}
                className="mt-1 break-inside-avoid border-b border-dotted border-black pb-1"
              >
                <p className="font-black">
                  {comanda.numero} — {comanda.cliente}
                </p>
                <p>{comanda.endereco}</p>
                {comanda.referencia ? (
                  <p>Ref.: {comanda.referencia}</p>
                ) : null}
                <p>
                  {ROTULOS_MODALIDADE[comanda.modalidade]} ·{" "}
                  {comanda.vendedor}
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  {comanda.itens.map((produto) => (
                    <li
                      key={produto.id}
                      className="flex items-start justify-between gap-2"
                    >
                      <span>
                        {produto.conferido ? "[X]" : "[ ]"}{" "}
                        {produto.descricao}
                      </span>
                      <span className="shrink-0 font-bold">
                        {formatarQuantidade(produto.quantidade)}{" "}
                        {produto.unidade}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        <div className="mt-3 space-y-3 text-center text-[8px]">
          <p className="border-t border-black pt-1">
            Conferente do Pátio
          </p>
          <p className="border-t border-black pt-1">
            Motorista / Transporte
          </p>
          <p className="border-t border-black pt-1">
            Recebimento na Obra
          </p>
        </div>

        <p className="mt-3 text-center text-[7px]">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </p>
      </article>
    );
  }

  return (
    <article className="mx-auto w-full bg-white p-6 text-black">
      <header className="border-b-4 border-black pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">
              MatCom Materiais
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              ROMANEIO DE CARGA
            </h1>
            <p className="mt-1 text-sm">
              Via do Galpão · Expedição &amp; Separação
            </p>
          </div>
          <div className="text-right text-xs">
            <p>
              <strong>Motorista:</strong> {romaneio.motorista}
            </p>
            <p>
              <strong>Veículo:</strong> {romaneio.veiculo}
            </p>
            <p>
              <strong>Gerado em:</strong>{" "}
              {formatarDataHora(romaneio.geradoEm)}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <p>
          <strong>Comandas:</strong> {romaneio.totalComandas}
        </p>
        <p>
          <strong>Peso total:</strong>{" "}
          {formatarPeso(romaneio.totalPesoKg)}
        </p>
        <p>
          <strong>Volumes:</strong> {romaneio.totalVolumes}
        </p>
        <p>
          <strong>Rotas:</strong> {romaneio.rotas.length}
        </p>
      </div>

      {romaneio.rotas.map((rota) => (
        <section key={rota.bairro} className="mt-6 break-inside-avoid">
          <h2 className="border-b-2 border-black pb-1 text-lg font-black">
            ROTA · {rota.bairro}
          </h2>
          <p className="mt-1 text-[10px]">
            {rota.comandas.length} comanda(s) ·{" "}
            {formatarPeso(rota.pesoKg)} · {rota.volumes} volume(s)
          </p>

          {rota.comandas.map((comanda) => (
            <article
              key={comanda.id}
              className="mt-3 break-inside-avoid border border-black p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black">
                    {comanda.numero} — {comanda.cliente}
                  </h3>
                  <p className="mt-0.5 text-xs">
                    {comanda.endereco} · {comanda.bairro}
                  </p>
                  {comanda.referencia ? (
                    <p className="text-[10px] italic">
                      Referência: {comanda.referencia}
                    </p>
                  ) : null}
                </div>
                <div className="text-right text-[10px]">
                  <p className="font-bold">
                    {ROTULOS_MODALIDADE[comanda.modalidade]}
                  </p>
                  <p>Vendedor: {comanda.vendedor}</p>
                  <p>
                    {formatarPeso(comanda.pesoKg)} · {comanda.volumes}{" "}
                    vol.
                  </p>
                </div>
              </div>

              <table className="mt-2 w-full border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-black text-left">
                    <th className="py-1 pr-2">Produto</th>
                    <th className="py-1 pr-2 text-right">Qtd.</th>
                    <th className="py-1 pr-2">Un.</th>
                    <th className="py-1 pr-2">Setor</th>
                    <th className="py-1 text-center">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {comanda.itens.map((produto) => (
                    <tr
                      key={produto.id}
                      className="border-b border-zinc-400"
                    >
                      <td className="py-1 pr-2">{produto.descricao}</td>
                      <td className="py-1 pr-2 text-right">
                        {formatarQuantidade(produto.quantidade)}
                      </td>
                      <td className="py-1 pr-2">{produto.unidade}</td>
                      <td className="py-1 pr-2">
                        {produto.localizacao}
                      </td>
                      <td className="py-1 text-center font-bold">
                        {produto.conferido ? "OK" : "____"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </section>
      ))}

      <footer className="mt-10 grid grid-cols-3 gap-6 text-center text-[10px]">
        <div className="border-t border-black pt-2">
          Conferente do Pátio
        </div>
        <div className="border-t border-black pt-2">
          Motorista / Transporte
        </div>
        <div className="border-t border-black pt-2">
          Recebimento na Obra
        </div>
      </footer>

      <p className="mt-8 text-center text-[10px]">
        Criado por BCTech | Josemar Brito | Whatsapp 11972646617
      </p>
    </article>
  );
}

function ModuloBloqueado({
  rotulo,
  motivo,
  onAtivar,
}: {
  rotulo: string;
  motivo: string;
  onAtivar: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <article className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          <LockKeyhole className="h-7 w-7" aria-hidden />
        </span>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          Trava de modularidade
        </p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Módulo não contratado
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          O módulo <strong>{rotulo}</strong> está desativado para este tenant.
          {motivo ? ` ${motivo}` : ""}
        </p>

        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Como liberar
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            Ative a flag{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-[11px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              TenantModule.logistica
            </code>{" "}
            ou o alias{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-[11px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              expedicao
            </code>{" "}
            nas configurações da empresa.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onAtivar}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Ativar módulo nesta demonstração
          </button>
          <Link
            href="/configuracoes/empresa"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Abrir configurações
          </Link>
        </div>

        <p className="mt-6 text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </p>
      </article>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Página                                   */
/* -------------------------------------------------------------------------- */

export default function ExpedicaoPage() {
  const [configModulos, setConfigModulos] = useState<TenantModulesConfig>(
    CONFIG_MODULOS_INICIAL,
  );
  const [comandas, setComandas] =
    useState<ComandaExpedicao[]>(COMANDAS_DEMO);
  const [abaAtiva, setAbaAtiva] = useState<FiltroAba>("TODAS");
  const [busca, setBusca] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState<
    "TODAS" | ModalidadeEntrega
  >("TODAS");
  const [aviso, setAviso] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);
  const [modalRomaneioAberto, setModalRomaneioAberto] = useState(false);
  const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);
  const [motorista, setMotorista] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [romaneioImpresso, setRomaneioImpresso] =
    useState<RomaneioCarga | null>(null);
  const [formatoRomaneio, setFormatoRomaneio] =
    useState<FormatoRomaneio>("A4");
  const [referenciaHoje, setReferenciaHoje] = useState<Date | null>(null);

  useEffect(() => {
    setReferenciaHoje(new Date());
  }, []);

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(STORAGE_KEY);
      if (!bruto) return;

      const config = JSON.parse(bruto) as TenantModulesConfig;
      if (config && typeof config === "object") {
        setConfigModulos(config);
      }
    } catch {
      // Configuração inválida no storage não deve derrubar a operação.
    }
  }, []);

  useEffect(() => {
    if (!modalRomaneioAberto) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalRomaneioAberto(false);
      }
    }

    window.addEventListener("keydown", fecharComEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", fecharComEscape);
    };
  }, [modalRomaneioAberto]);

  const acesso = verificarAcessoModulo(configModulos, "expedicao");
  const comandasPesadas = useMemo(
    () => comandas.filter(comandaTemMaterialPesado),
    [comandas],
  );
  const indicadores = useMemo(
    () =>
      calcularIndicadoresExpedicao(
        comandasPesadas,
        referenciaHoje ?? REFERENCIA_DEMO,
      ),
    [comandasPesadas, referenciaHoje],
  );
  const contadores = useMemo(
    () => contarComandasPorStatus(comandasPesadas),
    [comandasPesadas],
  );
  const comandasProntas = useMemo(
    () => comandasPesadas.filter((comanda) => comanda.status === "PRONTO"),
    [comandasPesadas],
  );

  const comandasVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return comandasPesadas.filter((comanda) => {
      if (abaAtiva !== "TODAS" && comanda.status !== abaAtiva) return false;
      if (
        filtroModalidade !== "TODAS" &&
        comanda.modalidade !== filtroModalidade
      ) {
        return false;
      }
      if (!termo) return true;

      return [
        comanda.numero,
        comanda.cliente,
        comanda.bairro,
        comanda.endereco,
        comanda.vendedor,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [comandasPesadas, abaAtiva, filtroModalidade, busca]);

  const comandasSelecionadas = useMemo(
    () =>
      comandas.filter((comanda) => idsSelecionados.includes(comanda.id)),
    [comandas, idsSelecionados],
  );

  const previewRomaneio = useMemo(
    () => montarRomaneio(comandasSelecionadas, { motorista, veiculo }),
    [comandasSelecionadas, motorista, veiculo],
  );

  const todasSelecionadas =
    comandasProntas.length > 0 &&
    comandasProntas.every((comanda) =>
      idsSelecionados.includes(comanda.id),
    );

  if (!acesso.permitido) {
    return (
      <ModuloBloqueado
        rotulo={acesso.rotulo}
        motivo={acesso.motivo ?? mensagemModuloNaoContratado("expedicao")}
        onAtivar={() => definirModuloAtivo(true)}
      />
    );
  }

  function persistirModulos(config: TenantModulesConfig) {
    setConfigModulos(config);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Sem persistência local, a tela continua funcionando em memória.
    }
  }

  function definirModuloAtivo(ativo: boolean) {
    persistirModulos({
      ...configModulos,
      logistica: ativo,
      expedicao: ativo,
    });
    setAviso(null);
  }

  function aplicarResultado(resultado: ResultadoMovimentacao) {
    if (!resultado.ok) {
      setAviso({ tipo: "erro", texto: resultado.mensagem });
      return;
    }

    setComandas((atuais) =>
      atuais.map((comanda) =>
        comanda.id === resultado.comanda.id ? resultado.comanda : comanda,
      ),
    );
    setAviso({ tipo: "sucesso", texto: resultado.mensagem });
  }

  function iniciar(id: string) {
    const comanda = comandas.find((registro) => registro.id === id);
    if (!comanda) return;

    aplicarResultado(iniciarSeparacao(comanda, new Date()));
  }

  function alternarItem(comandaId: string, itemId: string) {
    const comanda = comandas.find((registro) => registro.id === comandaId);
    if (!comanda) return;

    const produto = comanda.itens.find((registro) => registro.id === itemId);
    if (!produto) return;

    aplicarResultado(
      conferirItem(comanda, itemId, !produto.conferido, new Date()),
    );
  }

  function conferirTudo(id: string) {
    const comanda = comandas.find((registro) => registro.id === id);
    if (!comanda) return;

    aplicarResultado(conferirTodosItens(comanda, new Date()));
  }

  function confirmarSaida(id: string) {
    const comanda = comandas.find((registro) => registro.id === id);
    if (!comanda) return;

    aplicarResultado(confirmarSaidaGalpao(comanda, new Date()));
  }

  function abrirRomaneio(comandaId?: string) {
    if (comandasProntas.length === 0) {
      setAviso({
        tipo: "erro",
        texto:
          "Nenhuma comanda está pronta. Conclua o checklist de separação antes de montar o romaneio.",
      });
      return;
    }

    if (comandaId) {
      const alvo = comandas.find((comanda) => comanda.id === comandaId);

      if (!alvo || alvo.status !== "PRONTO") {
        setAviso({
          tipo: "erro",
          texto:
            "Somente comandas prontas para retirada/carregamento podem entrar no romaneio.",
        });
        return;
      }

      setIdsSelecionados([alvo.id]);
      setMotorista(alvo.motorista ?? "");
      setVeiculo(alvo.veiculo ?? "");
    } else {
      setIdsSelecionados(comandasProntas.map((comanda) => comanda.id));
      setMotorista(
        comandasProntas.find((comanda) => comanda.motorista)?.motorista ?? "",
      );
      setVeiculo(
        comandasProntas.find((comanda) => comanda.veiculo)?.veiculo ?? "",
      );
    }

    setModalRomaneioAberto(true);
  }

  function alternarSelecionada(id: string) {
    setIdsSelecionados((atuais) =>
      atuais.includes(id)
        ? atuais.filter((registro) => registro !== id)
        : [...atuais, id],
    );
  }

  function selecionarTodasProntas() {
    setIdsSelecionados(
      todasSelecionadas
        ? []
        : comandasProntas.map((comanda) => comanda.id),
    );
  }

  function imprimirRomaneio() {
    const resultado = montarRomaneio(comandasSelecionadas, {
      motorista,
      veiculo,
      geradoEm: new Date(),
    });

    if (!resultado.ok) {
      setAviso({ tipo: "erro", texto: resultado.erros.join(" ") });
      return;
    }

    const { romaneio } = resultado;

    setComandas((atuais) =>
      atuais.map((comanda) =>
        idsSelecionados.includes(comanda.id)
          ? {
              ...comanda,
              motorista: romaneio.motorista,
              veiculo: romaneio.veiculo,
            }
          : comanda,
      ),
    );
    setRomaneioImpresso(romaneio);
    setModalRomaneioAberto(false);
    setAviso({
      tipo: "sucesso",
      texto: `Romaneio gerado para ${romaneio.totalComandas} comanda(s) · ${romaneio.motorista} · ${romaneio.veiculo}.`,
    });

    window.setTimeout(() => window.print(), 120);
  }

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/70 print:hidden dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-600/20">
                  <Boxes className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                    Estoque &amp; Logística
                  </p>
                  <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                    Expedição &amp; Separação de Galpão
                  </h1>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
                    Conferência de materiais pesados no pátio, romaneio de
                    carga por motorista e rota de bairro.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Módulo ativo
                </div>
                <button
                  type="button"
                  onClick={() => definirModuloAtivo(false)}
                  title="Demonstração da trava de modularidade: desativa o módulo para este tenant"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
                  Simular módulo desativado
                </button>
                <button
                  type="button"
                  onClick={() => abrirRomaneio()}
                  disabled={comandasProntas.length === 0}
                  title={
                    comandasProntas.length === 0
                      ? "Nenhuma comanda pronta para carregamento."
                      : "Gerar romaneio com as comandas prontas"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none dark:disabled:bg-violet-950 dark:disabled:text-violet-500"
                >
                  <Printer className="h-4 w-4" aria-hidden />
                  Gerar Romaneio
                </button>
              </div>
            </div>
          </header>

          <section
            aria-label="Indicadores da expedição"
            className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <MetricCard
              label="Comandas Abertas para Separação"
              value={String(indicadores.comandasAbertasParaSeparacao)}
              helper="Comandas pagas no caixa aguardando o conferente no pátio."
              icon={ClipboardList}
              tone="amber"
            />
            <MetricCard
              label="Separações em Andamento"
              value={String(indicadores.separacoesEmAndamento)}
              helper="Conferentes com checklist aberto neste momento no galpão."
              icon={ClipboardCheck}
              tone="violet"
            />
            <MetricCard
              label="Entregas em Trânsito (Caminhão)"
              value={String(indicadores.entregasEmTransito)}
              helper="Cargas que já saíram do galpão e estão na rota do motorista."
              icon={Truck}
              tone="sky"
            />
            <MetricCard
              label="Retiradas no Balcão Concluídas Hoje"
              value={String(indicadores.retiradasNoBalcaoHoje)}
              helper="Retiradas finalizadas hoje com conferência e assinatura do cliente."
              icon={Store}
              tone="emerald"
            />
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-2 pt-2 dark:border-zinc-800">
              {ABAS.map((aba) => {
                const Icon = aba.icon;
                const ativa = abaAtiva === aba.valor;
                const quantidade =
                  aba.valor === "TODAS"
                    ? comandasPesadas.length
                    : contadores[aba.valor];

                return (
                  <button
                    key={aba.valor}
                    type="button"
                    onClick={() => setAbaAtiva(aba.valor)}
                    aria-pressed={ativa}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-t-xl border-b-2 px-3 py-3 text-[11px] font-bold transition-colors ${
                      ativa
                        ? "border-violet-600 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/30 dark:text-violet-300"
                        : "border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-950 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="whitespace-nowrap">{aba.rotulo}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${
                        ativa
                          ? "bg-violet-600 text-white dark:bg-violet-400 dark:text-zinc-950"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {quantidade}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar comanda, cliente ou bairro"
                  aria-label="Buscar comanda, cliente ou bairro"
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-sm font-medium text-zinc-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <select
                value={filtroModalidade}
                onChange={(event) =>
                  setFiltroModalidade(
                    event.target.value as "TODAS" | ModalidadeEntrega,
                  )
                }
                aria-label="Filtrar por modalidade de entrega"
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="TODAS">Todas as modalidades</option>
                <option value="ENTREGA">Entrega no caminhão</option>
                <option value="RETIRADA">Retirada no balcão</option>
              </select>
            </div>
          </section>

          {aviso ? (
            <div
              role="status"
              className={`mt-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-semibold ${
                aviso.tipo === "sucesso"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
              }`}
            >
              <span className="flex items-start gap-2">
                {aviso.tipo === "sucesso" ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                ) : (
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                )}
                {aviso.texto}
              </span>
              <button
                type="button"
                onClick={() => setAviso(null)}
                aria-label="Fechar aviso"
                className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}

          <section
            aria-label="Comandas da etapa selecionada"
            className="mt-4"
          >
            {comandasVisiveis.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {comandasVisiveis.map((comanda) => (
                  <ComandaCard
                    key={comanda.id}
                    comanda={comanda}
                    onIniciar={iniciar}
                    onConferir={alternarItem}
                    onConferirTodos={conferirTudo}
                    onRomaneio={abrirRomaneio}
                    onSaida={confirmarSaida}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                <PackageCheck
                  className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600"
                  aria-hidden
                />
                <p className="mt-3 text-sm font-bold text-zinc-700 dark:text-zinc-200">
                  Nenhuma comanda nesta etapa
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Ajuste a busca, a modalidade ou selecione outra aba para
                  visualizar a fila.
                </p>
              </div>
            )}
          </section>

          <footer className="py-7 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
            Criado por BCTech | Josemar Brito | Whatsapp 11972646617
          </footer>
        </div>
      </div>

      {modalRomaneioAberto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="romaneio-titulo"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
        >
          <div className="flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-3xl sm:rounded-3xl">
            <header className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                  Logística de entrega
                </p>
                <h2
                  id="romaneio-titulo"
                  className="mt-1 text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50"
                >
                  Romaneio de Carga
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Agrupe as comandas prontas por motorista/caminhão e rota de
                  bairro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRomaneioAberto(false)}
                aria-label="Fechar romaneio"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Motorista
                  <input
                    value={motorista}
                    onChange={(event) => setMotorista(event.target.value)}
                    placeholder="Nome do motorista"
                    className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-normal normal-case text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
                <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Placa do veículo/caminhão
                  <input
                    value={veiculo}
                    onChange={(event) =>
                      setVeiculo(event.target.value.toUpperCase())
                    }
                    placeholder="ABC1D23"
                    maxLength={8}
                    className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-normal uppercase text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
              </div>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                    <ClipboardCheck className="h-4 w-4" aria-hidden />
                    Comandas prontas ({comandasProntas.length})
                  </h3>
                  <button
                    type="button"
                    onClick={selecionarTodasProntas}
                    disabled={comandasProntas.length === 0}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {todasSelecionadas ? "Limpar seleção" : "Selecionar todas"}
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {comandasProntas.length > 0 ? (
                    comandasProntas.map((comanda) => {
                      const selecionada = idsSelecionados.includes(
                        comanda.id,
                      );

                      return (
                        <label
                          key={comanda.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition-colors ${
                            selecionada
                              ? "border-violet-300 bg-violet-50/70 dark:border-violet-800 dark:bg-violet-950/20"
                              : "border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selecionada}
                            onChange={() =>
                              alternarSelecionada(comanda.id)
                            }
                            aria-label={`Selecionar comanda ${comanda.numero}`}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100">
                                {comanda.numero}
                              </span>
                              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                                {comanda.cliente}
                              </span>
                              <ModalidadeBadge
                                modalidade={comanda.modalidade}
                              />
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                              <span className="inline-flex items-center gap-1">
                                <Route className="h-3 w-3" aria-hidden />
                                {comanda.bairro}
                              </span>
                              <span>{formatarPeso(comanda.pesoKg)}</span>
                              <span>{comanda.volumes} vol.</span>
                              {comanda.motorista ? (
                                <span className="inline-flex items-center gap-1">
                                  <UserRound
                                    className="h-3 w-3"
                                    aria-hidden
                                  />
                                  {comanda.motorista}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      Nenhuma comanda pronta para o romaneio.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                    <Printer className="h-4 w-4" aria-hidden />
                    Formato do romaneio
                  </h3>
                  <div
                    role="group"
                    aria-label="Formato de impressão do romaneio"
                    className="inline-flex rounded-xl border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {(["A4", "80MM"] as const).map((formato) => {
                      const ativo = formatoRomaneio === formato;

                      return (
                        <button
                          key={formato}
                          type="button"
                          onClick={() => setFormatoRomaneio(formato)}
                          aria-pressed={ativo}
                          className={`rounded-lg px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors ${
                            ativo
                              ? "bg-violet-600 text-white dark:bg-violet-400 dark:text-zinc-950"
                              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                          }`}
                        >
                          {formato === "A4" ? "A4" : "80 mm"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                  {formatoRomaneio === "A4"
                    ? "Folha A4 para a via do galpão e assinaturas."
                    : "Bobina térmica de 80 mm para a via do motorista."}
                </p>

                {previewRomaneio.ok ? (
                  <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-zinc-300 bg-zinc-200/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
                    <RomaneioDocumento
                      romaneio={previewRomaneio.romaneio}
                      formato={formatoRomaneio}
                    />
                  </div>
                ) : (
                  <ul className="mt-3 space-y-1">
                    {previewRomaneio.erros.map((erro) => (
                      <li
                        key={erro}
                        className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300"
                      >
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        {erro}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                  <Route className="h-4 w-4" aria-hidden />
                  Prévia das rotas de bairro
                </h3>

                {previewRomaneio.ok ? (
                  <div className="mt-3 space-y-2">
                    {previewRomaneio.romaneio.rotas.map((rota) => (
                      <div
                        key={rota.bairro}
                        className="rounded-xl border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100">
                            {rota.bairro}
                          </p>
                          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                            {rota.comandas.length} comanda(s) ·{" "}
                            {formatarPeso(rota.pesoKg)} · {rota.volumes} vol.
                          </p>
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                          {rota.comandas
                            .map((comanda) => comanda.numero)
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                    <p className="flex flex-wrap items-center gap-x-3 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                      <span>
                        Total: {previewRomaneio.romaneio.totalComandas}{" "}
                        comanda(s)
                      </span>
                      <span>
                        {formatarPeso(previewRomaneio.romaneio.totalPesoKg)}
                      </span>
                      <span>
                        {previewRomaneio.romaneio.totalVolumes} volume(s)
                      </span>
                    </p>
                  </div>
                ) : (
                  <ul className="mt-3 space-y-1">
                    {previewRomaneio.erros.map((erro) => (
                      <li
                        key={erro}
                        className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300"
                      >
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        {erro}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalRomaneioAberto(false)}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={imprimirRomaneio}
                disabled={!previewRomaneio.ok}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none dark:disabled:bg-violet-950 dark:disabled:text-violet-500"
              >
                <Printer className="h-4 w-4" aria-hidden />
                Imprimir Romaneio ({formatoRomaneio === "A4" ? "A4" : "80 mm"})
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {romaneioImpresso ? (
        <section className="hidden print:block">
          <style>{`@page { size: ${formatoRomaneio === "A4" ? "A4 portrait" : "80mm auto"}; margin: 0; }`}</style>
          <RomaneioDocumento
            romaneio={romaneioImpresso}
            formato={formatoRomaneio}
          />
        </section>
      ) : null}
    </>
  );
}
