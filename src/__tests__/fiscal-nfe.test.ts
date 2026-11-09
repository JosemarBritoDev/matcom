import { describe, expect, it } from "@jest/globals";

import {
  featureFlagsParaModulos,
  FEATURE_FLAGS_PADRAO,
  verificarAcessoModulo,
} from "@/lib/permissions";
import {
  criarArquivoZip,
  filtrarNotasDoPeriodo,
  gerarXmlNotaFiscal,
  type NotaFiscalNfeMock,
} from "@/lib/fiscal-nfe";

const DOCUMENTO_FISCAL: NotaFiscalNfeMock = {
  id: "nfe-1",
  tenantId: "tenant-1",
  numero: "1051",
  serie: "1",
  cliente: "Construtora A&B",
  valor: 984.8,
  status: "TRANSMITIDA",
  emitidaEm: "2026-11-09T10:15:00.000Z",
  chave: "35261111222333000181550010000010511234567890",
  tipo: "NFE",
};

describe("Permissão do módulo NFe", () => {
  it("libera a emissão quando a feature flag emissaoFiscalSefaz está ativa", () => {
    const config = featureFlagsParaModulos({
      ...FEATURE_FLAGS_PADRAO,
      emissaoFiscalSefaz: true,
    });

    expect(verificarAcessoModulo(config, "nfe").permitido).toBe(true);
  });

  it("bloqueia NFe e retorna orientação de upgrade quando a flag está desativada", () => {
    const config = featureFlagsParaModulos({
      ...FEATURE_FLAGS_PADRAO,
      emissaoFiscalSefaz: false,
    });
    const acesso = verificarAcessoModulo(config, "nfe");

    expect(acesso.permitido).toBe(false);
    expect(acesso.motivo).toMatch(/emissaoFiscalSefaz/i);
  });
});

describe("Lote fiscal mensal isolado por tenant", () => {
  it("seleciona somente documentos do tenant e competência informados", () => {
    const outrasNotas: NotaFiscalNfeMock[] = [
      DOCUMENTO_FISCAL,
      {
        ...DOCUMENTO_FISCAL,
        id: "nfe-other-tenant",
        tenantId: "tenant-2",
      },
      {
        ...DOCUMENTO_FISCAL,
        id: "nfe-other-month",
        emitidaEm: "2026-10-31T23:59:00.000Z",
      },
    ];

    expect(
      filtrarNotasDoPeriodo(outrasNotas, "tenant-1", "2026-11").map(
        (nota) => nota.id,
      ),
    ).toEqual(["nfe-1"]);
  });

  it("rejeita competência inválida e tenant ausente", () => {
    expect(() =>
      filtrarNotasDoPeriodo([DOCUMENTO_FISCAL], "tenant-1", "2026-13"),
    ).toThrow(/AAAA-MM/i);
    expect(() =>
      filtrarNotasDoPeriodo([DOCUMENTO_FISCAL], " ", "2026-11"),
    ).toThrow(/tenant/i);
  });

  it("escapa valores do XML antes de gerar o documento", () => {
    expect(gerarXmlNotaFiscal(DOCUMENTO_FISCAL)).toContain(
      "<cliente>Construtora A&amp;B</cliente>",
    );
  });

  it("gera um ZIP válido com diretório central e conteúdo XML", () => {
    const zip = criarArquivoZip([
      { nome: "NFe-1051.xml", conteudo: gerarXmlNotaFiscal(DOCUMENTO_FISCAL) },
    ]);
    const view = new DataView(zip);
    const textoZip = new TextDecoder().decode(zip);

    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.byteLength - 22, true)).toBe(0x06054b50);
    expect(textoZip).toContain("NFe-1051.xml");
    expect(textoZip).toContain("Construtora A&amp;B");
  });
});
