"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  MessageCircle,
  PackageSearch,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";

import {
  calcularEstoqueMinimoDinamico,
  type CurvaAbc,
  type ResultadoEstoqueDinamico,
  type StatusEstoque,
} from "@/lib/estoque-dinamico";
import { imagemDoProduto } from "@/lib/product-images";

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

type FornecedorId = "VOTORANTIM" | "TIGRE" | "AMANCO" | "GERDAU";
type FiltroFornecedor = FornecedorId | "TODOS";
type FiltroCurva = CurvaAbc | "TODAS";
type FiltroStatus = StatusEstoque | "TODOS";

interface Fornecedor {
  id: FornecedorId;
  nome: string;
  cidade: string;
}

interface ProdutoCompra {
  id: string;
  codigo: string;
  ean: string;
  descricao: string;
  unidade: string;
  fornecedorId: FornecedorId;
  curva: CurvaAbc;
  estoqueAtual: number;
  vendaMediaDiaria: number;
  tempoReposicaoDias: number;
  ultimoCusto: number;
}

interface ProdutoCalculado extends ProdutoCompra {
  imagemUrl: string;
  calculo: ResultadoEstoqueDinamico;
}

/* -------------------------------------------------------------------------- */
/*                              Dados de apoio                                */
/* -------------------------------------------------------------------------- */

const FORNECEDORES: Fornecedor[] = [
  {
    id: "VOTORANTIM",
    nome: "Votorantim Cimentos",
    cidade: "São Paulo · SP",
  },
  {
    id: "TIGRE",
    nome: "Tigre Tubos e Conexões",
    cidade: "Joinville · SC",
  },
  {
    id: "AMANCO",
    nome: "Amanco Brasil",
    cidade: "Sumaré · SP",
  },
  {
    id: "GERDAU",
    nome: "Gerdau Aços",
    cidade: "Ouro Branco · MG",
  },
];

