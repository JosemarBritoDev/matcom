"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  MessageCircle,
  PackagePlus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import {
  DIAS_ALERTA_EXPIRACAO,
  calcularDiasRestantes,
  calcularIndicadoresOrcamentos,
  calcularSubtotalItem,
  calcularTotalOrcamento,
  converterOrcamentoEmVenda,
  statusEfetivoOrcamento,
  type CondicaoPagamentoOrcamento,
  type ItemOrcamento,
  type Orcamento,
  type StatusOrcamento,
  type UnidadeMedida,
} from "@/lib/orcamento-service";

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

type FiltroStatus = "TODOS" | StatusOrcamento;
type TomIndicador = "violet" | "emerald" | "blue" | "rose";
type TomAcao = "violet" | "emerald" | "amber" | "rose";

interface Produto {
  id: string;
  codigo: string;
  ean: string;
  descricao: string;
  unidade: UnidadeMedida;
  precoTabela: number;
  estoque: number;
}

interface ClienteLoja {
  id: string;
  nome: string;
  documento: string;
  tipo: "PF" | "PJ";
}

interface Aviso {
  tom: "sucesso" | "erro";
  texto: string;
}

/* -------------------------------------------------------------------------- */
/*                              Dados de apoio                                */
/* -------------------------------------------------------------------------- */

/**
 * Base demonstrativa estática desta etapa (sem persistência Prisma).
 * A data de referência fixa mantém o cenário reproduzível entre servidor e
 * cliente, evitando divergência de validade na hidratação.
 */
const DATA_REFERENCIA_ISO = "2026-11-08";
const REFERENCIA = new Date(`${DATA_REFERENCIA_ISO}T12:00:00.000Z`);

const CLIENTES: ClienteLoja[] = [
  {
    id: "cli-001",
    nome: "Construtora Horizonte",
    documento: "12.345.678/0001-90",
    tipo: "PJ",
  },
  {
    id: "cli-002",
    nome: "Obra Residencial Silva",
    documento: "123.456.789-00",
    tipo: "PF",
  },
  {
    id: "cli-003",
    nome: "Sigma Engenharia",
    documento: "98.765.432/0001-10",
    tipo: "PJ",
  },
  {
    id: "cli-004",
    nome: "João Marcos Oliveira",
    documento: "987.654.321-00",
    tipo: "PF",
  },
  {
    id: "cli-005",
    nome: "Depósito Rocha",
    documento: "45.678.901/0001-23",
    tipo: "PJ",
  },
];

const PRODUTOS: Produto[] = [
  {
    id: "p-cim",
    codigo: "CIM-001",
    ean: "7891234500011",
    descricao: "Cimento CP II 50 kg",
    unidade: "UN",
    precoTabela: 45.63,
    estoque: 180,
  },
  {
    id: "p-arg",
    codigo: "ARG-006",
    ean: "7891234500066",
    descricao: "Argamassa AC-III 20 kg (caixa)",
    unidade: "CX",
    precoTabela: 46.2,
    estoque: 40,
  },
  {
    id: "p-tel",
    codigo: "TEL-008",
    ean: "7891234500080",
    descricao: "Tela Soldada Q-138",
    unidade: "UN",
    precoTabela: 215.21,
    estoque: 6,
  },
  {
    id: "p-tub",
    codigo: "HID-014",
    ean: "7891234500141",
    descricao: "Tubo PVC 100 mm · 6 m",
    unidade: "UN",
    precoTabela: 93.63,
    estoque: 24,
  },
  {
    id: "p-are",
    codigo: "ARE-002",
    ean: "7891234500029",
    descricao: "Areia Média Lavada",
    unidade: "M2",
    precoTabela: 89.9,
    estoque: 12,
  },
  {
    id: "p-bri",
    codigo: "BRI-001",
    ean: "7891234500117",
    descricao: "Brita 1",
    unidade: "M2",
    precoTabela: 109.9,
    estoque: 8,
  },
  {
    id: "p-rej",
    codigo: "REJ-004",
    ean: "7891234500043",
    descricao: "Rejunte Cinza 5 kg",
    unidade: "KG",
    precoTabela: 12.4,
    estoque: 60,
  },
  {
    id: "p-por",
    codigo: "POR-010",
    ean: "7891234500104",
    descricao: "Porcelanato Acetinado 80x80",
    unidade: "M2",
    precoTabela: 74.9,
    estoque: 320,
  },
];

const POSICOES_ESTOQUE = PRODUTOS.map((produto) => ({
  produtoId: produto.id,
  saldoDisponivel: produto.estoque,
}));

