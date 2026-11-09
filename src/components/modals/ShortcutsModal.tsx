"use client";

import { Fragment, useEffect, useRef } from "react";
import { ArrowUpRight, Keyboard, ShieldCheck, Sparkles, X } from "lucide-react";

import {
  getShortcutKeys,
  getShortcutsByGroup,
  isShortcutEnabled,
  type ShortcutGroup,
} from "@/lib/shortcuts";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS: Array<{
  group: ShortcutGroup;
  title: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    group: "Sistema",
    title: "Sistema",
    description: "Ações globais disponíveis em qualquer tela.",
    icon: Sparkles,
  },
  {
    group: "Navegação",
    title: "Navegação rápida",
    description: "Salte entre os módulos operacionais da loja.",
    icon: ShieldCheck,
  },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fechar guia de atalhos"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-950/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        aria-describedby="shortcuts-description"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/30 sm:rounded-3xl dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/60"
      >
        <div className="relative overflow-hidden border-b border-zinc-200 px-5 py-5 sm:px-6 dark:border-zinc-800">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent blur-2xl"
            aria-hidden
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-600/25">
                <Keyboard className="h-5 w-5" aria-hidden />
              </span>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                  MatCom SaaS
                </p>
                <h2
                  id="shortcuts-title"
                  className="mt-0.5 text-lg font-bold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-50"
                >
                  Guia de Atalhos
                </h2>
                <p
                  id="shortcuts-description"
                  className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400"
                >
                  Navegue pelo sistema sem tirar as mãos do teclado. As teclas
                  F1–F10 estão mapeadas abaixo.
                </p>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar guia de atalhos"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <div className="space-y-5">
            {SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              const shortcuts = getShortcutsByGroup(section.group);

              return (
                <section key={section.group} aria-labelledby={`shortcuts-${section.group}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <SectionIcon
                      className="h-4 w-4 text-violet-600 dark:text-violet-400"
                      aria-hidden
                    />
                    <h3
                      id={`shortcuts-${section.group}`}
                      className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200"
                    >
                      {section.title}
                    </h3>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {section.description}
                    </span>
                  </div>

                  <ul className="space-y-1.5">
                    {shortcuts.map((shortcut) => {
                      const enabled = isShortcutEnabled(shortcut);

                      return (
                        <li
                          key={shortcut.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                            enabled
                              ? "border-zinc-200 bg-zinc-50/80 hover:border-violet-300 hover:bg-violet-50/60 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
                              : "border-dashed border-zinc-200 bg-transparent opacity-55 dark:border-zinc-800"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex shrink-0 items-center gap-1">
                              {getShortcutKeys(shortcut).map((key, index) => (
                                <Fragment key={key}>
                                  {index > 0 && (
                                    <span
                                      className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500"
                                      aria-hidden
                                    >
                                      +
                                    </span>
                                  )}
                                  <kbd
                                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 font-mono text-xs font-bold shadow-sm ${
                                      enabled
                                        ? "border-zinc-300 bg-white text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                        : "border-dashed border-zinc-300 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600"
                                    }`}
                                  >
                                    {key}
                                  </kbd>
                                </Fragment>
                              ))}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                {shortcut.label}
                              </p>
                              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                {shortcut.description}
                              </p>
                            </div>
                          </div>

                          {shortcut.href && enabled ? (
                            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700 sm:inline-flex dark:bg-violet-950/60 dark:text-violet-300">
                              Ir
                              <ArrowUpRight className="h-3 w-3" aria-hidden />
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>Trava de segurança:</strong> enquanto você digita em um
            campo, os atalhos de navegação ficam desativados. Escape e
            combinações com Ctrl continuam funcionando.
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50/80 px-5 py-3 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Criado por BCTech | Josemar Brito | Whatsapp 11972646617
          </p>
        </div>
      </div>
    </div>
  );
}