const PRODUTOS: ProdutoCompra[] = [
  {
    id: "cim-001",
    codigo: "CIM-001",
    ean: "7891234500011",
    descricao: "Cimento CP II 50 kg",
    unidade: "SC",
    fornecedorId: "VOTORANTIM",
    curva: "A",
    estoqueAtual: 18,
    vendaMediaDiaria: 6.2,
    tempoReposicaoDias: 5,
    ultimoCusto: 38.9,
  },
  {
    id: "cim-002",
    codigo: "CIM-002",
    ean: "7891234500028",
    descricao: "Cimento CP III 50 kg",
    unidade: "SC",
    fornecedorId: "VOTORANTIM",
    curva: "B",
    estoqueAtual: 90,
    vendaMediaDiaria: 2.4,
    tempoReposicaoDias: 7,
    ultimoCusto: 41.5,
  },
  {
    id: "arg-010",
    codigo: "ARG-010",
    ean: "7891234500103",
    descricao: "Argamassa AC-II 20 kg",
    unidade: "SC",
    fornecedorId: "VOTORANTIM",
    curva: "B",
    estoqueAtual: 28,
    vendaMediaDiaria: 3.1,
    tempoReposicaoDias: 6,
    ultimoCusto: 21.75,
  },
  {
    id: "arg-020",
    codigo: "ARG-020",
    ean: "7891234500202",
    descricao: "Argamassa AC-III 20 kg",
    unidade: "SC",
    fornecedorId: "VOTORANTIM",
    curva: "A",
    estoqueAtual: 55,
    vendaMediaDiaria: 2.8,
    tempoReposicaoDias: 6,
    ultimoCusto: 27.4,
  },
  {
    id: "cal-001",
    codigo: "CAL-001",
    ean: "7891234500301",
    descricao: "Cal Hidratada 20 kg",
    unidade: "SC",
    fornecedorId: "VOTORANTIM",
    curva: "C",
    estoqueAtual: 42,
    vendaMediaDiaria: 0.7,
    tempoReposicaoDias: 8,
    ultimoCusto: 14.2,
  },
  {
    id: "blo-001",
    codigo: "BLO-001",
    ean: "7891234500400",
    descricao: "Bloco de Concreto 14x19x39",
    unidade: "UN",
    fornecedorId: "VOTORANTIM",
    curva: "C",
    estoqueAtual: 0,
    vendaMediaDiaria: 18,
    tempoReposicaoDias: 4,
    ultimoCusto: 3.15,
  },
  {
    id: "tub-100",
    codigo: "TUB-100",
    ean: "7891234501007",
    descricao: "Tubo PVC 100 mm · 6 m",
    unidade: "PC",
    fornecedorId: "TIGRE",
    curva: "A",
    estoqueAtual: 24,
    vendaMediaDiaria: 3.5,
    tempoReposicaoDias: 8,
    ultimoCusto: 86.5,
  },
  {
    id: "tub-050",
    codigo: "TUB-050",
    ean: "7891234501106",
    descricao: "Tubo PVC 50 mm · 6 m",
    unidade: "PC",
    fornecedorId: "TIGRE",
    curva: "B",
    estoqueAtual: 62,
    vendaMediaDiaria: 2.2,
    tempoReposicaoDias: 9,
    ultimoCusto: 45.3,
  },
  {
    id: "con-001",
    codigo: "CON-001",
    ean: "7891234501205",
    descricao: "Joelho PVC 100 mm · 90°",
    unidade: "UN",
    fornecedorId: "TIGRE",
    curva: "C",
    estoqueAtual: 15,
    vendaMediaDiaria: 1.4,
    tempoReposicaoDias: 10,
    ultimoCusto: 8.9,
  },
  {
    id: "cxa-310",
    codigo: "CXA-310",
    ean: "7891234501304",
    descricao: "Caixa d'Água 310 L",
    unidade: "UN",
    fornecedorId: "TIGRE",
    curva: "C",
    estoqueAtual: 7,
    vendaMediaDiaria: 0.8,
    tempoReposicaoDias: 12,
    ultimoCusto: 129.9,
  },
  {
    id: "reg-001",
    codigo: "REG-001",
    ean: "7891234501403",
    descricao: "Registro Gaveta 3/4",
    unidade: "UN",
    fornecedorId: "TIGRE",
    curva: "B",
    estoqueAtual: 36,
    vendaMediaDiaria: 1.1,
    tempoReposicaoDias: 7,
    ultimoCusto: 32.5,
  },
  {
    id: "tub-075",
    codigo: "TUB-075",
    ean: "7891234502004",
    descricao: "Tubo PVC 75 mm · 6 m",
    unidade: "PC",
    fornecedorId: "AMANCO",
    curva: "B",
    estoqueAtual: 40,
    vendaMediaDiaria: 2.6,
    tempoReposicaoDias: 6,
    ultimoCusto: 57.8,
  },
  {
    id: "con-002",
    codigo: "CON-002",
    ean: "7891234502103",
    descricao: "Tê PVC 75 mm · 90°",
    unidade: "UN",
    fornecedorId: "AMANCO",
    curva: "C",
    estoqueAtual: 8,
    vendaMediaDiaria: 1.2,
    tempoReposicaoDias: 6,
    ultimoCusto: 6.45,
  },
  {
    id: "cxa-500",
    codigo: "CXA-500",
    ean: "7891234502202",
    descricao: "Caixa d'Água 500 L",
    unidade: "UN",
    fornecedorId: "AMANCO",
    curva: "A",
    estoqueAtual: 5,
    vendaMediaDiaria: 1.6,
    tempoReposicaoDias: 5,
    ultimoCusto: 289,
  },
  {
    id: "adt-001",
    codigo: "ADT-001",
    ean: "7891234502301",
    descricao: "Adesivo PVC 175 g",
    unidade: "UN",
    fornecedorId: "AMANCO",
    curva: "C",
    estoqueAtual: 24,
    vendaMediaDiaria: 0.9,
    tempoReposicaoDias: 7,
    ultimoCusto: 12.3,
  },
  {
    id: "tub-025",
    codigo: "TUB-025",
    ean: "7891234502400",
    descricao: "Tubo PVC 25 mm · 6 m",
    unidade: "PC",
    fornecedorId: "AMANCO",
    curva: "C",
    estoqueAtual: 12,
    vendaMediaDiaria: 1.8,
    tempoReposicaoDias: 6,
    ultimoCusto: 18.9,
  },
  {
    id: "ver-100",
    codigo: "VER-100",
    ean: "7891234503001",
    descricao: "Vergalhão CA-50 10 mm · 12 m",
    unidade: "BAR",
    fornecedorId: "GERDAU",
    curva: "A",
    estoqueAtual: 30,
    vendaMediaDiaria: 5.5,
    tempoReposicaoDias: 7,
    ultimoCusto: 68.9,
  },
  {
    id: "tel-001",
    codigo: "TEL-001",
    ean: "7891234503100",
    descricao: "Tela Soldada Q-138",
    unidade: "PC",
    fornecedorId: "GERDAU",
    curva: "B",
    estoqueAtual: 18,
    vendaMediaDiaria: 1.3,
    tempoReposicaoDias: 10,
    ultimoCusto: 198,
  },
  {
    id: "bar-001",
    codigo: "BAR-001",
    ean: "7891234503209",
    descricao: "Barra Chata 1/4",
    unidade: "BAR",
    fornecedorId: "GERDAU",
    curva: "C",
    estoqueAtual: 46,
    vendaMediaDiaria: 0.6,
    tempoReposicaoDias: 12,
    ultimoCusto: 24.5,
  },
];

