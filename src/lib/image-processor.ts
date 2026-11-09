/**
 * Processador de imagens do catálogo MatCom.
 *
 * Redimensiona uploads ou capturas de câmera para no máximo 800 × 800 px e
 * converte para WebP com compressão progressiva até aproximar o arquivo de
 * ~40 KB. O resultado é usado como thumbnail em PDV, Compras e Expedição.
 *
 * As funções de cálculo são puras e podem rodar em qualquer ambiente. Já
 * `processarImagem` depende de Canvas/DOM e deve ser chamada apenas no cliente.
 */

export const DIMENSAO_MAXIMA_IMAGEM = 800;
export const ALVO_BYTES_WEBP = 40 * 1024;
export const TAMANHO_MAXIMO_UPLOAD_BYTES = 15 * 1024 * 1024;
export const QUALIDADE_WEBP_INICIAL = 0.82;
export const QUALIDADE_WEBP_MINIMA = 0.35;
export const DIMENSAO_MINIMA_REDUCAO = 320;

const PASSO_QUALIDADE = 0.07;
const MAXIMO_REDUCOES = 8;

export interface DimensoesImagem {
  largura: number;
  altura: number;
}

export interface OpcoesProcessamentoImagem {
  /** Lado máximo da imagem final. Padrão: 800 px. */
  dimensaoMaxima?: number;
  /** Tamanho desejado em bytes. Padrão: 40 KB. */
  alvoBytes?: number;
  /** Qualidade WebP inicial, entre 0.1 e 1. Padrão: 0.82. */
  qualidadeInicial?: number;
  /** Qualidade WebP mínima antes de reduzir dimensões. Padrão: 0.35. */
  qualidadeMinima?: number;
}

export interface ImagemProcessada {
  blob: Blob;
  dataUrl: string;
  largura: number;
  altura: number;
  bytes: number;
  bytesOriginais: number;
  mimeType: string;
  qualidade: number;
  redimensionada: boolean;
  reducoesExtras: number;
}

