"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCode2,
  FileText,
  Printer,
  RefreshCcw,
  Send,
  ShieldCheck,
  Wifi,
  X,
} from "lucide-react";

type FiscalTab = "fila" | "rejeicoes" | "sped";
type FiscalStatus = "AUTORIZADA" | "AGUARDANDO" | "REJEITADA" | "CANCELADA";
type DocumentType = "NFC-e" | "NF-e";

interface FiscalDocument {
  id: string;
  number: string;
  type: DocumentType;
  customer: string;
  command: string;
  total: number;
  status: FiscalStatus;
  key: string;
}

const DOCUMENTS: FiscalDocument[] = [
  { id: "nf-1051", number: "1051", type: "NFC-e", customer: "João Marcos Oliveira", command: "#1051", total: 984.8, status: "AUTORIZADA", key: "35261112345678000190550010000010511234567891" },
  { id: "nf-1050", number: "1050", type: "NF-e", customer: "Construtora Horizonte", command: "#1050", total: 18420, status: "AGUARDANDO", key: "35261112345678000195550010000010501234567892" },
  { id: "nf-1049", number: "1049", type: "NFC-e", customer: "Carlos Eduardo Souza", command: "#1049", total: 2840.75, status: "REJEITADA", key: "35261112345678000190550010000010491234567893" },
  { id: "nf-1048", number: "1048", type: "NF-e", customer: "Sigma Engenharia", command: "#1048", total: 28600, status: "AUTORIZADA", key: "35261112345678000195550010000010481234567894" },
  { id: "nf-1046", number: "1046", type: "NFC-e", customer: "Ana Paula Mendes", command: "#1046", total: 985.2, status: "CANCELADA", key: "35261112345678000190550010000010461234567895" },
];

