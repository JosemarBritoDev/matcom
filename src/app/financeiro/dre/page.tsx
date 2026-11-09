"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  Landmark,
  LockKeyhole,
  Wallet,
} from "lucide-react";

import {
  FORMAS_PAGAMENTO_DRE,
  obterDemonstrativoDre,
  podeAcessarDre,
  type ResumoDre,
} from "@/lib/financeiro-dre";
import { resolverSessaoAtiva } from "@/lib/session";

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function moeda(valor: number) {
  return MOEDA.format(valor);
}

function obterPeriodoAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function calcularPercentual(valor: number, total: number) {
  return total > 0 ? Math.min(100, Math.max(0, (valor / total) * 100)) : 0;
}

const PAGAMENTO_ICONES = {
  Dinheiro: Banknote,
  PIX: CircleDollarSign,
  "Cartão de Crédito": CreditCard,
  "Crediário/Fiado": Landmark,
} as const;

const PAGAMENTO_CORES = {
  Dinheiro: "bg-emerald-500",
  PIX: "bg-cyan-500",
  "Cartão de Crédito": "bg-violet-500",
  "Crediário/Fiado": "bg-amber-500",
} as const;

function CartaoResumo({
  titulo,
  valor,
  descricao,
  icone: Icon,
  cor,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icone: typeof Wallet;
  cor: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {titulo}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {valor}
          </p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${cor}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{descricao}</p>
    </article>
  );
}

