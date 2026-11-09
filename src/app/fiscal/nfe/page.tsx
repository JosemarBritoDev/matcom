"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  FileCode2,
  FileText,
  Printer,
  RefreshCcw,
  ShieldCheck,
  Wifi,
  X,
} from "lucide-react";

import {
  filtrarNotasDoPeriodo,
  gerarXmlNotaFiscal,
  criarArquivoZip,
  type NotaFiscalNfeMock,
  type StatusNotaFiscalNfe,
} from "@/lib/fiscal-nfe";
import {
  featureFlagsParaModulos as converterFlagsParaModulos,
  verificarAcessoModulo,
} from "@/lib/permissions";
import {
  carregarTenantMock,
  type TenantAdministradoMock,
} from "@/lib/tenant-admin-mock";
import {
  filtrarPorTenantAtivo,
  podeAcessarTenant,
  resolverSessaoAtiva,
} from "@/lib/session";

const DOCUMENTOS_DEMONSTRACAO: NotaFiscalNfeMock[] = [
  {
    id: "nfe-1051",
    tenantId: "tenant-matcom",
    numero: "1051",
    serie: "1",
    cliente: "João Marcos Oliveira",
    valor: 984.8,
    status: "TRANSMITIDA",
    emitidaEm: "2026-11-09T10:15:00.000Z",
    chave: "35261111222333000181550010000010511234567890",
    tipo: "NFCE",
  },
  {
    id: "nfe-1050",
    tenantId: "tenant-matcom",
    numero: "1050",
    serie: "1",
    cliente: "Construtora Horizonte",
    valor: 18420,
    status: "PENDENTE",
    emitidaEm: "2026-11-08T15:40:00.000Z",
    chave: "35261111222333000181550010000010501234567891",
    tipo: "NFE",
  },
  {
    id: "nfe-1049",
    tenantId: "tenant-matcom",
    numero: "1049",
    serie: "1",
    cliente: "Carlos Eduardo Souza",
    valor: 2840.75,
    status: "REJEITADA",
    emitidaEm: "2026-11-07T13:20:00.000Z",
    chave: "35261111222333000181550010000010491234567892",
    tipo: "NFCE",
  },
  {
    id: "nfe-1048",
    tenantId: "tenant-matcom",
    numero: "1048",
    serie: "1",
    cliente: "Sigma Engenharia",
    valor: 28600,
    status: "TRANSMITIDA",
    emitidaEm: "2026-10-28T09:05:00.000Z",
    chave: "35261011222333000181550010000010481234567893",
    tipo: "NFE",
  },
  {
    id: "nfe-1046",
    tenantId: "tenant-matcom",
    numero: "1046",
    serie: "1",
    cliente: "Ana Paula Mendes",
    valor: 985.2,
    status: "CANCELADA",
    emitidaEm: "2026-11-05T16:30:00.000Z",
    chave: "35261111222333000181550010000010461234567894",
    tipo: "NFCE",
  },
];

const ROTULOS_STATUS: Record<StatusNotaFiscalNfe, string> = {
  TRANSMITIDA: "Transmitida",
  PENDENTE: "Pendente",
  REJEITADA: "Rejeitada",
  CANCELADA: "Cancelada",
};