const ORCAMENTOS_INICIAIS: Orcamento[] = [
  {
    id: "orc-089",
    numero: "#ORC-2026-089",
    cliente: CLIENTES[0],
    vendedor: "Ana Paula",
    dataEmissao: "2026-11-08",
    validadeDias: 7,
    condicaoPagamento: "PIX",
    observacoes: "Entrega na obra até sexta-feira. Frete por conta da loja.",
    status: "ABERTO",
    itens: [
      {
        produtoId: "p-cim",
        descricao: "Cimento CP II 50 kg",
        unidade: "UN",
        quantidade: 120,
        precoTabela: 45.63,
        descontoPercent: 5,
      },
      {
        produtoId: "p-arg",
        descricao: "Argamassa AC-III 20 kg (caixa)",
        unidade: "CX",
        quantidade: 30,
        precoTabela: 46.2,
        descontoPercent: 5,
      },
    ],
  },
  {
    id: "orc-088",
    numero: "#ORC-2026-088",
    cliente: CLIENTES[1],
    vendedor: "Carlos Lima",
    dataEmissao: "2026-11-06",
    validadeDias: 5,
    condicaoPagamento: "CARTAO_12X",
    observacoes: "Cliente pediu simulação com tela soldada.",
    status: "ABERTO",
    itens: [
      {
        produtoId: "p-tel",
        descricao: "Tela Soldada Q-138",
        unidade: "UN",
        quantidade: 10,
        precoTabela: 215.21,
        descontoPercent: 0,
      },
      {
        produtoId: "p-are",
        descricao: "Areia Média Lavada",
        unidade: "M2",
        quantidade: 5,
        precoTabela: 89.9,
        descontoPercent: 5,
      },
    ],
  },
  {
    id: "orc-087",
    numero: "#ORC-2026-087",
    cliente: CLIENTES[3],
    vendedor: "Bruno Lima",
    dataEmissao: "2026-10-30",
    validadeDias: 5,
    condicaoPagamento: "CREDIARIO",
    observacoes: "Proposta aguardando aprovação do crediário.",
    status: "ABERTO",
    itens: [
      {
        produtoId: "p-tub",
        descricao: "Tubo PVC 100 mm · 6 m",
        unidade: "UN",
        quantidade: 75,
        precoTabela: 93.63,
        descontoPercent: 3,
      },
    ],
  },
  {
    id: "orc-086",
    numero: "#ORC-2026-086",
    cliente: CLIENTES[2],
    vendedor: "Ana Paula",
    dataEmissao: "2026-11-02",
    validadeDias: 10,
    condicaoPagamento: "CREDIARIO",
    observacoes: "Convertido em venda e enviado ao caixa.",
    status: "CONVERTIDO",
    itens: [
      {
        produtoId: "p-por",
        descricao: "Porcelanato Acetinado 80x80",
        unidade: "M2",
        quantidade: 200,
        precoTabela: 74.9,
        descontoPercent: 8,
      },
      {
        produtoId: "p-rej",
        descricao: "Rejunte Cinza 5 kg",
        unidade: "KG",
        quantidade: 40,
        precoTabela: 12.4,
        descontoPercent: 5,
      },
    ],
  },
  {
    id: "orc-085",
    numero: "#ORC-2026-085",
    cliente: CLIENTES[4],
    vendedor: "Carlos Lima",
    dataEmissao: "2026-11-01",
    validadeDias: 3,
    condicaoPagamento: "PIX",
    observacoes: "Cliente desistiu da compra.",
    status: "CANCELADO",
    itens: [
      {
        produtoId: "p-bri",
        descricao: "Brita 1",
        unidade: "M2",
        quantidade: 10,
        precoTabela: 109.9,
        descontoPercent: 0,
      },
    ],
  },
  {
    id: "orc-084",
    numero: "#ORC-2026-084",
    cliente: CLIENTES[2],
    vendedor: "Bruno Lima",
    dataEmissao: "2026-10-18",
    validadeDias: 15,
    condicaoPagamento: "CARTAO_12X",
    observacoes: "Orçamento do mês anterior, já convertido.",
    status: "CONVERTIDO",
    itens: [
      {
        produtoId: "p-are",
        descricao: "Areia Média Lavada",
        unidade: "M2",
        quantidade: 100,
        precoTabela: 89.9,
        descontoPercent: 10,
      },
    ],
  },
  {
    id: "orc-083",
    numero: "#ORC-2026-083",
    cliente: null,
    vendedor: "Ana Paula",
    dataEmissao: "2026-11-07",
    validadeDias: 2,
    condicaoPagamento: "PIX",
    observacoes: "Cliente de balcão aguardando retorno.",
    status: "ABERTO",
    itens: [
      {
        produtoId: "p-cim",
        descricao: "Cimento CP II 50 kg",
        unidade: "UN",
        quantidade: 50,
        precoTabela: 45.63,
        descontoPercent: 0,
      },
    ],
  },
];

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const QUANTIDADE = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

const PERCENTUAL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const UNIDADE_LABEL: Record<UnidadeMedida, string> = {
  M2: "M²",
  KG: "KG",
  UN: "UN",
  CX: "CX",
};

const CONDICAO_LABEL: Record<CondicaoPagamentoOrcamento, string> = {
  PIX: "À Vista PIX",
  CARTAO_12X: "Cartão em até 12x",
  CREDIARIO: "Crediário/Fiado da Loja",
};

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  ABERTO: "Aberto",
  CONVERTIDO: "Convertido em Venda",
  EXPIRADO: "Expirado",
  CANCELADO: "Cancelado",
};

const STATUS_STYLE: Record<StatusOrcamento, string> = {
  ABERTO:
    "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-900",
  CONVERTIDO:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900",
  EXPIRADO:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
  CANCELADO:
    "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
};

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

/* -------------------------------------------------------------------------- */
/*                              Funções de tela                               */
/* -------------------------------------------------------------------------- */