interface FonteDecodificada {
  largura: number;
  altura: number;
  desenhar: (
    contexto: CanvasRenderingContext2D,
    largura: number,
    altura: number,
  ) => void;
  liberar: () => void;
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

function arredondarQualidade(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Calcula as dimensões finais preservando a proporção da imagem.
 *
 * Imagens menores que o limite são mantidas no tamanho original — nunca são
 * ampliadas, evitando perda de nitidez.
 */
export function calcularDimensoesRedimensionadas(
  largura: number,
  altura: number,
  dimensaoMaxima = DIMENSAO_MAXIMA_IMAGEM,
): DimensoesImagem {
  if (!Number.isFinite(largura) || !Number.isFinite(altura)) {
    throw new RangeError("As dimensões da imagem precisam ser números finitos.");
  }

  const larguraSegura = Math.max(1, Math.round(largura));
  const alturaSegura = Math.max(1, Math.round(altura));
  const limite = Math.max(
    1,
    Math.min(DIMENSAO_MAXIMA_IMAGEM, Math.round(dimensaoMaxima)),
  );
  const maiorLado = Math.max(larguraSegura, alturaSegura);

  if (maiorLado <= limite) {
    return { largura: larguraSegura, altura: alturaSegura };
  }

  const escala = limite / maiorLado;

  return {
    largura: Math.max(1, Math.round(larguraSegura * escala)),
    altura: Math.max(1, Math.round(alturaSegura * escala)),
  };
}

/**
 * Sugere uma qualidade inicial com base no peso do arquivo original.
 * Ajuste conservador: mantém 0.82 para arquivos pequenos e cai no máximo até
 * 0.40 para uploads muito pesados.
 */
export function calcularQualidadeInicial(
  bytesOriginais: number,
  alvoBytes = ALVO_BYTES_WEBP,
): number {
  if (!Number.isFinite(bytesOriginais) || bytesOriginais <= 0) {
    return QUALIDADE_WEBP_INICIAL;
  }

  if (bytesOriginais <= alvoBytes) {
    return QUALIDADE_WEBP_INICIAL;
  }

  const proporcao = alvoBytes / bytesOriginais;
  const estimada = Math.sqrt(Math.max(proporcao, 0.01)) * 0.9;

  return limitar(estimada, 0.4, QUALIDADE_WEBP_INICIAL);
}

/** Estima quantos bytes um data URL base64 representa. */
export function estimarBytesDataUrl(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;

  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/** Valida tipo e tamanho do arquivo antes do processamento. */
export function validarArquivoImagem(arquivo: Blob): void {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem (JPG, PNG, HEIC ou WebP).");
  }

  if (arquivo.size <= 0) {
    throw new Error("A imagem selecionada está vazia.");
  }

  if (arquivo.size > TAMANHO_MAXIMO_UPLOAD_BYTES) {
    throw new Error("A imagem original deve ter no máximo 15 MB.");
  }
}

function obterContexto(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("O navegador não disponibilizou o Canvas 2D.");
  }

  contexto.imageSmoothingEnabled = true;
  contexto.imageSmoothingQuality = "high";

  return contexto;
}

async function decodificarFonte(
  origem: Blob | HTMLVideoElement,
): Promise<FonteDecodificada> {
  if (typeof HTMLVideoElement !== "undefined" && origem instanceof HTMLVideoElement) {
    if (!origem.videoWidth || !origem.videoHeight) {
      throw new Error(
        "A câmera ainda não possui um quadro disponível. Aguarde a prévia e tente novamente.",
      );
    }

    return {
      largura: origem.videoWidth,
      altura: origem.videoHeight,
      desenhar: (contexto, largura, altura) => {
        contexto.drawImage(origem, 0, 0, largura, altura);
      },
      liberar: () => undefined,
    };
  }

  if (!(origem instanceof Blob)) {
    throw new TypeError("A origem deve ser um arquivo de imagem ou um vídeo da câmera.");
  }

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(origem);

    return {
      largura: bitmap.width,
      altura: bitmap.height,
      desenhar: (contexto, largura, altura) => {
        contexto.drawImage(bitmap, 0, 0, largura, altura);
      },
      liberar: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(origem);

  try {
    const imagem = await new Promise<HTMLImageElement>((resolve, reject) => {
      const elemento = new Image();
      elemento.onload = () => resolve(elemento);
      elemento.onerror = () =>
        reject(new Error("Não foi possível decodificar a imagem selecionada."));
      elemento.src = url;
    });

    return {
      largura: imagem.naturalWidth,
      altura: imagem.naturalHeight,
      desenhar: (contexto, largura, altura) => {
        contexto.drawImage(imagem, 0, 0, largura, altura);
      },
      liberar: () => URL.revokeObjectURL(url),
    };
  } catch (erro) {
    URL.revokeObjectURL(url);
    throw erro;
  }
}

function canvasParaBlob(
  canvas: HTMLCanvasElement,
  qualidade: number,
  mimeType: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível comprimir a imagem."));
          return;
        }

        if (blob.type !== mimeType) {
          reject(
            new Error(
              "Este navegador não conseguiu gerar uma imagem WebP. Atualize o navegador e tente novamente.",
            ),
          );
          return;
        }

        resolve(blob);
      },
      mimeType,
      qualidade,
    );
  });
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader === "undefined") {
    return Promise.reject(
      new Error("O navegador não suporta a leitura da imagem processada."),
    );
  }

  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      if (typeof leitor.result === "string") {
        resolve(leitor.result);
        return;
      }

      reject(new Error("Não foi possível gerar a prévia da imagem."));
    };
    leitor.onerror = () =>
      reject(new Error("Não foi possível ler a imagem processada."));
    leitor.readAsDataURL(blob);
  });
}

async function renderizarImagem(
  fonte: FonteDecodificada,
  largura: number,
  altura: number,
  qualidade: number,
  mimeType: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = obterContexto(canvas);
  fonte.desenhar(contexto, largura, altura);

  return canvasParaBlob(canvas, qualidade, mimeType);
}

/**
 * Processa uma imagem (upload ou frame de câmera) para WebP ultraleve.
 *
 * Estratégia:
 * 1. limita o maior lado a 800 px;
 * 2. reduz a qualidade em passos de 0.07 até chegar perto do alvo;
 * 3. se ainda estiver pesada, reduz gradualmente as dimensões;
 * 4. devolve Blob + data URL prontos para upload/preview.
 */