const PRODUTOS_CALCULADOS: ProdutoCalculado[] = PRODUTOS.map((produto) => ({
  ...produto,
  imagemUrl: imagemDoProduto(produto.descricao),
  calculo: calcularEstoqueMinimoDinamico({
    vendaMediaDiaria: produto.vendaMediaDiaria,
    tempoReposicaoDias: produto.tempoReposicaoDias,
    curvaAbc: produto.curva,
    estoqueAtual: produto.estoqueAtual,
  }),
}));

const FORNECEDOR_POR_ID: Record<FornecedorId, Fornecedor> = FORNECEDORES.reduce(
  (acumulado, fornecedor) => {
    acumulado[fornecedor.id] = fornecedor;
    return acumulado;
  },
  {} as Record<FornecedorId, Fornecedor>,
);

/* -------------------------------------------------------------------------- */
/*                              Apresentação                                  */
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

const CURVA_META: Record<
  CurvaAbc,
  { label: string; className: string }
> = {
  A: {
    label: "A",
    className:
      "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/70 dark:text-violet-300 dark:ring-violet-800",
  },
  B: {
    label: "B",
    className:
      "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:ring-sky-800",
  },
  C: {
    label: "C",
    className:
      "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  },
};

const STATUS_META: Record<
  StatusEstoque,
  { label: string; className: string; icon: LucideIcon }
> = {
  CRITICO: {
    label: "Crítico",
    className:
      "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900",
    icon: AlertTriangle,
  },
  REPOR: {
    label: "Repor",
    className:
      "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
    icon: Clock3,
  },
  OK: {
    label: "OK",
    className:
      "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900",
    icon: CheckCircle2,
  },
};

function CurvaBadge({ curva }: { curva: CurvaAbc }) {
  const meta = CURVA_META[curva];

  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-extrabold ring-1 ${meta.className}`}
      title={`Curva ABC ${meta.label}`}
    >
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: StatusEstoque }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${meta.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
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
  tone: "violet" | "rose" | "amber" | "emerald";
}) {
  const tones = {
    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
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

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        {label}
      </label>
      <div className="relative mt-1">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-zinc-300 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-zinc-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Página                                   */
/* -------------------------------------------------------------------------- */

export default function SugestaoCompraPage() {
  const [fornecedorId, setFornecedorId] =
    useState<FiltroFornecedor>("VOTORANTIM");
  const [curva, setCurva] = useState<FiltroCurva>("TODAS");
  const [status, setStatus] = useState<FiltroStatus>("TODOS");
  const [quantidades, setQuantidades] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      PRODUTOS_CALCULADOS.map((produto) => [
        produto.id,
        produto.calculo.sugestaoCompra,
      ]),
    ),
  );
  const [pedidoAberto, setPedidoAberto] = useState(false);

  useEffect(() => {
    if (!pedidoAberto) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPedidoAberto(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pedidoAberto]);

  const produtosBase = useMemo(
    () =>
      PRODUTOS_CALCULADOS.filter(
        (produto) =>
          (fornecedorId === "TODOS" ||
            produto.fornecedorId === fornecedorId) &&
          (curva === "TODAS" || produto.curva === curva),
      ),
    [fornecedorId, curva],
  );

  const produtosFiltrados = useMemo(
    () =>
      produtosBase.filter(
        (produto) => status === "TODOS" || produto.calculo.status === status,
      ),
    [produtosBase, status],
  );

  const itensReposicao = useMemo(
    () =>
      produtosBase.filter((produto) => produto.calculo.status !== "OK"),
    [produtosBase],
  );

  const investimentoEstimado = useMemo(
    () =>
      itensReposicao.reduce((total, produto) => {
        const quantidade =
          quantidades[produto.id] ?? produto.calculo.sugestaoCompra;

        return total + quantidade * produto.ultimoCusto;
      }, 0),
    [itensReposicao, quantidades],
  );

  const itensCriticos = useMemo(
    () =>
      produtosBase.filter(
        (produto) => produto.calculo.status === "CRITICO",
      ).length,
    [produtosBase],
  );

  const prazoMedioEntrega = useMemo(() => {
    if (produtosBase.length === 0) {
      return 0;
    }

    const soma = produtosBase.reduce(
      (total, produto) => total + produto.tempoReposicaoDias,
      0,
    );

    return Math.round(soma / produtosBase.length);
  }, [produtosBase]);

  const itensPedido = useMemo(
    () =>
      produtosFiltrados
        .map((produto) => ({
          produto,
          quantidade: quantidades[produto.id] ?? produto.calculo.sugestaoCompra,
        }))
        .filter((item) => item.quantidade > 0),
    [produtosFiltrados, quantidades],
  );

  const totalPedido = useMemo(
    () =>
      itensPedido.reduce(
        (total, item) => total + item.quantidade * item.produto.ultimoCusto,
        0,
      ),
    [itensPedido],
  );

  const fornecedorAtual =
    fornecedorId === "TODOS" ? null : FORNECEDOR_POR_ID[fornecedorId];
  const nomeFornecedorAtual =
    fornecedorAtual?.nome ?? "Todos os fornecedores";

  function alterarQuantidade(produtoId: string, valor: string) {
    const numero = Number(valor);

    setQuantidades((atuais) => ({
      ...atuais,
      [produtoId]:
        Number.isFinite(numero) && numero >= 0 ? Math.round(numero) : 0,
    }));
  }

  function restaurarSugestao(produtoId: string) {
    const produto = PRODUTOS_CALCULADOS.find((item) => item.id === produtoId);

    if (!produto) {
      return;
    }

    setQuantidades((atuais) => ({
      ...atuais,
      [produtoId]: produto.calculo.sugestaoCompra,
    }));
  }

  function restaurarTodasAsSugestoes() {
    setQuantidades(
      Object.fromEntries(
        PRODUTOS_CALCULADOS.map((produto) => [
          produto.id,
          produto.calculo.sugestaoCompra,
        ]),
      ),
    );
  }

  function enviarWhatsApp() {
    const linhas = [
      "*Pedido de Compra — MatCom SaaS*",
      `Fornecedor: ${nomeFornecedorAtual}`,
      `Data: ${new Date().toLocaleDateString("pt-BR")}`,
      "",
      ...itensPedido.map(
        (item) =>
          `• ${formatQuantity(item.quantidade)} ${item.produto.unidade} — ${item.produto.descricao} (${item.produto.codigo})`,
      ),
      "",
      `Total estimado: ${formatBRL(totalPedido)}`,
      "",
      "Criado por BCTech | Josemar Brito | Whatsapp 11972646617",
    ];

    window.open(
      `https://wa.me/?text=${encodeURIComponent(linhas.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/70 print:hidden dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Cabeçalho e filtros */}
          <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-600/20">
                  <PackageSearch className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                    Compras &amp; Suprimentos
                  </p>
                  <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                    Compras Inteligentes &amp; Sugestão de Pedido
                  </h1>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
                    Reposição calculada por giro de 90 dias, Curva ABC e prazo
                    real de entrega do fornecedor.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                  <Building2
                    className="h-4 w-4 text-violet-500 dark:text-violet-400"
                    aria-hidden
                  />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                    {nomeFornecedorAtual}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPedidoAberto(true)}
                  disabled={itensPedido.length === 0}
                  title={
                    itensPedido.length === 0
                      ? "Nenhum item com quantidade sugerida nos filtros atuais."
                      : "Gerar pedido de compra em PDF ou WhatsApp"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none dark:disabled:bg-violet-950 dark:disabled:text-violet-500"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  Gerar Pedido de Compra (PDF / WhatsApp)
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <FilterSelect
                id="fornecedor"
                label="Fornecedor / Fabricante"
                value={fornecedorId}
                onChange={(valor) =>
                  setFornecedorId(valor as FiltroFornecedor)
                }
              >
                <option value="TODOS">Todos os fornecedores</option>
                {FORNECEDORES.map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                id="curva-abc"
                label="Curva ABC"
                value={curva}
                onChange={(valor) => setCurva(valor as FiltroCurva)}
              >
                <option value="TODAS">Todas as classes</option>
                <option value="A">Classe A — Alto Giro</option>
                <option value="B">Classe B — Giro Médio</option>
                <option value="C">Classe C — Baixo Giro</option>
              </FilterSelect>

              <FilterSelect
                id="status-estoque"
                label="Status do estoque"
                value={status}
                onChange={(valor) => setStatus(valor as FiltroStatus)}
              >
                <option value="TODOS">Todos os status</option>
                <option value="CRITICO">Crítico</option>
                <option value="REPOR">Repor</option>
                <option value="OK">OK</option>
              </FilterSelect>
            </div>
          </header>

          {/* Indicadores */}
          <section
            aria-label="Indicadores de reposição"
            className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <MetricCard
              label="Itens para reposição"
              value={String(itensReposicao.length)}
              helper={`Produtos com status Crítico ou Repor em ${nomeFornecedorAtual}.`}
              icon={TrendingDown}
              tone="violet"
            />
            <MetricCard
              label="Investimento estimado"
              value={formatBRL(investimentoEstimado)}
              helper="Soma das quantidades sugeridas pelo último custo de NF-e."
              icon={Wallet}
              tone="emerald"
            />
            <MetricCard
              label="Itens em nível crítico"
              value={String(itensCriticos)}
              helper="Estoque zero ou abaixo da metade do ponto de pedido."
              icon={AlertTriangle}
              tone="rose"
            />
            <MetricCard
              label="Prazo médio de entrega"
              value={`${prazoMedioEntrega} dias`}
              helper="Média dos prazos de reposição dos itens filtrados."
              icon={Clock3}
              tone="amber"
            />
          </section>

          {/* Tabela */}
          <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  <Sparkles
                    className="h-4 w-4 text-violet-500 dark:text-violet-400"
                    aria-hidden
                  />
                  Sugestão Inteligente de Compras
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {produtosFiltrados.length} item(ns) exibido(s). Edite a
                  quantidade antes de gerar o pedido.
                </p>
              </div>
              <button
                type="button"
                onClick={restaurarTodasAsSugestoes}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Restaurar sugestões
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left text-sm">
                <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-bold">Código / EAN</th>
                    <th className="px-4 py-3 font-bold">Descrição</th>
                    <th className="px-4 py-3 text-center font-bold">Curva</th>
                    <th className="px-4 py-3 text-right font-bold">
                      Estoque físico
                    </th>
                    <th className="px-4 py-3 text-right font-bold">
                      Venda média/dia
                    </th>
                    <th className="px-4 py-3 text-right font-bold">
                      Reposição
                    </th>
                    <th className="px-4 py-3 text-right font-bold">
                      Estoque mínimo
                    </th>
                    <th className="px-4 py-3 text-right font-bold">
                      Ponto de pedido
                    </th>
                    <th className="px-4 py-3 text-right font-bold">
                      Sugestão de compra
                    </th>
                    <th className="px-4 py-3 text-right font-bold">
                      Último custo NF-e
                    </th>
                    <th className="px-4 py-3 text-right font-bold">Subtotal</th>
                    <th className="px-4 py-3 text-center font-bold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {produtosFiltrados.map((produto) => {
                    const quantidade =
                      quantidades[produto.id] ??
                      produto.calculo.sugestaoCompra;
                    const subtotal = quantidade * produto.ultimoCusto;
                    const fornecedor =
                      FORNECEDOR_POR_ID[produto.fornecedorId];

                    return (
                      <tr
                        key={produto.id}
                        className="transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/10"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                            {produto.codigo}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                            {produto.ean}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="max-w-[250px] text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {produto.descricao}
                          </p>
                          <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                            {fornecedor.nome} · {produto.unidade}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <CurvaBadge curva={produto.curva} />
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <StatusBadge status={produto.calculo.status} />
                            <span
                              className={`font-bold tabular-nums ${
                                produto.estoqueAtual <= 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-zinc-800 dark:text-zinc-100"
                              }`}
                            >
                              {formatQuantity(produto.estoqueAtual)}{" "}
                              <span className="text-[10px] font-medium text-zinc-400">
                                {produto.unidade}
                              </span>
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {produto.vendaMediaDiaria.toFixed(2)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {produto.tempoReposicaoDias} dias
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                          {formatQuantity(produto.calculo.estoqueMinimo)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatQuantity(produto.calculo.pontoPedido)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-1.5 py-1 shadow-sm focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              aria-label={`Quantidade sugerida para ${produto.descricao}`}
                              value={quantidade}
                              onChange={(event) =>
                                alterarQuantidade(
                                  produto.id,
                                  event.target.value,
                                )
                              }
                              className="w-16 bg-transparent text-right text-sm font-bold tabular-nums text-zinc-900 outline-none dark:text-zinc-50"
                            />
                            <span className="pr-1 text-[10px] font-semibold text-zinc-400">
                              {produto.unidade}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatBRL(produto.ultimoCusto)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatBRL(subtotal)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => restaurarSugestao(produto.id)}
                            aria-label={`Restaurar sugestão de ${produto.descricao}`}
                            title="Restaurar quantidade sugerida"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:bg-violet-950/40 dark:hover:text-violet-300"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {produtosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
                <PackageSearch
                  className="h-10 w-10 text-zinc-300 dark:text-zinc-700"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Nenhum produto encontrado
                </p>
                <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                  Ajuste o fornecedor, a Curva ABC ou o status para visualizar
                  as sugestões de reposição.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-zinc-200 bg-zinc-50/70 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950/40">
              <p className="text-zinc-500 dark:text-zinc-400">
                Fórmula:{" "}
                <strong className="text-zinc-700 dark:text-zinc-200">
                  (venda média diária × tempo de reposição) + margem de
                  segurança
                </strong>
                . Margens: A = 15 dias, B = 7 dias, C = 3 dias.
              </p>
              <p className="font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                Total selecionado: {formatBRL(totalPedido)}
              </p>
            </div>
          </section>

          <p className="mt-6 text-center text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            Criado por BCTech | Josemar Brito | Whatsapp 11972646617
          </p>
        </div>

        {/* Modal de geração do pedido */}
        {pedidoAberto ? (
          <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6 print:hidden">
            <button
              type="button"
              aria-label="Fechar geração de pedido"
              onClick={() => setPedidoAberto(false)}
              className="absolute inset-0 cursor-default bg-zinc-950/60 backdrop-blur-sm"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pedido-compra-title"
              className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/30 sm:rounded-3xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2
                      id="pedido-compra-title"
                      className="text-base font-bold text-zinc-900 dark:text-zinc-50"
                    >
                      Gerar Pedido de Compra
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {itensPedido.length} item(ns) · {nomeFornecedorAtual}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPedidoAberto(false)}
                  aria-label="Fechar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <ul className="space-y-1.5">
                  {itensPedido.map((item) => (
                    <li
                      key={item.produto.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                          {item.produto.descricao}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {item.produto.codigo} · {formatQuantity(item.quantidade)}{" "}
                          {item.produto.unidade}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                        {formatBRL(item.quantidade * item.produto.ultimoCusto)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Total estimado
                  </span>
                  <span className="text-lg font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatBRL(totalPedido)}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    Imprimir / Salvar PDF
                  </button>
                  <button
                    type="button"
                    onClick={enviarWhatsApp}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Enviar no WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Documento de impressão / PDF */}
      <section className="hidden bg-white p-8 text-black print:block">
        <div className="mx-auto max-w-4xl">
          <header className="flex items-start justify-between border-b-2 border-zinc-900 pb-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Pedido de Compra
              </h1>
              <p className="mt-1 text-sm font-semibold">MatCom SaaS</p>
              <p className="text-xs text-zinc-600">
                Compras Inteligentes &amp; Sugestão de Pedido
              </p>
            </div>
            <div className="text-right text-xs">
              <p>
                <strong>Data:</strong> {new Date().toLocaleDateString("pt-BR")}
              </p>
              <p>
                <strong>Fornecedor:</strong> {nomeFornecedorAtual}
              </p>
              <p>
                <strong>Itens:</strong> {itensPedido.length}
              </p>
            </div>
          </header>

          <table className="mt-5 w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-400 text-left">
                <th className="py-2 pr-2">Código</th>
                <th className="py-2 pr-2">Descrição</th>
                <th className="py-2 pr-2 text-center">ABC</th>
                <th className="py-2 pr-2 text-right">Qtd.</th>
                <th className="py-2 pr-2 text-right">Custo unit.</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {itensPedido.map((item) => (
                <tr
                  key={item.produto.id}
                  className="border-b border-zinc-200"
                >
                  <td className="py-2 pr-2 font-mono">
                    {item.produto.codigo}
                  </td>
                  <td className="py-2 pr-2">{item.produto.descricao}</td>
                  <td className="py-2 pr-2 text-center">
                    {item.produto.curva}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    {formatQuantity(item.quantidade)} {item.produto.unidade}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    {formatBRL(item.produto.ultimoCusto)}
                  </td>
                  <td className="py-2 text-right">
                    {formatBRL(item.quantidade * item.produto.ultimoCusto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end border-t-2 border-zinc-900 pt-3">
            <p className="text-sm font-bold">
              Total estimado: {formatBRL(totalPedido)}
            </p>
          </div>

          <p className="mt-6 text-[10px] leading-relaxed text-zinc-600">
            Pedido gerado com base na venda média de 90 dias, Curva ABC e prazo
            de reposição do fornecedor. Valores sujeitos à confirmação de preço
            e disponibilidade na confirmação do fornecedor.
          </p>

          <footer className="mt-8 border-t border-zinc-300 pt-3 text-center text-[10px] font-medium text-zinc-500">
            Criado por BCTech | Josemar Brito | Whatsapp 11972646617
          </footer>
        </div>
      </section>
    </>
  );
}