const CLASSES_STATUS: Record<StatusNotaFiscalNfe, string> = {
  TRANSMITIDA:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  PENDENTE:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  REJEITADA: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  CANCELADA: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function FiscalNfePage() {
  const sessao = resolverSessaoAtiva();
  const [tenant, setTenant] = useState<TenantAdministradoMock | null>(null);
  const [documentos, setDocumentos] = useState(DOCUMENTOS_DEMONSTRACAO);
  const [contingencia, setContingencia] = useState(false);
  const [ambiente, setAmbiente] = useState<"HOMOLOGACAO" | "PRODUCAO">(
    "HOMOLOGACAO",
  );
  const [periodo, setPeriodo] = useState("2026-11");
  const [aviso, setAviso] = useState("");
  const [erroSessao, setErroSessao] = useState("");

  useEffect(() => {
    if (!sessao || !podeAcessarTenant(sessao, sessao.tenantId)) {
      return;
    }

    try {
      setTenant(carregarTenantMock(sessao, sessao.tenantId));
    } catch (erro) {
      setErroSessao(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar o tenant da sessão.",
      );
    }
  }, [sessao]);

  const acesso = tenant
    ? verificarAcessoModulo(
        converterFlagsParaModulos(tenant.featureFlags),
        "nfe",
      )
    : null;

  const documentosTenant = useMemo(
    () => (sessao ? filtrarPorTenantAtivo(sessao, documentos) : []),
    [documentos, sessao],
  );

  const documentosPeriodo = useMemo(() => {
    if (!tenant) {
      return [];
    }

    return filtrarNotasDoPeriodo(documentosTenant, tenant.id, periodo);
  }, [documentosTenant, periodo, tenant]);

  function baixarArquivo(nome: string, conteudo: BlobPart, tipo: string) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  }

  function baixarXml(nota: NotaFiscalNfeMock) {
    baixarArquivo(
      `NFe-${nota.numero}-${nota.serie}.xml`,
      gerarXmlNotaFiscal(nota),
      "application/xml;charset=utf-8",
    );
    setAviso(`XML da nota ${nota.numero} baixado.`);
  }

  function reenviar(nota: NotaFiscalNfeMock) {
    if (nota.status === "CANCELADA" || nota.tenantId !== tenant?.id) {
      return;
    }

    setDocumentos((atuais) =>
      atuais.map((item) =>
        item.id === nota.id ? { ...item, status: "TRANSMITIDA" } : item,
      ),
    );
    setAviso(
      `Documento ${nota.numero} marcado como transmitido na simulação local.`,
    );
  }

  function exportarLoteContabil() {
    if (!tenant || documentosPeriodo.length === 0) {
      setAviso("Não há XMLs deste tenant no período selecionado.");
      return;
    }

    try {
      const arquivos = documentosPeriodo.map((nota) => ({
        nome: `NFe-${nota.numero.replace(/[^0-9A-Za-z_-]/g, "_")}-${nota.serie}.xml`,
        conteudo: gerarXmlNotaFiscal(nota),
      }));
      const zip = criarArquivoZip(arquivos);

      baixarArquivo(
        `Lote-Contabil-${periodo}.zip`,
        zip,
        "application/zip",
      );
      setAviso(
        `Lote contábil de ${periodo} gerado com ${arquivos.length} XML(s).`,
      );
    } catch (erro) {
      setAviso(
        erro instanceof Error
          ? erro.message
          : "Não foi possível gerar o lote contábil.",
      );
    }
  }

  if (!sessao || !podeAcessarTenant(sessao, sessao.tenantId)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-violet-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Sessão necessária</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Acesse com um usuário autorizado para consultar o painel fiscal.
        </p>
      </main>
    );
  }

  if (erroSessao) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Não foi possível abrir o fiscal</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {erroSessao}
        </p>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-zinc-500">
        Carregando o tenant ativo…
      </main>
    );
  }

  if (!acesso?.permitido) {
    return (
      <main className="min-h-full bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-2xl border border-violet-200 bg-white p-6 text-center shadow-sm dark:border-violet-900/60 dark:bg-zinc-900 sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
            <FileText className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            Módulo adicional
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">
            Emissão Fiscal SEFAZ
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {acesso?.motivo}
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
          >
            Ver disponibilidade do módulo
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
              Fiscal &amp; Contabilidade · {tenant.nome}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">
              Painel Fiscal SEFAZ
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Notas fiscais e lote contábil do tenant ativo.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Simulação local — sem transmissão à SEFAZ
          </span>
        </header>

        <section
          aria-label="Status fiscal"
          className="mt-5 grid gap-3 md:grid-cols-3"
        >
          <MonitorCard
            label="Status SEFAZ"
            valor={contingencia ? "Contingência" : "Online"}
            detalhe={
              contingencia
                ? "Documentos aguardam o retorno do serviço"
                : "Conexão representada pela simulação local"
            }
            icone={Wifi}
            tom={contingencia ? "amber" : "emerald"}
          />
          <MonitorCard
            label="Certificado Digital A1"
            valor="Válido até 02/07/2027"
            detalhe="Certificado demonstrativo · dados privados não carregados"
            icone={ShieldCheck}
            tom="violet"
          />
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <label
              htmlFor="ambiente-fiscal"
              className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400"
            >
              Ambiente de emissão
            </label>
            <select
              id="ambiente-fiscal"
              value={ambiente}
              onChange={(event) =>
                setAmbiente(event.target.value as "HOMOLOGACAO" | "PRODUCAO")
              }
              className="mt-2 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-bold dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="HOMOLOGACAO">Homologação</option>
              <option value="PRODUCAO">Produção (simulada)</option>
            </select>
            <button
              type="button"
              onClick={() => setContingencia((atual) => !atual)}
              className="mt-2 text-xs font-semibold text-violet-700 underline dark:text-violet-300"
            >
              {contingencia ? "Simular retorno online" : "Simular contingência"}
            </button>
          </article>
        </section>

        {aviso && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {aviso}
            <button
              type="button"
              aria-label="Fechar mensagem"
              onClick={() => setAviso("")}
              className="ml-auto"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div>
              <h2 className="font-bold">Notas fiscais e cupons</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {documentosTenant.length} documento(s) demonstrativo(s) do
                tenant.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Lote mensal
                <input
                  type="month"
                  value={periodo}
                  onChange={(event) => setPeriodo(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </label>
              <button
                type="button"
                onClick={exportarLoteContabil}
                className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700"
              >
                <FileArchive className="h-4 w-4" aria-hidden />
                Exportar Lote Contábil (.ZIP)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Número / Tipo</th>
                  <th className="px-4 py-3">Série</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {documentosTenant.map((nota) => (
                  <tr key={nota.id}>
                    <td className="px-4 py-4">
                      <p className="font-bold">{nota.numero}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {nota.tipo}
                      </p>
                    </td>
                    <td className="px-4 py-4">{nota.serie}</td>
                    <td className="px-4 py-4">{nota.cliente}</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">
                      {moeda.format(nota.valor)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${CLASSES_STATUS[nota.status]}`}
                      >
                        {ROTULOS_STATUS[nota.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Baixar XML ${nota.numero}`}
                          onClick={() => baixarXml(nota)}
                          title="Baixar XML"
                          className="rounded-lg border border-zinc-300 p-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          <FileCode2 className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={`DANFE ${nota.numero}`}
                          onClick={() => window.print()}
                          title="Visualizar DANFE"
                          className="rounded-lg border border-zinc-300 p-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          <Printer className="h-4 w-4" aria-hidden />
                        </button>
                        {nota.status !== "CANCELADA" && (
                          <button
                            type="button"
                            aria-label={`Reenviar ${nota.numero}`}
                            onClick={() => reenviar(nota)}
                            disabled={nota.status === "TRANSMITIDA"}
                            title="Reenviar"
                            className="rounded-lg border border-violet-300 p-2 text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950"
                          >
                            <RefreshCcw className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {documentosTenant.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-zinc-500"
                    >
                      Nenhum documento fiscal deste tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1 border-t border-zinc-200 bg-zinc-50/70 px-4 py-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/40">
            <p className="font-semibold">
              Ambiente selecionado:{" "}
              {ambiente === "HOMOLOGACAO"
                ? "Homologação"
                : "Produção (simulada)"}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              A chave e o certificado são dados ilustrativos; este painel não
              consulta a SEFAZ nem envia documentos fiscais.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function MonitorCard({
  label,
  valor,
  detalhe,
  icone: Icon,
  tom,
}: {
  label: string;
  valor: string;
  detalhe: string;
  icone: typeof Wifi;
  tom: "amber" | "emerald" | "violet";
}) {
  const classes = {
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    violet:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  };

  return (
    <article className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-2 font-bold">{valor}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {detalhe}
        </p>
      </div>
      <span className={`rounded-xl p-2.5 ${classes[tom]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
    </article>
  );
}
