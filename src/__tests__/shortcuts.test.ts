import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  SHORTCUT_ROUTES,
  isTypingTarget,
} from "@/lib/shortcuts";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

function pressKey(
  init: KeyboardEventInit,
  target: EventTarget = window,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });

  act(() => {
    target.dispatchEvent(event);
  });

  return event;
}

beforeEach(() => {
  mockPush.mockClear();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useKeyboardShortcuts — navegação", () => {
  it.each([
    ["F2", "/vendas/pdv"],
    ["F3", "/caixa/fila"],
    ["F4", "/vendas/clientes"],
    ["F6", "/vendas/produtos"],
    ["F8", "/gerencia/aprovacoes"],
    ["F10", "/financeiro/contas"],
  ])("navega com %s para %s e cancela o evento", (key, href) => {
    renderHook(() => useKeyboardShortcuts());

    const event = pressKey({ key });

    expect(event.defaultPrevented).toBe(true);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(href);
  });

  it("mantém o mapa de rotas alinhado às teclas oficiais", () => {
    expect(SHORTCUT_ROUTES).toEqual({
      F2: "/vendas/pdv",
      F3: "/caixa/fila",
      F4: "/vendas/clientes",
      F6: "/vendas/produtos",
      F8: "/gerencia/aprovacoes",
      F10: "/financeiro/contas",
    });
  });
});

describe("useKeyboardShortcuts — guia de atalhos", () => {
  it("F1 abre o guia e cancela o comportamento padrão", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    const event = pressKey({ key: "F1" });

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.isHelpOpen).toBe(true);
  });

  it("Ctrl+K alterna a visibilidade do guia", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    const first = pressKey({ key: "k", ctrlKey: true });
    expect(first.defaultPrevented).toBe(true);
    expect(result.current.isHelpOpen).toBe(true);

    const second = pressKey({ key: "K", ctrlKey: true });
    expect(second.defaultPrevented).toBe(true);
    expect(result.current.isHelpOpen).toBe(false);
  });

  it("Cmd+K também alterna o guia (compatibilidade macOS)", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    pressKey({ key: "k", metaKey: true });

    expect(result.current.isHelpOpen).toBe(true);
  });

  it("Escape fecha o guia quando ele está aberto", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    pressKey({ key: "F1" });
    expect(result.current.isHelpOpen).toBe(true);

    const escape = pressKey({ key: "Escape" });

    expect(escape.defaultPrevented).toBe(true);
    expect(result.current.isHelpOpen).toBe(false);
  });
});

describe("useKeyboardShortcuts — trava de segurança em campos", () => {
  it.each(["input", "textarea", "select"] as const)(
    "não navega nem cancela F2 dentro de %s",
    (tagName) => {
      const field = document.createElement(tagName);
      document.body.appendChild(field);
      field.focus();

      renderHook(() => useKeyboardShortcuts());

      const event = pressKey({ key: "F2" }, field);

      expect(event.defaultPrevented).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();
    },
  );

  it("identifica elemento contentEditable como campo de digitação", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    document.body.appendChild(editable);

    expect(isTypingTarget(editable)).toBe(true);
  });

  it("não navega com F2 quando o foco está em contentEditable", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    document.body.appendChild(editable);

    renderHook(() => useKeyboardShortcuts());

    const event = pressKey({ key: "F2" }, editable);

    expect(event.defaultPrevented).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("permite Ctrl+K dentro de um campo de digitação", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useKeyboardShortcuts());

    const event = pressKey({ key: "k", ctrlKey: true }, input);

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.isHelpOpen).toBe(true);
  });

  it("permite Escape dentro de um campo de digitação para fechar o guia", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useKeyboardShortcuts());

    pressKey({ key: "F1" });
    const escape = pressKey({ key: "Escape" }, input);

    expect(escape.defaultPrevented).toBe(true);
    expect(result.current.isHelpOpen).toBe(false);
  });
});

describe("useKeyboardShortcuts — teclas reservadas", () => {
  it.each(["F5", "F7", "F9"])(
    "captura %s para impedir a ação padrão do navegador, sem navegar",
    (key) => {
      renderHook(() => useKeyboardShortcuts());

      const event = pressKey({ key });

      expect(event.defaultPrevented).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
    },
  );

  it("captura F5 mesmo dentro de um campo de digitação", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts());

    const event = pressKey({ key: "F5" }, input);

    expect(event.defaultPrevented).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("não dispara atalho quando a opção enabled está desligada", () => {
    const { result } = renderHook(() =>
      useKeyboardShortcuts({ enabled: false }),
    );

    const navigation = pressKey({ key: "F3" });
    const help = pressKey({ key: "F1" });
    const reserved = pressKey({ key: "F5" });

    expect(navigation.defaultPrevented).toBe(false);
    expect(help.defaultPrevented).toBe(false);
    expect(reserved.defaultPrevented).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.isHelpOpen).toBe(false);
  });
});