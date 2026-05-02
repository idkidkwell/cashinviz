"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { LANGUAGES, type Language } from "../lib/i18n";

const STORAGE_KEY = "mixer-lang";
const CHANGE_EVENT = "mixer-lang-change";

/* Country code abbreviations instead of flag emojis */
const LANG_CODE_MAP: Record<Language, string> = {
  en: "EN",
  es: "ES",
  zh: "ZH",
  ru: "RU",
  ar: "AR",
  ja: "JA",
};

function getLang(): Language {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && LANGUAGES.some((l) => l.code === stored)) {
    return stored as Language;
  }
  return "en";
}

function setLangValue(lang: Language) {
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: lang }));
}

function subscribe(callback: () => void) {
  const handler = () => callback();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useLanguage(): [Language, (lang: Language) => void] {
  const lang = useSyncExternalStore(subscribe, getLang, () => "en" as Language);

  const setLang = useCallback((newLang: Language) => {
    setLangValue(newLang);
  }, []);

  return [lang, setLang];
}

export function LanguageSwitcher() {
  const [lang, setLang] = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handleClick = () => setOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-surface)] transition-colors"
      >
        <span className="text-[10px] font-mono font-medium tracking-wide text-[var(--text-muted)]">
          {LANG_CODE_MAP[current.code]}
        </span>
        <span>{current.label}</span>
        <svg
          className={`w-2.5 h-2.5 text-[var(--text-faint)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1.5 z-50 min-w-[160px] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-elevation-3 overflow-hidden animate-fade-in">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-[13px] transition-colors ${
                l.code === lang
                  ? "text-[var(--text-primary)] bg-[var(--accent-surface)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-surface)]"
              }`}
            >
              <span className="text-[10px] font-mono font-medium w-5 text-[var(--text-muted)]">
                {LANG_CODE_MAP[l.code]}
              </span>
              <span className="flex-1">{l.native}</span>
              {l.code === lang && (
                <svg className="w-3 h-3 text-[#6366f1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