function TabelaDre({
  mensal,
  trimestre,
}: {
  mensal: ResumoDre;
  trimestre: ResumoDre;
}) {
  const linhas = [
    {
      nome: "Receita Bruta",
      mensal: mensal.faturamentoBruto,
      trimestre: trimestre.faturamentoBruto,
      destaque: true,
    },
    {
      nome: "Custo dos Produtos Vendidos (CPV)",
      mensal: -mensal.cogs,
      trimestre: -trimestre.cogs,
    },
    {
      nome: "Lucro Bruto",
      mensal: mensal.resultado.lucroBruto,
      trimestre: trimestre.resultado.lucroBruto,
      destaque: true,
    },
    {
      nome: "Despesas Operacionais",
      mensal: -mensal.despesasOperacionais,
      trimestre: -trimestre.despesasOperacionais,
    },
    {
      nome: "Resultado Operacional",
      mensal: mensal.resultado.lucroOperacional,
      trimestre: trimestre.resultado.lucroOperacional,
      destaque: true,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th scope="col" className="px-4 py-3 font-semibold">Indicador</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Mês: {mensal.periodo}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Trimestre: {trimestre.periodo}
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr
              key={linha.nome}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70"
            >
              <th
                scope="row"
                className={`px-4 py-3 font-medium ${
                  linha.destaque
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {linha.nome}
              </th>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                {moeda(linha.mensal)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                {moeda(linha.trimestre)}
              </td>
            </tr>
          ))}
          <tr className="bg-violet-50/70 dark:bg-violet-950/20">
            <th scope="row" className="px-4 py-3 font-semibold text-violet-800 dark:text-violet-200">
              Margem Bruta
            </th>
            <td className="px-4 py-3 text-right font-semibold text-violet-800 dark:text-violet-200">
              {mensal.resultado.margemBrutaPercent.toFixed(2)}%
            </td>
            <td className="px-4 py-3 text-right font-semibold text-violet-800 dark:text-violet-200">
              {trimestre.resultado.margemBrutaPercent.toFixed(2)}%
            </td>
          </tr>
          <tr className="bg-violet-50/70 dark:bg-violet-950/20">
            <th scope="row" className="px-4 py-3 font-semibold text-violet-800 dark:text-violet-200">
              Margem Operacional
            </th>
            <td className="px-4 py-3 text-right font-semibold text-violet-800 dark:text-violet-200">
              {mensal.resultado.margemOperacionalPercent.toFixed(2)}%
            </td>
            <td className="px-4 py-3 text-right font-semibold text-violet-800 dark:text-violet-200">
              {trimestre.resultado.margemOperacionalPercent.toFixed(2)}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function DREFinanceiroPage() {
  const [periodo, setPeriodo] = useState(obterPeriodoAtual);
  const sessao = resolverSessaoAtiva();
  const autorizado = podeAcessarDre(sessao?.role);
  const demonstrativo =
    autorizado && sessao
      ? obterDemonstrativoDre(sessao.tenantId, periodo)
      : null;

  if (!autorizado) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-12 sm:px-6">
        <section className="w-full rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900/70 dark:bg-zinc-900">
          <LockKeyhole className="mx-auto h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Acesso restrito
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            A DRE financeira está disponível somente para os perfis Financeiro,
            Gerente da Loja e Super Admin.
          </p>
        </section>
      </main>
    );
  }

  if (!demonstrativo) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold">DRE demonstrativa indisponível</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Não há dados de demonstração cadastrados para este tenant.
          </p>
        </section>
      </main>
    );
  }

  const resumo = demonstrativo.mensal;
  const valoresPagamento = FORMAS_PAGAMENTO_DRE.map((forma) => ({
    forma,
    valor: resumo.pagamentos[forma],
    percentual: calcularPercentual(
      resumo.pagamentos[forma],
      resumo.faturamentoBruto,
    ),
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
            <ChartNoAxesCombined className="h-4 w-4" aria-hidden />
            Financeiro
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            DRE Gerencial
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Resumo demonstrativo de receita, custos, despesas e meios de pagamento.
          </p>
        </div>
        <label className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm sm:w-auto dark:border-zinc-800 dark:bg-zinc-900">
          <CalendarDays className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
          <span className="whitespace-nowrap font-medium text-zinc-600 dark:text-zinc-300">
            Mês de referência
          </span>
          <input
            type="month"
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value)}
            aria-label="Mês de referência da DRE"
            className="min-w-0 bg-transparent font-semibold text-zinc-900 outline-none dark:text-zinc-50"
          />
        </label>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Dados simulados para demonstração; esta tela ainda não está conectada às
        vendas ou lançamentos financeiros persistidos.
      </div>

      <section aria-label="Resumo do mês" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoResumo
          titulo="Receita Bruta"
          valor={moeda(resumo.faturamentoBruto)}
          descricao="Vendas PDV no mês selecionado"
          icone={ArrowUpRight}
          cor="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <CartaoResumo
          titulo="Custo dos Produtos Vendidos"
          valor={moeda(resumo.cogs)}
          descricao="CPV demonstrativo do período"
          icone={ArrowDownRight}
          cor="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
        />
        <CartaoResumo
          titulo="Margem de Lucro Bruta"
          valor={`${resumo.resultado.margemBrutaPercent.toFixed(2)}%`}
          descricao={`Lucro bruto de ${moeda(resumo.resultado.lucroBruto)}`}
          icone={ChartNoAxesCombined}
          cor="bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
        />
        <CartaoResumo
          titulo="Despesas Operacionais"
          valor={moeda(resumo.despesasOperacionais)}
          descricao={`Resultado operacional: ${moeda(resumo.resultado.lucroOperacional)}`}
          icone={Wallet}
          cor="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        />
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Demonstrativo de Resultado
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Comparativo do mês de referência com o trimestre correspondente.
          </p>
        </div>
        <TabelaDre
          mensal={demonstrativo.mensal}
          trimestre={demonstrativo.trimestre}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Distribuição de Vendas
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Formas de pagamento no mês de referência.
          </p>
        </div>
        <div className="space-y-5">
          {valoresPagamento.map(({ forma, valor, percentual }) => {
            const Icon = PAGAMENTO_ICONES[forma];
            return (
              <div key={forma}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                    <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    {forma}
                  </span>
                  <span className="text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {moeda(valor)} <span className="font-normal text-zinc-500">({percentual.toFixed(1)}%)</span>
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${forma}: ${percentual.toFixed(1)}%`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Number(percentual.toFixed(1))}
                  className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                >
                  <div
                    className={`h-full rounded-full transition-[width] ${PAGAMENTO_CORES[forma]}`}
                    style={{ width: `${percentual}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
