"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server log is the source of detail; only log Next's safe correlation ID here.
    console.error("PhoneMail encountered a global application error.", {
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 440,
            boxSizing: "border-box",
            padding: 32,
            border: "1px solid #e2e8f0",
            borderRadius: 20,
            background: "#fff",
            boxShadow: "0 12px 40px rgb(15 23 42 / 8%)",
          }}
        >
          <p style={{ margin: "0 0 28px", fontSize: 18, fontWeight: 700 }}>
            PhoneMail
          </p>
          <div
            aria-hidden="true"
            style={{
              display: "grid",
              width: 48,
              height: 48,
              placeItems: "center",
              borderRadius: 14,
              background: "#fff1f2",
              color: "#be123c",
              fontSize: 24,
            }}
          >
            !
          </div>
          <h1 style={{ margin: "20px 0 8px", fontSize: 24, letterSpacing: "-0.03em" }}>
            We hit a server error
          </h1>
          <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
            Your mail is safe. Try loading the page again. If this keeps happening,
            share the error reference with support.
          </p>
          {error.digest ? (
            <p style={{ margin: "16px 0 0", color: "#64748b", fontSize: 12 }}>
              Error reference: <code>{error.digest}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              marginTop: 24,
              padding: "0 18px",
              border: 0,
              borderRadius: 999,
              background: "#0f172a",
              color: "white",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
