/**
 * Serviço fiscal da liquidação de comandas do MatCom.
 *
 * Concentra as regras puras que precisam ser idênticas em qualquer tipo de
 * emissão escolhido no caixa:
 *
 * - Recibo Interno: documento não fiscal, sem envio à SEFAZ, mas com baixa
 *   imediata de estoque, lançamento financeiro, atualização do DRE e
 *   comprovante de conferência de balcão.
 * - NFC-e / NF-e: exige CPF/CNPJ válido, prepara o payload para o serviço
 *   fiscal e mantém os mesmos efeitos operacionais e financeiros.
 *
 * Nenhuma função aqui depende de React, Prisma ou rede — tudo é determinístico
 * para permitir testes unitários e reuso em Server Actions / Route Handlers.
 */

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

export type TipoDocumentoFiscal = "NFCE" | "NFE" | "RECIBO_INTERNO";

export type StatusFiscal =
  | "NAO_APLICAVEL"
  | "PENDENTE_ENVIO"
  | "AUTORIZADO"
  | "REJEITADO";

export type TipoDocumentoInformado = "CPF" | "CNPJ";

export type FormaPagamentoFiscal =
  | "DINHEIRO"
  | "PIX"
  | "DEBITO"
  | "CREDITO"
  | "FATURADO";

export interface ItemLiquidacaoFiscal {
  itemId: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface EmitenteFiscal {
  nome: string;
  cnpj: string;
}

export interface DadosLiquidacaoFiscal {
  orderId: string;
  orderNumber: number;
  tipo: TipoDocumentoFiscal;
  documento?: string | null;
  clienteNome: string;
  formaPagamento: FormaPagamentoFiscal;
  total: number;
  itens: ReadonlyArray<ItemLiquidacaoFiscal>;
  emitidaEm?: Date | string;
  emitente?: EmitenteFiscal;
}

export interface BaixaEstoqueFiscal {
  itemId: string;
  descricao: string;
  unidade: string;
  quantidade: number;
}

export interface LancamentoFinanceiroFiscal {
  tipo: "RECEBIMENTO";
  descricao: string;
  valor: number;
  formaPagamento: FormaPagamentoFiscal;
  orderNumber: number;
}

export interface DestinatarioPayload {
  nome: string;
  documento: string;
  tipoDocumento: TipoDocumentoInformado;
}

export interface ItemPayloadFiscal {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface PayloadFiscal {
  versao: string;
  tipo: "NFCE" | "NFE";
  emitente: EmitenteFiscal;
  destinatario: DestinatarioPayload;
  itens: ItemPayloadFiscal[];
  total: number;
  pagamento: {
    forma: FormaPagamentoFiscal;
    valor: number;
  };
  emitidaEm: string;
  status: "PENDENTE_ENVIO";
}

export interface ResultadoLiquidacaoFiscal {
  ok: boolean;
  erros: string[];
  tipo: TipoDocumentoFiscal;
  documento: string | null;
  tipoDocumento: TipoDocumentoInformado | null;
  statusFiscal: StatusFiscal;
  disparaSefaz: boolean;
  baixasEstoque: BaixaEstoqueFiscal[];
  lancamentosFinanceiros: LancamentoFinanceiroFiscal[];
  dreAtualizado: boolean;
  comprovanteConferencia: boolean;
  payloadFiscal: PayloadFiscal | null;
}

export interface ValidacaoDocumentoFiscal {
  ok: boolean;
  documentoNormalizado: string | null;
  tipoDocumento: TipoDocumentoInformado | null;
  mensagem: string | null;
}

/* -------------------------------------------------------------------------- */
/*                                 Constantes                                 */
/* -------------------------------------------------------------------------- */

export const EMITENTE_FISCAL_PADRAO: EmitenteFiscal = {
  nome: "MatCom Materiais",
  cnpj: "11.222.333/0001-81",
};

export const ROTULOS_DOCUMENTO_FISCAL: Record<TipoDocumentoFiscal, string> = {
  NFCE: "NFC-e (Cupom Fiscal)",
  NFE: "NF-e (Nota Fiscal Cheia / Danfe)",
  RECIBO_INTERNO: "Recibo Interno de Venda (Comprovante Não Fiscal)",
};

export const ROTULOS_STATUS_FISCAL: Record<StatusFiscal, string> = {
  NAO_APLICAVEL: "Sem SEFAZ — documento interno",
  PENDENTE_ENVIO: "Payload preparado — aguardando envio à SEFAZ",
  AUTORIZADO: "Autorizado pela SEFAZ",
  REJEITADO: "Rejeitado pela SEFAZ",
};

/* -------------------------------------------------------------------------- */
/*                          Validação de CPF / CNPJ                           */
/* -------------------------------------------------------------------------- */

/** Remove máscara e qualquer caractere não numérico. */
export function somenteDigitos(documento: string): string {
  return documento.replace(/\D/g, "");
}

/** Valida CPF pelos dígitos verificadores (rejeita sequências repetidas). */
export function validarCpf(documento: string): boolean {
  const digitos = somenteDigitos(documento);

  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) {
    return false;
  }

