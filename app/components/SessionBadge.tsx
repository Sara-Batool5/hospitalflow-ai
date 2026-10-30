"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Me = { email: string | null; mode: "user" | "demo" };

export default function SessionBadge() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe({ email: d.email, mode: d.mode }))
      .catch(() => setMe(null));
  }, [pathname]);

  if (!pathname?.startsWith("/dashboard") || !me) return null;

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/signin";
  }

  const pill: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    zIndex: 60,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 8px 8px 14px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid #dbe5ea",
    boxShadow: "0 6px 20px rgba(10,46,64,.14)",
    fontSize: 13,
    color: "#0a2e40",
    maxWidth: "calc(100vw - 32px)",
  };

  const button: React.CSSProperties = {
    border: "none",
    borderRadius: 999,
    padding: "7px 12px",
    background: "#005b58",
    color: "#fff",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div style={pill}>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {me.mode === "user" ? (
          <>
            Your workspace · <strong>{me.email}</strong>
          </>
        ) : (
          <>
            <strong>Demo mode</strong> · shared sample data
          </>
        )}
      </span>
      {me.mode === "user" ? (
        <button style={button} onClick={signOut}>
          Sign out
        </button>
      ) : (
        <a href="/signin" style={{ ...button, textDecoration: "none" }}>
          Sign in
        </a>
      )}
    </div>
  );
}
