import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { attemptLogin, ensureDefaultPin } from "../utils/pin.ts";
import type { SowWhatDB } from "../db/database.ts";

export interface PinProps {
  db?: SowWhatDB;
}

const PIN_LENGTH = 4;
const BUTTONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function Pin({ db }: PinProps = {}) {
  const navigate = useNavigate();
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const statusRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure default PIN exists on mount
  useEffect(() => {
    let cancelled = false;
    ensureDefaultPin(db).then(() => {
      if (!cancelled) {
        setLoading(false);
        // Auto-focus for keyboard input
        containerRef.current?.focus();
      }
    });
    return () => { cancelled = true; };
  }, [db]);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (loading) return;
      setError("");
      const next = digits + digit;
      setDigits(next);

      if (next.length === PIN_LENGTH) {
        const ok = await attemptLogin(next, db);
        if (ok) {
          navigate("/", { replace: true });
        } else {
          setError("Incorrect PIN");
          setDigits("");
        }
      }
    },
    [digits, loading, db, navigate]
  );

  const handleDelete = useCallback(() => {
    setError("");
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        void handleDigit(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleDelete();
      }
    },
    [handleDigit, handleDelete]
  );

  if (loading) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{
        padding: "16px",
        maxWidth: "360px",
        margin: "0 auto",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        justifyContent: "center",
        outline: "none",
      }}
      onKeyDown={handleKeyDown}
    >
      <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", color: "var(--color-text)" }}>
        Enter PIN
      </h1>
      <p style={{ margin: "0 0 24px 0", color: "var(--color-text-secondary)", fontSize: "14px" }}>
        Unlock Sow What
      </p>

      {/* PIN dots */}
      <div
        style={{ display: "flex", gap: "12px", marginBottom: "16px" }}
        role="status"
        aria-label={`${digits.length} of ${PIN_LENGTH} digits entered`}
        ref={statusRef}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: `2px solid var(--color-primary)`,
              backgroundColor:
                i < digits.length ? "var(--color-primary)" : "transparent",
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Error message */}
      <div
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: "24px",
          marginBottom: "16px",
          color: "var(--color-danger)",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        {error}
      </div>

      {/* Numeric pad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          width: "100%",
          maxWidth: "280px",
        }}
        role="group"
        aria-label="PIN pad"
      >
        {BUTTONS.map((btn, i) => {
          if (btn === "") {
            return <div key={i} aria-hidden="true" />;
          }
          if (btn === "del") {
            return (
              <button
                key={i}
                onClick={handleDelete}
                aria-label="Delete last digit"
                style={{
                  minHeight: "56px",
                  minWidth: "44px",
                  fontSize: "18px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  backgroundColor: "var(--color-bg-muted)",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                &larr;
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => { void handleDigit(btn); }}
              aria-label={`Digit ${btn}`}
              style={{
                minHeight: "56px",
                minWidth: "44px",
                fontSize: "22px",
                fontWeight: "bold",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                cursor: "pointer",
              }}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