function formatarMoeda(valor: number): string {
  return MOEDA.format(valor);
}

function formatarQuantidade(valor: number): string {
  return QUANTIDADE.format(valor);
}

function formatarPercentual(valor: number): string {
  return `${PERCENTUAL.format(valor)}%`;
}

function formatarData(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function nomeCliente(orcamento: Orcamento): string {
  return orcamento.cliente?.nome ?? "Cliente Balcão";
}

function proximoNumero(orcamentos: Orcamento[]): string {
  const maiorSequencia = orcamentos.reduce((maior, orcamento) => {
    const correspondencia = orcamento.numero.match(/(\d+)$/);
    return correspondencia
      ? Math.max(maior, Number(correspondencia[1]))
      : maior;
  }, 0);

  const ano = DATA_REFERENCIA_ISO.slice(0, 4);
  return `#ORC-${ano}-${String(maiorSequencia + 1).padStart(3, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*                              Subcomponentes                                */
/* -------------------------------------------------------------------------- */

function Metric({
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
  tone: TomIndicador;
}) {
  const tones: Record<TomIndicador, string> = {
    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  };

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

function StatusBadge({ status }: { status: StatusOrcamento }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ValidadeCell({
  dias,
  status,
}: {
  dias: number;
  status: StatusOrcamento;
}) {
  if (status === "CANCELADO") {
    return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
  }

  if (status === "CONVERTIDO") {
    return (
      <span className="text-zinc-500 dark:text-zinc-400">Convertido</span>
    );
  }

  if (dias < 0) {
    return (
      <span className="font-semibold text-rose-600 dark:text-rose-400">
        Vencido há {Math.abs(dias)}d
      </span>
    );
  }

  if (dias === 0) {
    return (
      <span className="font-semibold text-amber-600 dark:text-amber-400">
        Expira hoje
      </span>
    );
  }

  if (dias <= DIAS_ALERTA_EXPIRACAO) {
    return (
      <span className="font-semibold text-amber-600 dark:text-amber-400">
        {dias} dia(s) restante(s)
      </span>
    );
  }

  return (
    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
      {dias} dia(s) restante(s)
    </span>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled = false,
  tone,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  tone: TomAcao;
}) {
  const tones: Record<TomAcao, string> = {
    violet:
      "border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/40",
    emerald:
      "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
    amber:
      "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40",
    rose: "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-1.5 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-900 ${tones[tone]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Página                                   */
/* -------------------------------------------------------------------------- */

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(ORCAMENTOS_INICIAIS);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("TODOS");
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<
    string | null
  >(null);
  const [produtoBusca, setProdutoBusca] = useState("");
  const [itensDraft, setItensDraft] = useState<ItemOrcamento[]>([]);
  const [condicaoPagamento, setCondicaoPagamento] =
    useState<CondicaoPagamentoOrcamento>("PIX");
  const [validadeDias, setValidadeDias] = useState(7);
  const [observacoes, setObservacoes] = useState("");
  const [erroFormulario, setErroFormulario] = useState("");

  const [detalhe, setDetalhe] = useState<Orcamento | null>(null);

  const indicadores = useMemo(
    () => calcularIndicadoresOrcamentos(orcamentos, REFERENCIA),
    [orcamentos],
  );

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return orcamentos
      .filter((orcamento) => {
        const status = statusEfetivoOrcamento(orcamento, REFERENCIA);

        if (filtroStatus !== "TODOS" && status !== filtroStatus) {
          return false;
        }

        if (!termo) {
          return true;
        }

        const cliente = orcamento.cliente?.nome ?? "cliente balcão";
        const documento = orcamento.cliente?.documento ?? "";

        return `${orcamento.numero} ${cliente} ${documento} ${orcamento.vendedor}`
          .toLowerCase()
          .includes(termo);
      })
      .map((orcamento) => ({
        orcamento,
        status: statusEfetivoOrcamento(orcamento, REFERENCIA),
        diasRestantes: calcularDiasRestantes(
          orcamento.dataEmissao,
          orcamento.validadeDias,
          REFERENCIA,
        ),
        total: calcularTotalOrcamento(orcamento.itens),
      }));
  }, [orcamentos, busca, filtroStatus]);

  const totalFiltrado = useMemo(
    () => linhas.reduce((total, linha) => total + linha.total, 0),
    [linhas],
  );

  const clientesFiltrados = useMemo(() => {
    const termo = clienteBusca.trim().toLowerCase();

    if (!termo) {
      return CLIENTES;
    }

    return CLIENTES.filter((cliente) =>
      `${cliente.nome} ${cliente.documento}`.toLowerCase().includes(termo),
    );
  }, [clienteBusca]);

  const produtosFiltrados = useMemo(() => {
    const termo = produtoBusca.trim().toLowerCase();

    if (!termo) {
      return PRODUTOS;
    }

    return PRODUTOS.filter((produto) =>
      `${produto.codigo} ${produto.ean} ${produto.descricao}`
        .toLowerCase()
        .includes(termo),
    );
  }, [produtoBusca]);

  const clienteSelecionado =
    CLIENTES.find((cliente) => cliente.id === clienteSelecionadoId) ?? null;

  const totalDraft = useMemo(() => {
    const itensValidos = itensDraft.filter((item) => item.quantidade > 0);
    return itensValidos.length === 0
      ? 0
      : calcularTotalOrcamento(itensValidos);
  }, [itensDraft]);

  const detalheInfo = useMemo(() => {
    if (!detalhe) {
      return null;
    }

    return {
      status: statusEfetivoOrcamento(detalhe, REFERENCIA),
      dias: calcularDiasRestantes(
        detalhe.dataEmissao,
        detalhe.validadeDias,
        REFERENCIA,
      ),
      total: calcularTotalOrcamento(detalhe.itens),
    };
  }, [detalhe]);

  function abrirNovoOrcamento() {
    setClienteBusca("");
    setClienteSelecionadoId(null);
    setProdutoBusca("");
    setItensDraft([]);
    setCondicaoPagamento("PIX");
    setValidadeDias(7);
    setObservacoes("");
    setErroFormulario("");
    setModalNovoAberto(true);
  }

  function adicionarProduto(produto: Produto) {
    setItensDraft((atuais) => {
      const existente = atuais.find(
        (item) => item.produtoId === produto.id,
      );

      if (existente) {
        return atuais.map((item) =>
          item.produtoId === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        );
      }

      return [
        ...atuais,
        {
          produtoId: produto.id,
          descricao: produto.descricao,
          unidade: produto.unidade,
          quantidade: 1,
          precoTabela: produto.precoTabela,
          descontoPercent: 0,
        },
      ];
    });
  }

  function atualizarItem(
    produtoId: string,
    campo: "quantidade" | "unidade" | "precoTabela" | "descontoPercent",
    valor: string,
  ) {
    setItensDraft((atuais) =>
      atuais.map((item) => {
        if (item.produtoId !== produtoId) {
          return item;
        }

        if (campo === "unidade") {
          return { ...item, unidade: valor as UnidadeMedida };
        }

        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
          return item;
        }

        if (campo === "quantidade") {
          return { ...item, quantidade: Math.max(0, numero) };
        }

        if (campo === "precoTabela") {
          return { ...item, precoTabela: Math.max(0, numero) };
        }

        return {
          ...item,
          descontoPercent: Math.min(100, Math.max(0, numero)),
        };
      }),
    );
  }

  function removerItem(produtoId: string) {
    setItensDraft((atuais) =>
      atuais.filter((item) => item.produtoId !== produtoId),
    );
  }

  function criarOrcamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (itensDraft.length === 0) {
      setErroFormulario("Adicione pelo menos um item ao orçamento.");
      return;
    }

    if (
      itensDraft.some(
        (item) => !Number.isFinite(item.quantidade) || item.quantidade <= 0,
      )
    ) {
      setErroFormulario("Informe quantidade maior que zero em todos os itens.");
      return;
    }

    if (!Number.isFinite(validadeDias) || validadeDias < 1) {
      setErroFormulario("Informe uma validade de pelo menos 1 dia.");
      return;
    }

    const novoOrcamento: Orcamento = {
      id: `orc-${Date.now()}`,
      numero: proximoNumero(orcamentos),
      cliente: clienteSelecionado,
      vendedor: "Ana Paula",
      dataEmissao: DATA_REFERENCIA_ISO,
      validadeDias: Math.trunc(validadeDias),
      condicaoPagamento,
      observacoes: observacoes.trim() ? observacoes.trim() : undefined,
      status: "ABERTO",
      itens: itensDraft.map((item) => ({ ...item })),
    };

    setOrcamentos((atuais) => [novoOrcamento, ...atuais]);
    setModalNovoAberto(false);
    setAviso({
      tom: "sucesso",
      texto: `Orçamento ${novoOrcamento.numero} criado para ${nomeCliente(
        novoOrcamento,
      )}.`,
    });
  }

  function converterOrcamento(orcamento: Orcamento) {
    const resultado = converterOrcamentoEmVenda(
      orcamento,
      POSICOES_ESTOQUE,
      REFERENCIA,
    );

    if (!resultado.ok) {
      setAviso({ tom: "erro", texto: resultado.erros.join(" ") });
      return;
    }

    setOrcamentos((atuais) =>
      atuais.map((item) =>
        item.id === orcamento.id
          ? { ...item, status: "CONVERTIDO" }
          : item,
      ),
    );
    setAviso({
      tom: "sucesso",
      texto: `Orçamento ${orcamento.numero} convertido. Comanda ${
        resultado.comanda.numero
      } enviada à Fila do Caixa (AGUARDANDO_CAIXA) — total ${formatarMoeda(
        resultado.comanda.total,
      )}.`,
    });
  }

  function cancelarOrcamento(orcamento: Orcamento) {
    setOrcamentos((atuais) =>
      atuais.map((item) =>
        item.id === orcamento.id
          ? { ...item, status: "CANCELADO" }
          : item,
      ),
    );
    setAviso({
      tom: "sucesso",
      texto: `Orçamento ${orcamento.numero} cancelado.`,
    });
  }

  function enviarWhatsApp(orcamento: Orcamento) {
    const diasRestantes = calcularDiasRestantes(
      orcamento.dataEmissao,
      orcamento.validadeDias,
      REFERENCIA,
    );

    const linhasMensagem = [
      "*Orçamento Comercial — MatCom*",
      `Nº: ${orcamento.numero}`,
      `Cliente: ${nomeCliente(orcamento)}`,
      `Vendedor: ${orcamento.vendedor}`,
      `Emissão: ${formatarData(orcamento.dataEmissao)}`,
      `Validade: ${
        diasRestantes >= 0
          ? `${diasRestantes} dia(s)`
          : "proposta vencida"
      }`,
      "",
      ...orcamento.itens.map((item) => {
        const desconto = item.descontoPercent
          ? ` (desc. ${item.descontoPercent}%)`
          : "";

        return `• ${formatarQuantidade(item.quantidade)} ${
          UNIDADE_LABEL[item.unidade]
        } — ${item.descricao}${desconto} = ${formatarMoeda(
          calcularSubtotalItem(item),
        )}`;
      }),
      "",
      `Total: ${formatarMoeda(calcularTotalOrcamento(orcamento.itens))}`,
      `Pagamento: ${CONDICAO_LABEL[orcamento.condicaoPagamento]}`,
      "",
      "Criado por BCTech | Josemar Brito | Whatsapp 11972646617",
    ];

    window.open(
      `https://wa.me/?text=${encodeURIComponent(linhasMensagem.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-[1400px] print:hidden">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-600/20">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                Vendas &amp; Pré-vendas
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                Central de Orçamentos &amp; Propostas Comerciais
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
                Acompanhe validade, conversão em venda e propostas de balcão em
                um só lugar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNovoOrcamento}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            <PackagePlus className="h-4 w-4" aria-hidden />
            Novo Orçamento de Balcão
          </button>
        </header>

        {/* Indicadores */}
        <section
          aria-label="Indicadores de cotações"
          className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Metric
            label="Orçamentos no mês"
            value={String(indicadores.totalNoMes)}
            helper="Propostas emitidas no mês de referência."
            icon={FileText}
            tone="violet"
          />
          <Metric
            label="Taxa de conversão em venda"
            value={formatarPercentual(indicadores.taxaConversaoPercent)}
            helper={`${indicadores.convertidosNoMes} proposta(s) convertida(s) no mês.`}
            icon={TrendingUp}
            tone="emerald"
          />
          <Metric
            label="Valor total cotado"
            value={formatarMoeda(indicadores.valorTotalCotado)}
            helper="Soma das propostas abertas e convertidas no mês."
            icon={Wallet}
            tone="blue"
          />
          <Metric
            label="Prestes a expirar"
            value={String(indicadores.prestesAExpirar)}
            helper={`Propostas abertas com até ${DIAS_ALERTA_EXPIRACAO} dias de validade.`}
            icon={CalendarClock}
            tone="rose"
          />
        </section>

        {/* Aviso operacional */}
        {aviso ? (
          <div
            role={aviso.tom === "erro" ? "alert" : "status"}
            className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
              aviso.tom === "erro"
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            {aviso.tom === "erro" ? (
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="flex-1">{aviso.texto}</span>
            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Fechar aviso"
              className="rounded-md p-0.5 hover:bg-white/50 dark:hover:bg-zinc-900/50"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}

        {/* Filtros */}
        <section className="mt-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px] dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label htmlFor="busca-orcamento" className={LABEL_CLASS}>
              Buscar orçamento
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                id="busca-orcamento"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nº, cliente, CPF/CNPJ ou vendedor"
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="filtro-status" className={LABEL_CLASS}>
              Status
            </label>
            <div className="relative mt-1">
              <select
                id="filtro-status"
                value={filtroStatus}
                onChange={(event) =>
                  setFiltroStatus(event.target.value as FiltroStatus)
                }
                className={`${INPUT_CLASS} appearance-none pr-9`}
              >
                <option value="TODOS">Todos os status</option>
                {(Object.keys(STATUS_LABEL) as StatusOrcamento[]).map(
                  (status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
            </div>
          </div>
        </section>

        {/* Tabela de orçamentos */}
        <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-2 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Orçamentos Emitidos
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {linhas.length} proposta(s) exibida(s) · total filtrado{" "}
                {formatarMoeda(totalFiltrado)}.
              </p>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Validade padrão sugerida: sempre informe o prazo ao cliente.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Nº Orçamento</th>
                  <th className="px-4 py-3 font-bold">Cliente</th>
                  <th className="px-4 py-3 font-bold">Vendedor</th>
                  <th className="px-4 py-3 font-bold">Emissão</th>
                  <th className="px-4 py-3 font-bold">Validade</th>
                  <th className="px-4 py-3 text-right font-bold">
                    Valor Total
                  </th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {linhas.map(({ orcamento, status, diasRestantes, total }) => (
                  <tr
                    key={orcamento.id}
                    className="transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/10"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                        {orcamento.numero}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                        {orcamento.itens.length} item(ns)
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="max-w-[220px] truncate font-semibold text-zinc-800 dark:text-zinc-100">
                        {nomeCliente(orcamento)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                        {orcamento.cliente?.documento ?? "Sem CPF/CNPJ"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {orcamento.vendedor}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {formatarData(orcamento.dataEmissao)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      <ValidadeCell dias={diasRestantes} status={status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatarMoeda(total)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={status} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <ActionButton
                          label="Ver / PDF"
                          icon={Eye}
                          tone="violet"
                          onClick={() => setDetalhe(orcamento)}
                        />
                        <ActionButton
                          label="WhatsApp"
                          icon={MessageCircle}
                          tone="emerald"
                          onClick={() => enviarWhatsApp(orcamento)}
                        />
                        <ActionButton
                          label="Converter"
                          icon={ShoppingCart}
                          tone="amber"
                          disabled={status !== "ABERTO"}
                          onClick={() => converterOrcamento(orcamento)}
                        />
                        <ActionButton
                          label="Cancelar"
                          icon={Ban}
                          tone="rose"
                          disabled={
                            status !== "ABERTO" && status !== "EXPIRADO"
                          }
                          onClick={() => cancelarOrcamento(orcamento)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {linhas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
              <FileText
                className="h-10 w-10 text-zinc-300 dark:text-zinc-700"
                aria-hidden
              />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Nenhum orçamento encontrado
              </p>
              <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                Ajuste a busca ou o filtro de status para visualizar as
                propostas comerciais.
              </p>
            </div>
          ) : null}
        </section>

        <footer className="py-7 text-center text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>

      {/* Modal de detalhe / impressão */}
      {detalhe && detalheInfo ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6 print:hidden">
          <button
            type="button"
            aria-label="Fechar visualização do orçamento"
            onClick={() => setDetalhe(null)}
            className="absolute inset-0 cursor-default bg-zinc-950/60 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalhe-orcamento-title"
            className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/30 sm:rounded-3xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                  Proposta comercial
                </p>
                <h2
                  id="detalhe-orcamento-title"
                  className="mt-1 font-mono text-lg font-extrabold text-zinc-900 dark:text-zinc-50"
                >
                  {detalhe.numero}
                </h2>
                <div className="mt-2">
                  <StatusBadge status={detalheInfo.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetalhe(null)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <dl className="grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className={LABEL_CLASS}>Cliente</dt>
                  <dd className="mt-1 font-semibold text-zinc-800 dark:text-zinc-100">
                    {nomeCliente(detalhe)}
                  </dd>
                  <dd className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {detalhe.cliente?.documento ?? "Sem CPF/CNPJ"}
                  </dd>
                </div>
                <div>
                  <dt className={LABEL_CLASS}>Vendedor</dt>
                  <dd className="mt-1 font-semibold text-zinc-800 dark:text-zinc-100">
                    {detalhe.vendedor}
                  </dd>
                </div>
                <div>
                  <dt className={LABEL_CLASS}>Emissão / Validade</dt>
                  <dd className="mt-1 font-semibold text-zinc-800 dark:text-zinc-100">
                    {formatarData(detalhe.dataEmissao)} · {detalhe.validadeDias}{" "}
                    dias
                  </dd>
                  <dd className="text-[11px]">
                    <ValidadeCell
                      dias={detalheInfo.dias}
                      status={detalheInfo.status}
                    />
                  </dd>
                </div>
                <div>
                  <dt className={LABEL_CLASS}>Condição de pagamento</dt>
                  <dd className="mt-1 font-semibold text-zinc-800 dark:text-zinc-100">
                    {CONDICAO_LABEL[detalhe.condicaoPagamento]}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-bold">Item</th>
                      <th className="px-3 py-2 text-center font-bold">Un.</th>
                      <th className="px-3 py-2 text-right font-bold">Qtd.</th>
                      <th className="px-3 py-2 text-right font-bold">Preço</th>
                      <th className="px-3 py-2 text-right font-bold">Desc.</th>
                      <th className="px-3 py-2 text-right font-bold">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {detalhe.itens.map((item) => (
                      <tr key={item.produtoId}>
                        <td className="px-3 py-2 font-semibold text-zinc-800 dark:text-zinc-100">
                          {item.descricao}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-600 dark:text-zinc-300">
                          {UNIDADE_LABEL[item.unidade]}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatarQuantidade(item.quantidade)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatarMoeda(item.precoTabela)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatarPercentual(item.descontoPercent ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatarMoeda(calcularSubtotalItem(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/60">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Total da proposta
                </span>
                <span className="text-xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatarMoeda(detalheInfo.total)}
                </span>
              </div>

              {detalhe.observacoes ? (
                <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className={LABEL_CLASS}>Observações comerciais</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {detalhe.observacoes}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 border-t border-zinc-200 p-5 sm:grid-cols-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => enviarWhatsApp(detalhe)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-700"
              >
                <Printer className="h-4 w-4" aria-hidden />
                Imprimir / Salvar PDF
              </button>
              <button
                type="button"
                onClick={() => setDetalhe(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-3 py-2.5 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal de criação */}
      {modalNovoAberto ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6 print:hidden">
          <button
            type="button"
            aria-label="Fechar novo orçamento"
            onClick={() => setModalNovoAberto(false)}
            className="absolute inset-0 cursor-default bg-zinc-950/60 backdrop-blur-sm"
          />

          <form
            onSubmit={criarOrcamento}
            className="relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/30 sm:rounded-3xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  <PackagePlus className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                    Balcão
                  </p>
                  <h2 className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-50">
                    Novo Orçamento de Balcão
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* Cliente */}
              <section>
                <label htmlFor="cliente-busca" className={LABEL_CLASS}>
                  Cliente
                </label>
                <div className="relative mt-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <input
                    id="cliente-busca"
                    value={clienteBusca}
                    onChange={(event) => setClienteBusca(event.target.value)}
                    placeholder="Buscar por nome, CPF ou CNPJ"
                    className={`${INPUT_CLASS} pl-9`}
                  />
                </div>

                <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setClienteSelecionadoId(null)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors ${
                      clienteSelecionadoId === null
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="font-semibold">Cliente Balcão</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Sem CPF/CNPJ
                    </span>
                  </button>

                  {clientesFiltrados.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => setClienteSelecionadoId(cliente.id)}
                      className={`flex w-full items-center justify-between gap-3 border-t border-zinc-100 px-3 py-2 text-left text-xs transition-colors dark:border-zinc-800 ${
                        clienteSelecionadoId === cliente.id
                          ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="font-semibold">{cliente.nome}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {cliente.documento} · {cliente.tipo}
                      </span>
                    </button>
                  ))}

                  {clientesFiltrados.length === 0 ? (
                    <p className="px-3 py-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                      Nenhum cliente encontrado para “{clienteBusca}”.
                    </p>
                  ) : null}
                </div>

                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Selecionado:{" "}
                  <strong className="text-zinc-700 dark:text-zinc-200">
                    {clienteSelecionado?.nome ?? "Cliente Balcão"}
                  </strong>
                </p>
              </section>

              {/* Produtos */}
              <section>
                <label htmlFor="produto-busca" className={LABEL_CLASS}>
                  Itens do orçamento
                </label>
                <div className="relative mt-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <input
                    id="produto-busca"
                    value={produtoBusca}
                    onChange={(event) => setProdutoBusca(event.target.value)}
                    placeholder="Buscar por código, EAN ou descrição"
                    className={`${INPUT_CLASS} pl-9`}
                  />
                </div>

                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  {produtosFiltrados.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      onClick={() => adicionarProduto(produto)}
                      className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-left text-xs transition-colors last:border-b-0 hover:bg-violet-50/50 dark:border-zinc-800 dark:hover:bg-violet-950/20"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-zinc-800 dark:text-zinc-100">
                          {produto.descricao}
                        </span>
                        <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                          {produto.codigo} · {produto.ean} ·{" "}
                          {UNIDADE_LABEL[produto.unidade]} · estoque{" "}
                          {formatarQuantidade(produto.estoque)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                          {formatarMoeda(produto.precoTabela)}
                        </span>
                        <span className="block text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                          Adicionar
                        </span>
                      </span>
                    </button>
                  ))}

                  {produtosFiltrados.length === 0 ? (
                    <p className="px-3 py-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                      Nenhum produto encontrado para “{produtoBusca}”.
                    </p>
                  ) : null}
                </div>
              </section>

              {/* Itens adicionados */}
              {itensDraft.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 py-2 font-bold">Produto</th>
                        <th className="px-3 py-2 font-bold">Unidade</th>
                        <th className="px-3 py-2 font-bold">Qtd.</th>
                        <th className="px-3 py-2 font-bold">Preço tabela</th>
                        <th className="px-3 py-2 font-bold">Desc. %</th>
                        <th className="px-3 py-2 text-right font-bold">
                          Subtotal
                        </th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {itensDraft.map((item) => (
                        <tr key={item.produtoId}>
                          <td className="max-w-[220px] px-3 py-2 font-semibold text-zinc-800 dark:text-zinc-100">
                            <span className="block truncate">
                              {item.descricao}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              aria-label={`Unidade de ${item.descricao}`}
                              value={item.unidade}
                              onChange={(event) =>
                                atualizarItem(
                                  item.produtoId,
                                  "unidade",
                                  event.target.value,
                                )
                              }
                              className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-950"
                            >
                              {(
                                ["M2", "KG", "UN", "CX"] as UnidadeMedida[]
                              ).map((unidade) => (
                                <option key={unidade} value={unidade}>
                                  {UNIDADE_LABEL[unidade]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              inputMode="decimal"
                              aria-label={`Quantidade de ${item.descricao}`}
                              value={item.quantidade}
                              onChange={(event) =>
                                atualizarItem(
                                  item.produtoId,
                                  "quantidade",
                                  event.target.value,
                                )
                              }
                              className="h-8 w-20 rounded-lg border border-zinc-300 bg-white px-2 text-right text-xs font-bold tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              inputMode="decimal"
                              aria-label={`Preço de ${item.descricao}`}
                              value={item.precoTabela}
                              onChange={(event) =>
                                atualizarItem(
                                  item.produtoId,
                                  "precoTabela",
                                  event.target.value,
                                )
                              }
                              className="h-8 w-24 rounded-lg border border-zinc-300 bg-white px-2 text-right text-xs font-bold tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              inputMode="decimal"
                              aria-label={`Desconto de ${item.descricao}`}
                              value={item.descontoPercent ?? 0}
                              onChange={(event) =>
                                atualizarItem(
                                  item.produtoId,
                                  "descontoPercent",
                                  event.target.value,
                                )
                              }
                              className="h-8 w-16 rounded-lg border border-zinc-300 bg-white px-2 text-right text-xs font-bold tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatarMoeda(
                              item.quantidade > 0
                                ? calcularSubtotalItem(item)
                                : 0,
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removerItem(item.produtoId)}
                              aria-label={`Remover ${item.descricao}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Nenhum item adicionado. Use a busca acima para incluir
                  produtos no orçamento.
                </p>
              )}

              {/* Condições */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="condicao-pagamento" className={LABEL_CLASS}>
                    Condição de pagamento prevista
                  </label>
                  <div className="relative mt-1">
                    <select
                      id="condicao-pagamento"
                      value={condicaoPagamento}
                      onChange={(event) =>
                        setCondicaoPagamento(
                          event.target.value as CondicaoPagamentoOrcamento,
                        )
                      }
                      className={`${INPUT_CLASS} appearance-none pr-9`}
                    >
                      {(Object.keys(CONDICAO_LABEL) as CondicaoPagamentoOrcamento[]).map(
                        (condicao) => (
                          <option key={condicao} value={condicao}>
                            {CONDICAO_LABEL[condicao]}
                          </option>
                        ),
                      )}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                      aria-hidden
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="validade-dias" className={LABEL_CLASS}>
                    Validade do orçamento (dias)
                  </label>
                  <input
                    id="validade-dias"
                    type="number"
                    min={1}
                    max={365}
                    value={validadeDias}
                    onChange={(event) =>
                      setValidadeDias(Number(event.target.value))
                    }
                    className={`${INPUT_CLASS} mt-1`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="observacoes" className={LABEL_CLASS}>
                  Observações comerciais
                </label>
                <textarea
                  id="observacoes"
                  rows={2}
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                  placeholder="Condições de entrega, frete, prazo de produção..."
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Total do orçamento
                </span>
                <span className="text-lg font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatarMoeda(totalDraft)}
                </span>
              </div>

              {erroFormulario ? (
                <p
                  role="alert"
                  className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {erroFormulario}
                </p>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-700"
                >
                  Criar Orçamento
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {/* Documento de impressão / PDF */}
      {detalhe && detalheInfo ? (
        <section className="hidden bg-white p-8 text-black print:block">
          <div className="mx-auto max-w-4xl">
            <header className="flex items-start justify-between border-b-2 border-zinc-900 pb-4">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Orçamento Comercial
                </h1>
                <p className="mt-1 text-sm font-semibold">
                  MatCom Materiais de Construção
                </p>
                <p className="text-xs text-zinc-600">
                  Central de Orçamentos &amp; Propostas Comerciais
                </p>
              </div>
              <div className="text-right text-xs">
                <p>
                  <strong>Nº:</strong> {detalhe.numero}
                </p>
                <p>
                  <strong>Emissão:</strong>{" "}
                  {formatarData(detalhe.dataEmissao)}
                </p>
                <p>
                  <strong>Validade:</strong> {detalhe.validadeDias} dias
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {STATUS_LABEL[detalheInfo.status]}
                </p>
              </div>
            </header>

            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              <p>
                <strong>Cliente:</strong> {nomeCliente(detalhe)}
                {detalhe.cliente?.documento
                  ? ` · ${detalhe.cliente.documento}`
                  : " · sem CPF/CNPJ"}
              </p>
              <p>
                <strong>Vendedor:</strong> {detalhe.vendedor}
              </p>
              <p>
                <strong>Condição de pagamento:</strong>{" "}
                {CONDICAO_LABEL[detalhe.condicaoPagamento]}
              </p>
              <p>
                <strong>Itens:</strong> {detalhe.itens.length}
              </p>
            </div>

            <table className="mt-5 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-400 text-left">
                  <th className="py-2 pr-2">Descrição</th>
                  <th className="py-2 pr-2 text-center">Un.</th>
                  <th className="py-2 pr-2 text-right">Qtd.</th>
                  <th className="py-2 pr-2 text-right">Preço</th>
                  <th className="py-2 pr-2 text-right">Desc.</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalhe.itens.map((item) => (
                  <tr
                    key={item.produtoId}
                    className="border-b border-zinc-200"
                  >
                    <td className="py-2 pr-2">{item.descricao}</td>
                    <td className="py-2 pr-2 text-center">
                      {UNIDADE_LABEL[item.unidade]}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {formatarQuantidade(item.quantidade)}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {formatarMoeda(item.precoTabela)}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {formatarPercentual(item.descontoPercent ?? 0)}
                    </td>
                    <td className="py-2 text-right">
                      {formatarMoeda(calcularSubtotalItem(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end border-t-2 border-zinc-900 pt-3">
              <p className="text-sm font-bold">
                Total: {formatarMoeda(detalheInfo.total)}
              </p>
            </div>

            {detalhe.observacoes ? (
              <p className="mt-4 text-xs">
                <strong>Observações:</strong> {detalhe.observacoes}
              </p>
            ) : null}

            <p className="mt-5 text-[10px] leading-relaxed text-zinc-600">
              Preços e condições válidos pelo prazo informado nesta proposta.
              O orçamento não reserva estoque e não gera cobrança; a conversão
              em venda cria a comanda de pré-venda para a Fila do Caixa.
            </p>

            <footer className="mt-10 border-t border-zinc-300 pt-3 text-center text-[10px] font-medium text-zinc-500">
              Criado por BCTech | Josemar Brito | Whatsapp 11972646617
            </footer>
          </div>
        </section>
      ) : null}

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </main>
  );
}
