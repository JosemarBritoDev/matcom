export type StatusNotaFiscalNfe =
  | "TRANSMITIDA"
  | "PENDENTE"
  | "REJEITADA"
  | "CANCELADA";

export interface NotaFiscalNfeMock {
  id: string;
  tenantId: string;
  numero: string;
  serie: string;
  cliente: string;
  valor: number;
  status: StatusNotaFiscalNfe;
  emitidaEm: string;
  chave: string;
  tipo: "NFE" | "NFCE";
}

export interface ArquivoZip {
  nome: string;
  conteudo: string;
}

const UTF8 = new TextEncoder();
const CRC32_TABELA = Array.from({ length: 256 }, (_, valor) => {
  let crc = valor;

  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  return crc >>> 0;
});

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC32_TABELA[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function exigirValor16Bits(valor: number, campo: string): void {
  if (!Number.isInteger(valor) || valor < 0 || valor > 0xffff) {
    throw new RangeError(`${campo} excede o limite suportado pelo ZIP.`);
  }
}

function exigirValor32Bits(valor: number, campo: string): void {
  if (!Number.isSafeInteger(valor) || valor < 0 || valor > 0xffffffff) {
    throw new RangeError(`${campo} excede o limite suportado pelo ZIP.`);
  }
}

export function filtrarNotasDoPeriodo(
  notas: ReadonlyArray<NotaFiscalNfeMock>,
  tenantId: string,
  periodo: string,
): NotaFiscalNfeMock[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    throw new Error("Informe o período no formato AAAA-MM.");
  }

  if (!tenantId.trim()) {
    throw new Error("Tenant obrigatório para consultar documentos fiscais.");
  }

  return notas.filter(
    (nota) =>
      nota.tenantId === tenantId &&
      nota.emitidaEm.slice(0, 7) === periodo,
  );
}

export function gerarXmlNotaFiscal(nota: NotaFiscalNfeMock): string {
  const valor = nota.valor.toFixed(2);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<NFe tipo="${nota.tipo}" chave="${escaparXml(nota.chave)}">`,
    `  <numero>${escaparXml(nota.numero)}</numero>`,
    `  <serie>${escaparXml(nota.serie)}</serie>`,
    `  <cliente>${escaparXml(nota.cliente)}</cliente>`,
    `  <valor>${valor}</valor>`,
    `  <status>${nota.status}</status>`,
    `  <emitidaEm>${escaparXml(nota.emitidaEm)}</emitidaEm>`,
    "</NFe>",
  ].join("\n");
}

/** Cria um ZIP padrão sem compressão, compatível com extratores comuns. */
export function criarArquivoZip(
  arquivos: ReadonlyArray<ArquivoZip>,
): ArrayBuffer {
  if (arquivos.length === 0) {
    throw new Error("O lote contábil não possui arquivos para exportar.");
  }

  const nomes = new Set<string>();
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let deslocamentoLocal = 0;

  for (const arquivo of arquivos) {
    if (
      !arquivo.nome.trim() ||
      arquivo.nome.includes("/") ||
      arquivo.nome.includes("\\") ||
      nomes.has(arquivo.nome)
    ) {
      throw new Error("O ZIP contém um nome de arquivo inválido ou duplicado.");
    }

    nomes.add(arquivo.nome);

    const nome = UTF8.encode(arquivo.nome);
    const dados = UTF8.encode(arquivo.conteudo);
    const crc = crc32(dados);
    const tamanho = dados.length;

    exigirValor16Bits(nome.length, "Nome do arquivo");
    exigirValor32Bits(tamanho, "Tamanho do arquivo");
    exigirValor32Bits(deslocamentoLocal, "Deslocamento local");

    const local = new Uint8Array(30 + nome.length + tamanho);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0x0021, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, tamanho, true);
    localView.setUint32(22, tamanho, true);
    localView.setUint16(26, nome.length, true);
    localView.setUint16(28, 0, true);
    local.set(nome, 30);
    local.set(dados, 30 + nome.length);
    locais.push(local);

    const central = new Uint8Array(46 + nome.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0x0021, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, tamanho, true);
    centralView.setUint32(24, tamanho, true);
    centralView.setUint16(28, nome.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, deslocamentoLocal, true);
    central.set(nome, 46);
    centrais.push(central);

    deslocamentoLocal += local.length;
  }

  exigirValor16Bits(arquivos.length, "Quantidade de arquivos");
  exigirValor32Bits(deslocamentoLocal, "Tamanho dos dados locais");
  const tamanhoCentral = centrais.reduce((total, parte) => total + parte.length, 0);
  exigirValor32Bits(tamanhoCentral, "Tamanho do diretório central");

  const fim = new Uint8Array(22);
  const fimView = new DataView(fim.buffer);
  fimView.setUint32(0, 0x06054b50, true);
  fimView.setUint16(4, 0, true);
  fimView.setUint16(6, 0, true);
  fimView.setUint16(8, arquivos.length, true);
  fimView.setUint16(10, arquivos.length, true);
  fimView.setUint32(12, tamanhoCentral, true);
  fimView.setUint32(16, deslocamentoLocal, true);
  fimView.setUint16(20, 0, true);

  const total = deslocamentoLocal + tamanhoCentral + fim.length;
  exigirValor32Bits(total, "Tamanho total do ZIP");

  const buffer = new ArrayBuffer(total);
  const zip = new Uint8Array(buffer);
  let cursor = 0;

  for (const parte of locais) {
    zip.set(parte, cursor);
    cursor += parte.length;
  }

  for (const parte of centrais) {
    zip.set(parte, cursor);
    cursor += parte.length;
  }

  zip.set(fim, cursor);
  return buffer;
}
