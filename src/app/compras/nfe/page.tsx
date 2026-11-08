"use client";

import { ChangeEvent, DragEvent, FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCode2,
  PackageCheck,
  Search,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";

interface MatComProduct {
  id: string;
  code: string;
  description: string;
  stock: number;
  stockUnit: string;
  cost: number;
}

interface NfeItem {
  id: string;
  supplierCode: string;
  description: string;
  ncm: string;
  quantity: number;
  fiscalUnit: string;
  unitCost: number;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  productId: string;
  conversionFactor: number;
}

interface NfeInstallment {
  id: string;
  number: string;
  dueDate: string;
  value: number;
}

interface NfeData {
  emitter: string;
  document: string;
  number: string;
  series: string;
  total: number;
  key: string;
  items: NfeItem[];
  installments: NfeInstallment[];
}

const PRODUCTS: MatComProduct[] = [
  {
    id: "prod-cimento",
    code: "CIM-001",
    description: "Cimento CP II 50 kg",
    stock: 320,
    stockUnit: "saco",
    cost: 36.8,
  },
  {
    id: "prod-tela",
    code: "TEL-008",
    description: "Tela soldada Q-138",
    stock: 75,
    stockUnit: "un",
    cost: 176.4,
  },
  {
    id: "prod-argamassa",
    code: "ARG-006",
    description: "Argamassa AC-III 20 kg",
    stock: 210,
    stockUnit: "saco",
    cost: 39.15,
  },
  {
    id: "prod-vergalhao",
    code: "VER-007",
    description: "Vergalhão CA-50 10 mm 12 m",
    stock: 340,
    stockUnit: "un",
    cost: 64.3,
  },
];

const USED_NFE_KEYS = [
  "35250112345678000190550010000001011234567890",
  "35251112345678000190550010000001881234567891",
];

const DEMO_NFE: NfeData = {
  emitter: "Distribuidora Forte Materiais Ltda.",
  document: "12.345.678/0001-90",
  number: "1011",
  series: "1",
  total: 15240.5,
  key: "",
  items: [
    {
      id: "xml-item-1",
      supplierCode: "FOR-CIM50",
      description: "Cimento CP II Saco 50 kg",
      ncm: "25232910",
      quantity: 120,
      fiscalUnit: "SC",
      unitCost: 38.9,
      icms: 12,
      ipi: 0,
      pis: 1.65,
      cofins: 7.6,
      productId: "prod-cimento",
      conversionFactor: 50,
    },
    {
      id: "xml-item-2",
      supplierCode: "FOR-ARG20",
      description: "Argamassa AC III Sacos 20 kg",
      ncm: "32149000",
      quantity: 80,
      fiscalUnit: "CX",
      unitCost: 42.5,
      icms: 12,
      ipi: 0,
      pis: 1.65,
      cofins: 7.6,
      productId: "prod-argamassa",
      conversionFactor: 20,
    },
    {
      id: "xml-item-3",
      supplierCode: "FOR-VER10",
      description: "Vergalhão CA-50 10 mm 12 m",
      ncm: "72142000",
      quantity: 60,
      fiscalUnit: "BAR",
      unitCost: 68.9,
      icms: 18,
      ipi: 5,
      pis: 1.65,
      cofins: 7.6,
      productId: "prod-vergalhao",
      conversionFactor: 1,
    },
  ],
  installments: [
    { id: "dup-001", number: "001", dueDate: "2026-12-08", value: 7620.25 },
    { id: "dup-002", number: "002", dueDate: "2027-01-07", value: 7620.25 },
  ],
};

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBRL(value: number) {
  return brlFormatter.format(value);
}

function xmlText(document: Document, name: string) {
  return document.getElementsByTagName(name)[0]?.textContent?.trim() ?? "";
}

function xmlNumber(document: Document, name: string) {
  const value = xmlText(document, name).replace(",", ".");
  return Number(value) || 0;
}

function parseNfeXml(xml: string, fallbackKey: string): NfeData {
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  const items = Array.from(parsed.getElementsByTagName("det"));
  const parsedItems: NfeItem[] = items.map((det, index) => {
    const code = det.getElementsByTagName("cProd")[0]?.textContent?.trim() ?? "";
    const description =
      det.getElementsByTagName("xProd")[0]?.textContent?.trim() ??
      `Item importado ${index + 1}`;
    const ncm = det.getElementsByTagName("NCM")[0]?.textContent?.trim() ?? "";
    const quantity =
      Number(det.getElementsByTagName("qCom")[0]?.textContent) || 0;
    const unit =
      det.getElementsByTagName("uCom")[0]?.textContent?.trim()?.toUpperCase() ??
      "UN";
    const unitCost =
      Number(det.getElementsByTagName("vUnCom")[0]?.textContent) || 0;
    const icmsNode = Array.from(det.getElementsByTagName("ICMS"))[0];
    const pIcms =
      icmsNode && Array.from(icmsNode.getElementsByTagName("pICMS"))[0]
        ? Number(Array.from(icmsNode.getElementsByTagName("pICMS"))[0].textContent)
        : 0;

    return {
      id: `xml-item-${index + 1}`,
      supplierCode: code,
      description,
      ncm,
      quantity,
      fiscalUnit: unit,
      unitCost,
      icms: pIcms,
      ipi: Number(det.getElementsByTagName("pIPI")[0]?.textContent) || 0,
      pis: Number(det.getElementsByTagName("pPIS")[0]?.textContent) || 0,
      cofins: Number(det.getElementsByTagName("pCOFINS")[0]?.textContent) || 0,
      productId: "",
      conversionFactor: 1,
    };
  });

  const duplicates = Array.from(parsed.getElementsByTagName("dup")).map(
    (duplicate, index) => ({
      id: `dup-${index + 1}`,
      number:
        duplicate.getElementsByTagName("nDup")[0]?.textContent?.trim() ??
        String(index + 1).padStart(3, "0"),
      dueDate:
        duplicate.getElementsByTagName("dVenc")[0]?.textContent?.trim() ?? "",
      value:
        Number(duplicate.getElementsByTagName("vDup")[0]?.textContent) || 0,
    }),
  );

  const key =
    fallbackKey ||
    xmlText(parsed, "chNFe").replace(/\D/g, "") ||
    parsed.getElementsByTagName("infNFe")[0]?.getAttribute("Id")?.replace(/\D/g, "") ||
    "";

  return {
    emitter: xmlText(parsed, "xNome"),
    document: xmlText(parsed, "CNPJ"),
    number: xmlText(parsed, "nNF"),
    series: xmlText(parsed, "serie"),
    total: xmlNumber(parsed, "vNF"),
    key: key.replace(/\D/g, ""),
    items: parsedItems,
    installments:
      duplicates.length > 0
        ? duplicates
        : DEMO_NFE.installments,
  };
}

export default function ComprasNfePage() {
  const [nfe, setNfe] = useState<NfeData>(DEMO_NFE);
  const [accessKey, setAccessKey] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("nota-fiscal-demo.xml");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [productFilter, setProductFilter] = useState<Record<string, string>>({});

  const normalizedKey = accessKey.replace(/\D/g, "");
  const effectiveKey = normalizedKey || nfe.key;
  const duplicateKey = USED_NFE_KEYS.includes(effectiveKey);

  const unmappedItems = nfe.items.filter((item) => !item.productId).length;
  const estimatedStock = useMemo(
    () =>
      nfe.items.reduce((total, item) => {
        const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
        if (!product) return total;
        return total + item.quantity * item.conversionFactor;
      }, 0),
    [nfe.items],
  );

  function readXml(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseNfeXml(String(reader.result ?? ""), normalizedKey);
        setNfe(parsed);
        setFileName(file.name);
        setError("");
        setConfirmed(false);
      } catch {
        setError("Não foi possível ler o XML da NF-e.");
      }
    };
    reader.onerror = () => setError("Falha ao ler o arquivo XML.");
    reader.readAsText(file);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) readXml(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      setError("Selecione um arquivo XML da NF-e.");
      return;
    }
    readXml(file);
  }

  function updateItem(id: string, patch: Partial<NfeItem>) {
    setNfe((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
    setConfirmed(false);
  }

  function confirmEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedKey && !nfe.key) {
      setError("Informe a chave de acesso com 44 dígitos.");
      return;
    }
    if (normalizedKey.length !== 44) {
      setError("A chave de acesso deve conter exatamente 44 dígitos.");
      return;
    }
    if (duplicateKey) {
      setError("Entrada bloqueada: esta chave de acesso já foi registrada.");
      return;
    }
    if (unmappedItems > 0) {
      setError("Vincule todos os itens da NF-e antes de confirmar a entrada.");
      return;
    }

    setError("");
    setConfirmed(true);
    setMessage(
      `Entrada conferida. ${nfe.items.length} produto(s) adicionados ao estoque e ${nfe.installments.length} título(s) gerado(s) em Contas a Pagar.`,
    );
  }

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                Compras
              </p>
              <h1 className="text-xl font-bold sm:text-2xl">
                Entrada de Compras &amp; NF-e de Fornecedores
              </h1>
            </div>
            <div className="rounded-xl border border-zinc-200 px-3 py-2 text-right dark:border-zinc-800">
              <p className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">
                Status fiscal
              </p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Pré-entrada não confirmada
              </p>
            </div>
          </div>

          <form onSubmit={confirmEntry} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
                dragActive
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                  : "border-zinc-300 hover:border-violet-400 dark:border-zinc-700"
              }`}
            >
              <input type="file" accept=".xml,application/xml,text/xml" onChange={handleFile} className="sr-only" />
              <UploadCloud className="h-8 w-8 text-violet-600 dark:text-violet-400" aria-hidden />
              <span className="mt-2 text-sm font-bold">Arraste o XML aqui</span>
              <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                ou clique para selecionar · {fileName}
              </span>
            </label>

            <div>
              <label htmlFor="access-key" className="text-xs font-bold">
                Chave de acesso da NF-e
              </label>
              <input
                id="access-key"
                inputMode="numeric"
                maxLength={44}
                value={accessKey}
                onChange={(event) => {
                  setAccessKey(event.target.value.replace(/\D/g, ""));
                  setConfirmed(false);
                  setError("");
                }}
                placeholder="44 dígitos"
                className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-sm tracking-wide focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {normalizedKey.length}/44 dígitos
                </span>
                {duplicateKey && (
                  <span className="font-bold text-red-600 dark:text-red-400">
                    Chave já registrada
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric label="Itens XML" value={String(nfe.items.length)} />
                <Metric label="Saldo físico previsto" value={String(estimatedStock)} />
              </div>
            </div>
          </form>
        </section>

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        )}
        {message && !error && (
          <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {message}
          </div>
        )}

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Info label="Emitente" value={nfe.emitter} className="col-span-2 sm:col-span-1" />
            <Info label="CNPJ" value={nfe.document} />
            <Info label="Nota / Série" value={`${nfe.number || "—"} / ${nfe.series || "—"}`} />
            <Info label="Valor total" value={formatBRL(nfe.total)} />
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <PackageCheck className="h-5 w-5" aria-hidden />
              <span className="text-xs font-bold uppercase">Mapa de itens</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{nfe.items.length - unmappedItems}/{nfe.items.length}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">produtos vinculados ao MatCom</p>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-bold">De-Para de Produtos &amp; Fracionamento</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Vincule o produto fiscal ao cadastro físico e informe quantas unidades primárias são recebidas por embalagem.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Item XML / NCM</th>
                  <th className="px-4 py-3">Qtd.</th>
                  <th className="px-4 py-3">Un. fiscal</th>
                  <th className="px-4 py-3">Custo unit.</th>
                  <th className="px-4 py-3">Tributos ICMS/IPI/PIS/COFINS</th>
                  <th className="px-4 py-3">Produto MatCom</th>
                  <th className="px-4 py-3">Fator / Estoque físico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {nfe.items.map((item) => {
                  const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
                  const weightedCost = product
                    ? (product.stock * product.cost + item.quantity * item.conversionFactor * item.unitCost) /
                      (product.stock + item.quantity * item.conversionFactor || 1)
                    : 0;

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold">{item.supplierCode}</p>
                        <p className="mt-0.5 max-w-[240px]">{item.description}</p>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">NCM {item.ncm || "—"}</p>
                      </td>
                      <td className="px-4 py-4">{item.quantity}</td>
                      <td className="px-4 py-4 font-bold">{item.fiscalUnit}</td>
                      <td className="px-4 py-4 font-bold">{formatBRL(item.unitCost)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {item.icms}% / {item.ipi}% / {item.pis}% / {item.cofins}%
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" aria-hidden />
                          <select
                            value={item.productId}
                            onChange={(event) => updateItem(item.id, { productId: event.target.value })}
                            className="h-9 w-64 rounded-lg border border-zinc-300 bg-white pl-7 pr-2 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-950"
                          >
                            <option value="">Selecionar produto...</option>
                            {PRODUCTS.filter((candidate) =>
                              candidate.description.toLowerCase().includes((productFilter[item.id] ?? "").toLowerCase()),
                            ).map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.code} · {candidate.description}
                              </option>
                            ))}
                          </select>
                          <input
                            value={productFilter[item.id] ?? ""}
                            onChange={(event) =>
                              setProductFilter((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            placeholder="Filtrar"
                            className="mt-1 h-8 w-64 rounded-lg border border-zinc-300 px-2 text-[11px] dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.conversionFactor}
                            onChange={(event) =>
                              updateItem(item.id, {
                                conversionFactor: Math.max(0.001, Number(event.target.value)),
                              })
                            }
                            className="h-9 w-20 rounded-lg border border-zinc-300 px-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                          />
                          <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden />
                          <div>
                            <p className="font-bold">
                              {(item.quantity * item.conversionFactor).toLocaleString("pt-BR", {
                                maximumFractionDigits: 3,
                              })} {product?.stockUnit ?? "un"}
                            </p>
                            <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                              CMU estimado {formatBRL(weightedCost)}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
            <WalletCards className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
            <div>
              <h2 className="text-sm font-bold">Duplicatas e Títulos a Pagar</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Será gerado automaticamente após a confirmação fiscal.
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {nfe.installments.map((installment) => (
              <div key={installment.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">
                    Parcela {installment.number}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                </div>
                <p className="mt-2 font-bold">{formatBRL(installment.value)}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Vencimento: {installment.dueDate ? new Date(`${installment.dueDate}T12:00:00`).toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={confirmEntry}>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setNfe(DEMO_NFE);
                setAccessKey("");
                setError("");
                setConfirmed(false);
                setMessage("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 text-xs font-bold uppercase dark:border-zinc-700"
            >
              <X className="h-4 w-4" aria-hidden />
              Limpar pré-entrada
            </button>
            <button
              type="submit"
              disabled={duplicateKey || confirmed}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-bold uppercase text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            >
              {confirmed ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <FileCode2 className="h-4 w-4" aria-hidden />}
              {confirmed ? "Entrada confirmada" : "Confirmar entrada fiscal"}
            </button>
          </div>
        </form>

        <footer className="py-6 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function Info({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || "—"}</p>
    </div>
  );
}