  const calcularDigito = (base: string, pesoInicial: number): number => {
    const soma = base
      .split("")
      .reduce(
        (total, digito, indice) =>
          total + Number(digito) * (pesoInicial - indice),
        0,
      );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const primeiroDigito = calcularDigito(digitos.slice(0, 9), 10);
  const segundoDigito = calcularDigito(digitos.slice(0, 10), 11);

  return (
    primeiroDigito === Number(digitos[9]) &&
    segundoDigito === Number(digitos[10])
  );
}

/** Valida CNPJ pelos dígitos verificadores (rejeita sequências repetidas). */
export function validarCnpj(documento: string): boolean {
  const digitos = somenteDigitos(documento);

  if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) {
    return false;
  }

  const calcularDigito = (base: string, pesos: number[]): number => {
    const soma = base
      .split("")
      .reduce(
        (total, digito, indice) => total + Number(digito) * pesos[indice],
        0,
      );
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiroDigito = calcularDigito(
    digitos.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const segundoDigito = calcularDigito(
    digitos.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return (
    primeiroDigito === Number(digitos[12]) &&
    segundoDigito === Number(digitos[13])
  );
}

/**
 * Valida o documento exigido pelo tipo de emissão.
 *
 * O Recibo Interno dispensa CPF/CNPJ. NFC-e e NF-e aceitam pessoa física ou
 * jurídica, mas exigem documento com dígitos verificadores válidos.
 */
export function validarDocumentoFiscal(
  tipo: TipoDocumentoFiscal,
  documento: string | null | undefined,
): ValidacaoDocumentoFiscal {
  if (tipo === "RECIBO_INTERNO") {
    return {
      ok: true,
      documentoNormalizado: null,
      tipoDocumento: null,
      mensagem: null,
    };
  }

  const digitos = somenteDigitos(documento ?? "");

  if (!digitos) {
    return {
      ok: false,
      documentoNormalizado: null,
      tipoDocumento: null,
      mensagem:
        "Informe o CPF/CNPJ do destinatário para emitir NFC-e ou NF-e.",
    };
  }

  if (digitos.length === 11) {
    return validarCpf(digitos)
      ? {
          ok: true,
          documentoNormalizado: digitos,
          tipoDocumento: "CPF",
          mensagem: null,
        }
      : {
          ok: false,
          documentoNormalizado: digitos,
          tipoDocumento: "CPF",
          mensagem: "CPF inválido. Revise os dígitos informados.",
        };
  }

  if (digitos.length === 14) {
    return validarCnpj(digitos)
      ? {
          ok: true,
          documentoNormalizado: digitos,
          tipoDocumento: "CNPJ",
          mensagem: null,
        }
      : {
          ok: false,
          documentoNormalizado: digitos,
          tipoDocumento: "CNPJ",
          mensagem: "CNPJ inválido. Revise os dígitos informados.",
        };
  }

  return {
    ok: false,
    documentoNormalizado: digitos,
    tipoDocumento: null,
    mensagem: "CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos.",
  };
}

/** Indica se o tipo escolhido depende de integração com a SEFAZ. */
export function exigeIntegracaoSefaz(tipo: TipoDocumentoFiscal): boolean {
  return tipo !== "RECIBO_INTERNO";
}

/* -------------------------------------------------------------------------- */
/*                         Liquidação da comanda                              */
/* -------------------------------------------------------------------------- */

function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

function normalizarData(valor: Date | string | undefined): string {
  const data = valor ? new Date(valor) : new Date();

  if (Number.isNaN(data.getTime())) {
    return new Date().toISOString();
  }

  return data.toISOString();
}

function montarPayload(
  dados: DadosLiquidacaoFiscal,
  documento: string,
  tipoDocumento: TipoDocumentoInformado,
  total: number,
  itens: ItemPayloadFiscal[],
  emitidaEm: string,
): PayloadFiscal {
  return {
    versao: "1.0",
    tipo: dados.tipo === "NFCE" ? "NFCE" : "NFE",
    emitente: dados.emitente ?? EMITENTE_FISCAL_PADRAO,
    destinatario: {
      nome: dados.clienteNome,
      documento,
      tipoDocumento,
    },
    itens,
    total,
    pagamento: {
      forma: dados.formaPagamento,
      valor: total,
    },
    emitidaEm,
    status: "PENDENTE_ENVIO",
  };
}

/**
 * Liquida a comanda aplicando os efeitos comuns a todos os tipos de emissão:
 *
 * 1. baixa imediata no estoque físico;
 * 2. lançamento financeiro de recebimento;
 * 3. atualização do DRE (receita reconhecida no ato do pagamento);
 * 4. geração de comprovante de conferência quando o documento é interno;
 * 5. preparação do payload fiscal quando NFC-e/NF-e.
 *
 * As validações acontecem antes dos efeitos: em caso de erro nada é baixado
 * nem lançado, evitando liquidação parcial.
 */
export function liquidarComandaFiscal(
  dados: DadosLiquidacaoFiscal,
): ResultadoLiquidacaoFiscal {
  const erros: string[] = [];
  const validacao = validarDocumentoFiscal(dados.tipo, dados.documento);

  if (!validacao.ok && validacao.mensagem) {
    erros.push(validacao.mensagem);
  }

  if (!Number.isFinite(dados.total) || dados.total <= 0) {
    erros.push("Total da comanda inválido para liquidação financeira.");
  }

  if (dados.itens.length === 0) {
    erros.push("A comanda não possui itens para baixa de estoque.");
  }

  const itensPayload: ItemPayloadFiscal[] = [];

  for (const item of dados.itens) {
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) {
      erros.push(
        `Item "${item.descricao}" possui quantidade inválida para baixa de estoque.`,
      );
      continue;
    }

    itensPayload.push({
      codigo: item.itemId,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: arredondar(item.valorUnitario),
      valorTotal: arredondar(item.valorTotal),
    });
  }

  const tipoDocumento = validacao.tipoDocumento;
  const documento = validacao.documentoNormalizado;
  const emitidaEm = normalizarData(dados.emitidaEm);
  const total = arredondar(dados.total);

  if (erros.length > 0) {
    return {
      ok: false,
      erros,
      tipo: dados.tipo,
      documento,
      tipoDocumento,
      statusFiscal: exigeIntegracaoSefaz(dados.tipo)
        ? "REJEITADO"
        : "NAO_APLICAVEL",
      disparaSefaz: false,
      baixasEstoque: [],
      lancamentosFinanceiros: [],
      dreAtualizado: false,
      comprovanteConferencia: false,
      payloadFiscal: null,
    };
  }

  const baixasEstoque: BaixaEstoqueFiscal[] = dados.itens.map((item) => ({
    itemId: item.itemId,
    descricao: item.descricao,
    unidade: item.unidade,
    quantidade: item.quantidade,
  }));

  const lancamentosFinanceiros: LancamentoFinanceiroFiscal[] = [
    {
      tipo: "RECEBIMENTO",
      descricao: `Recebimento da comanda #${dados.orderNumber}`,
      valor: total,
      formaPagamento: dados.formaPagamento,
      orderNumber: dados.orderNumber,
    },
  ];

  const disparaSefaz = exigeIntegracaoSefaz(dados.tipo);

  return {
    ok: true,
    erros: [],
    tipo: dados.tipo,
    documento,
    tipoDocumento,
    statusFiscal: disparaSefaz ? "PENDENTE_ENVIO" : "NAO_APLICAVEL",
    disparaSefaz,
    baixasEstoque,
    lancamentosFinanceiros,
    dreAtualizado: true,
    comprovanteConferencia: !disparaSefaz,
    payloadFiscal:
      disparaSefaz && documento && tipoDocumento
        ? montarPayload(
            dados,
            documento,
            tipoDocumento,
            total,
            itensPayload,
            emitidaEm,
          )
        : null,
  };
}