const REJECTIONS = [
 { id: "rej-1049", document: "NF-e/Cupom 1049", code: "539", reason: "Duplicidade de documento fiscal na SEFAZ.", ncm: "25232910", cfop: "5102" },
 { id: "rej-1044", document: "NFC-e 1044", code: "204", reason: "NCM do produto não informado ou incompatível com CFOP.", ncm: "", cfop: "5101" },
 { id: "rej-1042", document: "NF-e 1042", code: "394", reason: "CFOP incompatível com operação de venda a consumidor.", ncm: "32149000", cfop: "" },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function EmissaoFiscalPage() {
  const [tab, setTab] = useState<FiscalTab>("fila");
  const [documents, setDocuments] = useState(DOCUMENTS);
  const [offlineMode, setOfflineMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState("2026-11");

  const pending = documents.filter((document) => document.status === "AGUARDANDO" || document.status === "REJEITADA");

  function downloadText(filename: string, content: string, type = "text/plain") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadXml(document: FiscalDocument) {
    downloadText(
      `NFe-${document.key}.xml`,
      `<?xml version="1.0" encoding="UTF-8"?><NFe><infNFe Id="${document.key}"><numero>${document.number}</numero><valor>${document.total.toFixed(2)}</valor></infNFe></NFe>`,
      "application/xml",
    );
    setNotice(`XML da nota ${document.number} preparado para download.`);
  }

  function retransmit(document: FiscalDocument) {
    setDocuments((current) => current.map((item) =>
      item.id === document.id ? { ...item, status: "AUTORIZADA" } : item,
    ));
    setNotice(`Documento ${document.number} transmitido novamente à SEFAZ e autorizado.`);
  }

  function cancelDocument(document: FiscalDocument) {
    setDocuments((current) => current.map((item) =>
      item.id === document.id ? { ...item, status: "CANCELADA" } : item,
    ));
    setNotice(`Cancelamento solicitado para o documento ${document.number}.`);
  }

  function exportSped() {
    const content = [
      "|0000|014|0|20261101|20261130|MATCOM MATERIAIS LTDA|00000000000000||SPED|",
      "|0001|0|",
      "|C100|0|0|||||||||||||||",
      "|0990|3|",
    ].join("\n");
    downloadText(`SPED-EFD-CONTRIB-${period}.txt`, content, "text/plain;charset=utf-8");
    setNotice(`Arquivo SPED do período ${period} gerado para download.`);
  }

  function exportMonthlyBatch() {
    const xmlManifest = documents.map((document) => `${document.key};${document.number};${document.total.toFixed(2)};${document.status}`).join("\n");
    downloadText(`LOTE-FISCAL-${period}.txt`, xmlManifest, "text/plain;charset=utf-8");
    exportSped();
    setNotice("Lote XML/SPED do mês preparado para download.");
  }

  const tabs: { key: FiscalTab; label: string }[] = [
    { key: "fila", label: "Fila de Emissão Pendente" },
    { key: "rejeicoes", label: "Contingência & Rejeições" },
    { key: "sped", label: "Gerador SPED & Contabilidade" },
  ];

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Fiscal &amp; Contabilidade</p>
            <h1 className="mt-1 text-2xl font-bold">Central Fiscal, Emissão de NFC-e/NF-e e SPED</h1>
          </div>
          <button type="button" onClick={exportMonthlyBatch} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700">
            <Download className="h-4 w-4" /> Exportar Lote XML / SPED do Mês
          </button>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <MonitorCard label="Status SEFAZ" value={offlineMode ? "INDISPONÍVEL" : "ONLINE"} detail={offlineMode ? "Contingência ativa" : "Autorização em tempo real"} icon={<Wifi />} tone={offlineMode ? "rose" : "emerald"} />
          <MonitorCard label="Modo de operação" value={offlineMode ? "Contingência Offline" : "Normal"} detail={offlineMode ? "Autorização após retorno" : "SEFAZ autorizadora"} icon={<ShieldCheck />} tone={offlineMode ? "amber" : "violet"} action={
            <button type="button" onClick={() => setOfflineMode((current) => !current)} className="text-[10px] font-bold underline">
              {offlineMode ? "Retornar ao normal" : "Simular contingência"}
            </button>
          } />
          <MonitorCard label="Certificado Digital A1" value="238 dias" detail="Expira em 02/07/2027" icon={<FileText />} tone="blue" />
        </section>

        {notice && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />{notice}
            <button type="button" onClick={() => setNotice("")} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-bold">Documentos fiscais emitidos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr><th className="px-4 py-3">Nota / Cupom</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Comanda</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status fiscal</th><th className="px-4 py-3">Chave de acesso</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-4 font-bold">{document.number}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-violet-50 px-2 py-1 font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{document.type}</span></td>
                    <td className="px-4 py-4">{document.customer}</td>
                    <td className="px-4 py-4 font-bold">{document.command}</td>
                    <td className="px-4 py-4 font-bold">{currency.format(document.total)}</td>
                    <td className="px-4 py-4"><FiscalBadge status={document.status} /></td>
                    <td className="px-4 py-4"><span className="block max-w-[220px] truncate font-mono text-[10px]" title={document.key}>{document.key}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => window.print()} title="Visualizar DANFE" className="rounded-lg border border-zinc-300 p-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"><Printer className="h-4 w-4" /></button>
                        <button type="button" onClick={() => downloadXml(document)} title="Baixar XML" className="rounded-lg border border-zinc-300 p-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"><FileCode2 className="h-4 w-4" /></button>
                        {(document.status === "AGUARDANDO" || document.status === "REJEITADA") && <button type="button" onClick={() => retransmit(document)} title="Transmitir novamente" className="rounded-lg border border-violet-300 p-2 text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950"><RefreshCcw className="h-4 w-4" /></button>}
                        {document.status !== "CANCELADA" && <button type="button" onClick={() => cancelDocument(document)} title="Solicitar cancelamento" className="rounded-lg border border-red-300 p-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"><X className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-5 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex min-w-max gap-6">
            {tabs.map((item) => (
              <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`border-b-2 py-3 text-xs font-bold ${tab === item.key ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400" : "border-transparent text-zinc-500 dark:text-zinc-400"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "fila" && <PendingQueue pending={pending} onTransmit={retransmit} />}
        {tab === "rejeicoes" && <Rejections />}
        {tab === "sped" && <SpedPanel period={period} setPeriod={setPeriod} onExport={exportSped} />}

        <footer className="py-7 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>
      <style jsx global>{`
        @media print { @page { size: A4; margin: 12mm; } body { background: white !important; } }
      `}</style>
    </main>
  );
}

function MonitorCard({ label, value, detail, icon, tone, action }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: "emerald" | "amber" | "blue" | "rose" | "violet"; action?: React.ReactNode }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    rose: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  };
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{label}</p><p className="mt-2 text-lg font-bold">{value}</p><p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{detail}</p>{action && <div className="mt-2">{action}</div>}</div><div className={`rounded-xl p-2.5 [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}>{icon}</div></div>
    </article>
  );
}

function FiscalBadge({ status }: { status: FiscalStatus }) {
  const labels = { AUTORIZADA: "Autorizada", AGUARDANDO: "Aguardando Transmissão", REJEITADA: "Rejeitada", CANCELADA: "Cancelada" };
  const classes = {
    AUTORIZADA: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    AGUARDANDO: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    REJEITADA: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    CANCELADA: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${classes[status]}`}>{labels[status]}</span>;
}

function PendingQueue({ pending, onTransmit }: { pending: FiscalDocument[]; onTransmit: (document: FiscalDocument) => void }) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800"><div><h2 className="text-sm font-bold">Fila de emissão pendente</h2><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Vendas finalizadas aguardando transmissão fiscal.</p></div><Send className="h-5 w-5 text-violet-500" /></div>
      {pending.length ? <div className="divide-y divide-zinc-200 dark:divide-zinc-800">{pending.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-bold">Documento {document.number} · {document.command}</p><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{document.customer} · {currency.format(document.total)}</p></div><button type="button" onClick={() => onTransmit(document)} className="rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold text-white">Transmitir agora</button></div>)}</div> : <p className="p-8 text-center text-sm text-zinc-500">Nenhum documento pendente.</p>}
    </section>
  );
}

function Rejections() {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800"><h2 className="text-sm font-bold">Contingência &amp; Rejeições SEFAZ</h2></div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {REJECTIONS.map((item) => (
          <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_100px_100px_auto] md:items-end">
            <div><p className="flex items-center gap-2 text-sm font-bold"><AlertTriangle className="h-4 w-4 text-red-500" />{item.document}</p><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Erro SEFAZ {item.code}: {item.reason}</p></div>
            <label className="text-[10px] font-bold">NCM<input defaultValue={item.ncm} className="mt-1 h-10 w-full rounded-lg border border-zinc-300 px-2 dark:border-zinc-700 dark:bg-zinc-950" /></label>
            <label className="text-[10px] font-bold">CFOP<input defaultValue={item.cfop} className="mt-1 h-10 w-full rounded-lg border border-zinc-300 px-2 dark:border-zinc-700 dark:bg-zinc-950" /></label>
            <button type="button" className="h-10 rounded-lg bg-violet-600 px-3 text-[10px] font-bold text-white">Corrigir &amp; Retransmitir</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpedPanel({ period, setPeriod, onExport }: { period: string; setPeriod: (value: string) => void; onExport: () => void }) {
  return (
    <section className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-bold">Gerador SPED &amp; Contabilidade</h2>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Gere o arquivo texto para o Escritório Contábil no período fiscal selecionado.</p>
        <label className="mt-4 block text-xs font-bold">Período fiscal
          <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-950"><p className="text-[10px] uppercase text-zinc-500">SPED EFD</p><p className="mt-1 text-sm font-bold">Pronto</p></div>
          <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-950"><p className="text-[10px] uppercase text-zinc-500">Contribuições</p><p className="mt-1 text-sm font-bold">Pronto</p></div>
        </div>
      </div>
      <div className="flex flex-col justify-between rounded-2xl bg-violet-600 p-5 text-white">
        <FileCode2 className="h-7 w-7" />
        <div className="mt-8"><p className="text-xs opacity-80">Arquivo fiscal</p><p className="mt-1 text-lg font-bold">SPED {period}</p></div>
        <button type="button" onClick={onExport} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-violet-700"><Download className="h-4 w-4" />Gerar e baixar arquivo</button>
      </div>
    </section>
  );
}
