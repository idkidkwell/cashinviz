"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: React.ReactNode;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  onSelect: (id: string) => void;
}

export function CommandPalette({ isOpen, onClose, items, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.section.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const grouped: { section: string; items: typeof filtered }[] = [];
  for (const item of filtered) {
    const existing = grouped.find((g) => g.section === item.section);
    if (existing) {
      existing.items.push(item);
    } else {
      grouped.push({ section: item.section, items: [item] });
    }
  }

  const flatFiltered = grouped.flatMap((g) => g.items);

  const select = useCallback(
    (id: string) => {
      onSelect(id);
      onClose();
      setQuery("");
      setActiveIndex(0);
    },
    [onSelect, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatFiltered[activeIndex]) {
            select(flatFiltered[activeIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          setQuery("");
          break;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, activeIndex, flatFiltered, select, onClose]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => { onClose(); setQuery(""); }}
      />

      <div className="relative w-full max-w-[520px] mx-4 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-elevation-3 overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--border-subtle)]">
          <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features..."
            className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[10px] text-[var(--text-muted)] font-mono">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-1.5 scrollbar-none">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-[var(--text-muted)]">No results found</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">Try a different search term</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.section}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-medium text-[var(--text-faint)] uppercase tracking-[0.08em]">
                  {group.section}
                </p>
                {group.items.map((item) => {
                  flatIndex++;
                  const isActive = flatIndex === activeIndex;
                  const idx = flatIndex;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onClick={() => select(item.id)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-[var(--accent-surface)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--accent-surface)]"
                      }`}
                    >
                      <span className={`shrink-0 ${isActive ? "opacity-100" : "opacity-40"}`}>
                        {item.icon}
                      </span>
                      <span className="text-[13px] flex-1">{item.label}</span>
                      {isActive && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Enter to select
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 px-4 h-9 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-faint)]">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg)] border border-[var(--border-subtle)] font-mono">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg)] border border-[var(--border-subtle)] font-mono">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg)] border border-[var(--border-subtle)] font-mono">esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
