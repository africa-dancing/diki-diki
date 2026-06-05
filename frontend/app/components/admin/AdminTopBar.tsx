"use client";
import LogoDikiDiki from "../LogoDikiDiki";
import TranslateWidget from "../TranslateWidget";
import { useAdminAuth } from "./AdminAuthContext";

export function AdminTopBar() {
  const { logout } = useAdminAuth();
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: 56,
        background: "rgba(6,0,0,0.97)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "0 14px 0 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0, paddingLeft: 0 }}>
        <LogoDikiDiki width={130} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <TranslateWidget />
        <button
          onClick={logout}
          style={{
            background: "rgba(255,68,68,0.1)",
            border: "1px solid rgba(255,68,68,0.4)",
            borderRadius: 8,
            padding: "7px 14px",
            color: "#FF4444",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          Deconnexion
        </button>
      </div>
    </nav>
  );
}
