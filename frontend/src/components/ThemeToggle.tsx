"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mixer-theme") as
      | "dark"
      | "light"
      | null;
    const initial = stored ?? "dark";
    setTheme(initial);
    if (initial === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("mixer-theme", next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <>
      <button
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="theme-toggle-track"
        style={{
          backgroundColor: isDark ? "#1e293b" : "#e0e7ff",
          boxShadow: isDark
            ? "0 0 8px rgba(139,92,246,0.3), inset 0 1px 2px rgba(0,0,0,0.3)"
            : "0 0 8px rgba(251,191,36,0.3), inset 0 1px 2px rgba(0,0,0,0.05)",
          width: 40,
          height: 20,
          borderRadius: 10,
          position: "relative",
          cursor: "pointer",
          border: "none",
          padding: 0,
          transition:
            "background-color 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            transition:
              "transform 300ms cubic-bezier(0.34,1.56,0.64,1)",
            transform: isDark ? "translateX(2px)" : "translateX(22px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Sun / Moon icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transition:
                "transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 300ms ease",
              transform: isDark ? "rotate(0deg)" : "rotate(360deg)",
            }}
          >
            {isDark ? (
              /* Moon (crescent) */
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
                fill="#c4b5fd"
                stroke="#a78bfa"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              /* Sun (circle with rays) */
              <g>
                <circle cx="12" cy="12" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
                <line x1="12" y1="1" x2="12" y2="4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="20" x2="12" y2="23" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="1" y1="12" x2="4" y2="12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="20" y1="12" x2="23" y2="12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            )}
          </svg>
        </span>
      </button>
    </>
  );
}
