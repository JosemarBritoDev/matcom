import { describe, expect, it } from "@jest/globals";

import { calcularDimensoesRedimensionadas } from "@/lib/image-processor";

describe("Limite de dimensões para thumbnails", () => {
  it("nunca permite que a dimensão máxima configurada ultrapasse 800 px", () => {
    expect(calcularDimensoesRedimensionadas(2400, 1200, 1200)).toEqual({
      largura: 800,
      altura: 400,
    });
  });
});
