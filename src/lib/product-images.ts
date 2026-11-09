/**
 * Catálogo visual demonstrativo dos produtos.
 *
 * Centraliza o vínculo entre descrição comercial e thumbnail otimizado para
 * que PDV, Compras Inteligentes e Expedição exibam a mesma imagem.
 */

export const IMAGEM_FALLBACK_PRODUTO = "/products/produto.svg";

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
