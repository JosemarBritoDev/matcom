"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  SHORTCUTS,
  isShortcutEnabled,
  isTypingTarget,
  type ShortcutDefinition,
} from "@/lib/shortcuts";

export interface UseKeyboardShortcutsOptions {
  /** Permite desativar globalmente (ex.: durante um fluxo crítico). */
  enabled?: boolean;
}

export interface KeyboardShortcutsController {
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

const COMMAND_SHORTCUT = SHORTCUTS.find(
  (shortcut) => shortcut.action === "toggle-help",
);

function hasOnlyAllowedModifiers(event: KeyboardEvent): boolean {
  return !event.altKey && !event.shiftKey;
}

function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutDefinition,
): boolean {
  if (shortcut.ctrl) {
    return (
      hasOnlyAllowedModifiers(event) &&
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === shortcut.key.toLowerCase()
    );
  }

  return (
    hasOnlyAllowedModifiers(event) &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.key.toUpperCase() === shortcut.key.toUpperCase()
  );
}

/**
 * Hook global de teclas de atalho do MatCom.
 *
 * - Captura F1, F2, F3, F4, F6, F8, F10 e Ctrl+K (ou Cmd+K).
 * - Aplica `preventDefault()` nas teclas mapeadas.
 * - Bloqueia atalhos de navegação quando o foco está em INPUT/TEXTAREA/SELECT
 *   ou em elemento contentEditable.
 * - Mantém Escape e combinações com Ctrl funcionando mesmo durante a digitação.
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {},
): KeyboardShortcutsController {
  const { enabled = true } = options;
  const router = useRouter();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);
  const toggleHelp = useCallback(
    () => setIsHelpOpen((current) => !current),
    [],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.repeat) {
        return;
      }

      // Escape sempre funciona e fecha o guia quando ele está aberto.
      if (event.key === "Escape") {
        if (isHelpOpen) {
          event.preventDefault();
          closeHelp();
        }
        return;
      }

      // Ctrl+K / Cmd+K funciona inclusive dentro de campos de digitação.
      if (COMMAND_SHORTCUT && matchesShortcut(event, COMMAND_SHORTCUT)) {
        event.preventDefault();
        toggleHelp();
        return;
      }

      // Trava de segurança: identifica o atalho antes de avaliar o campo.
      const shortcut = SHORTCUTS.find((candidate) =>
        matchesShortcut(event, candidate),
      );

      if (!shortcut) {
        return;
      }

      // Teclas reservadas (F5/F7/F9) bloqueiam o comportamento padrão do
      // navegador, mas não executam navegação.
      if (!isShortcutEnabled(shortcut)) {
        event.preventDefault();
        return;
      }

      // Trava de segurança: não dispara navegação enquanto o usuário digita.
      if (isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (shortcut.action === "open-help") {
        openHelp();
        return;
      }

      if (shortcut.action === "toggle-help") {
        toggleHelp();
        return;
      }

      if (shortcut.href) {
        closeHelp();
        router.push(shortcut.href);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enabled,
    isHelpOpen,
    closeHelp,
    openHelp,
    toggleHelp,
    router,
  ]);

  return { isHelpOpen, openHelp, closeHelp, toggleHelp };
}