import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { Footer } from "@/components/layout/Footer";

describe("Footer — assinatura obrigatória", () => {
  it("renderiza a assinatura BCTech exigida pela regra de negócio", () => {
    render(<Footer />);

    expect(
      screen.getByText(
        "Criado por BCTech | Josemar Brito | Whatsapp 11972646617",
      ),
    ).toBeInTheDocument();
  });
});