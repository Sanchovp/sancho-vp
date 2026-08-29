import React, { useEffect, useState } from "react";
import { Building2, LogOut } from "lucide-react";
import { supabase } from "./lib/supabaseClient";

export default function CompanySelector({ profile, onSelect, onSignOut }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    setLoading(true);
    setError("");
    // RLS já filtra: super admin vê todas, membro comum vê só as suas.
    const { data, error } = await supabase.from("companies").select("id, name").order("name");
    if (error) setError(error.message);
    setCompanies(data || []);
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1B2430",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        color: "#EDEAE3",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#161D27",
          border: "1px solid rgba(237,234,227,0.08)",
          borderRadius: "12px",
          padding: "28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "18px", fontWeight: 600 }}>
              Selecione a empresa
            </div>
            {profile?.is_super_admin && (
              <div style={{ fontSize: "11px", color: "#C9A227", marginTop: "2px" }}>Acesso de administrador</div>
            )}
          </div>
          <button
            onClick={onSignOut}
            title="Sair"
            style={{
              background: "none",
              border: "none",
              color: "rgba(237,234,227,0.5)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
            }}
          >
            <LogOut size={16} />
          </button>
        </div>

        {loading && <div style={{ fontSize: "13px", color: "rgba(237,234,227,0.5)" }}>Carregando empresas…</div>}
        {error && <div style={{ fontSize: "13px", color: "#E07856" }}>{error}</div>}

        {!loading && !error && companies.length === 0 && (
          <div style={{ fontSize: "13px", color: "rgba(237,234,227,0.5)" }}>
            Nenhuma empresa vinculada à sua conta ainda. Peça a um administrador para te adicionar.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(237,234,227,0.1)",
                background: "rgba(237,234,227,0.04)",
                color: "#EDEAE3",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "13.5px",
                fontFamily: "inherit",
              }}
            >
              <Building2 size={16} color="#C9A227" />
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
