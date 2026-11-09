/**
 * Catálogo visual demonstrativo dos produtos.
 *
 * Centraliza o vínculo entre descrição comercial e thumbnail otimizado para
 * que PDV, Compras Inteligentes e Expedição exibam a mesma imagem.
 */

export const IMAGEM_FALLBACK_PRODUTO = "/products/produto.svg";

export interface ProdutoComImagem {
  imageUrl?: string | null;
  imagemUrl?: string | null;
  description?: string | null;
  descricao?: string | null;
  name?: string | null;
}

interface RegraImagemProduto {
  termos: readonly string[];
  imagem: string;
}

const REGRAS_IMAGEM: readonly RegraImagemProduto[] = [
  {
    termos: ["cimento", "argamassa", "cal hidratada", "rejunte"],
    imagem: "/products/cimento.svg",
  },
  {
    termos: ["areia"],
    imagem: "/products/areia.svg",
  },
  {
    termos: ["bloco", "tijolo", "concreto"],
    imagem: "/products/bloco.svg",
  },
  {
    termos: [
      "tubo",
      "pvc",
      "joelho",
      "tê",
      "registro",
      "caixa d'água",
      "caixa d’água",
      "adesivo",
    ],
    imagem: "/products/tubo.svg",
  },
  {
    termos: [
      "vergalhão",
      "tela soldada",
      "barra chata",
      "aço",
      "aco",
      "ferro",
    ],
    imagem: "/products/aco.svg",
  },
  {
    termos: ["tinta"],
    imagem: "/products/tinta.svg",
  },
  {
    termos: ["porcelanato", "piso", "revestimento"],
    imagem: "/products/porcelanato.svg",
  },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Retorna o thumbnail correspondente à descrição do produto. */
export function imagemDoProduto(descricao: string): string {
  const texto = normalizar(descricao);
  const regra = REGRAS_IMAGEM.find((item) =>
    item.termos.some((termo) => texto.includes(normalizar(termo))),
  );

  return regra?.imagem ?? IMAGEM_FALLBACK_PRODUTO;
}

function urlImagemSegura(valor: string | null | undefined): string | null {
  const url = valor?.trim();

  if (!url) {
    return null;
  }

  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\") &&
    !/[\u0000-\u001f]/.test(url)
  ) {
    return url;
  }

  if (/^blob:https?:\/\/\S+$/i.test(url)) {
    return url;
  }

  if (
    /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,[a-z\d+/]+=*$/i.test(url)
  ) {
    return url;
  }

  try {
    const origem = new URL(url);
    return origem.protocol === "https:" || origem.protocol === "http:"
      ? url
      : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a imagem independente do nome usado pelo Prisma ou pelas telas.
 * URLs inválidas usam o thumbnail local correspondente à descrição do produto.
 */
export function obterUrlImagemProduto(produto: ProdutoComImagem): string {
  const url =
    urlImagemSegura(produto.imageUrl) ?? urlImagemSegura(produto.imagemUrl);

  if (url) {
    return url;
  }

  return imagemDoProduto(
    produto.description ?? produto.descricao ?? produto.name ?? "",
  );
}