export async function processarImagem(
  origem: Blob | HTMLVideoElement,
  opcoes: OpcoesProcessamentoImagem = {},
): Promise<ImagemProcessada> {
  if (typeof document === "undefined") {
    throw new Error(
      "O processamento de imagens só pode ser executado no navegador.",
    );
  }

  const dimensaoMaxima = Math.max(
    1,
    Math.min(
      DIMENSAO_MAXIMA_IMAGEM,
      Math.floor(opcoes.dimensaoMaxima ?? DIMENSAO_MAXIMA_IMAGEM),
    ),
  );
  const alvoBytes = Math.max(1024, Math.floor(opcoes.alvoBytes ?? ALVO_BYTES_WEBP));
  const mimeType = "image/webp";
  const qualidadeMaxima = limitar(opcoes.qualidadeInicial ?? QUALIDADE_WEBP_INICIAL, 0.1, 1);
  const qualidadeMinima = limitar(
    opcoes.qualidadeMinima ?? QUALIDADE_WEBP_MINIMA,
    0.1,
    qualidadeMaxima,
  );
  const bytesOriginais = origem instanceof Blob ? origem.size : 0;
  const fonte = await decodificarFonte(origem);

  try {
    const dimensoesIniciais = calcularDimensoesRedimensionadas(
      fonte.largura,
      fonte.altura,
      dimensaoMaxima,
    );

    let largura = dimensoesIniciais.largura;
    let altura = dimensoesIniciais.altura;
    let qualidade = arredondarQualidade(
      Math.min(
        qualidadeMaxima,
        calcularQualidadeInicial(bytesOriginais, alvoBytes),
      ),
    );
    let blob = await renderizarImagem(
      fonte,
      largura,
      altura,
      qualidade,
      mimeType,
    );

    while (blob.size > alvoBytes && qualidade > qualidadeMinima) {
      qualidade = arredondarQualidade(
        Math.max(qualidadeMinima, qualidade - PASSO_QUALIDADE),
      );
      blob = await renderizarImagem(
        fonte,
        largura,
        altura,
        qualidade,
        mimeType,
      );
    }

    let reducoesExtras = 0;

    while (
      blob.size > alvoBytes &&
      Math.max(largura, altura) > DIMENSAO_MINIMA_REDUCAO &&
      reducoesExtras < MAXIMO_REDUCOES
    ) {
      const fator = limitar(Math.sqrt(alvoBytes / blob.size), 0.55, 0.9);
      const proximaDimensao = Math.max(
        DIMENSAO_MINIMA_REDUCAO,
        Math.floor(Math.max(largura, altura) * fator),
      );
      const proximas = calcularDimensoesRedimensionadas(
        largura,
        altura,
        proximaDimensao,
      );

      if (
        proximas.largura === largura &&
        proximas.altura === altura
      ) {
        break;
      }

      largura = proximas.largura;
      altura = proximas.altura;
      blob = await renderizarImagem(
        fonte,
        largura,
        altura,
        qualidade,
        mimeType,
      );
      reducoesExtras += 1;
    }

    return {
      blob,
      dataUrl: await blobParaDataUrl(blob),
      largura,
      altura,
      bytes: blob.size,
      bytesOriginais,
      mimeType: blob.type,
      qualidade,
      redimensionada:
        largura !== fonte.largura || altura !== fonte.altura,
      reducoesExtras,
    };
  } finally {
    fonte.liberar();
  }
}

/** Processa um arquivo escolhido no input ou capturado pela câmera. */
export async function processarArquivoImagem(
  arquivo: File,
  opcoes: OpcoesProcessamentoImagem = {},
): Promise<ImagemProcessada> {
  validarArquivoImagem(arquivo);

  return processarImagem(arquivo, opcoes);
}

/**
 * Captura o quadro atual de um `<video>` da câmera e devolve a imagem já
 * otimizada. Útil para cadastro de produto pelo celular.
 */
export async function processarCapturaCamera(
  video: HTMLVideoElement,
  opcoes: OpcoesProcessamentoImagem = {},
): Promise<ImagemProcessada> {
  return processarImagem(video, opcoes);
}
