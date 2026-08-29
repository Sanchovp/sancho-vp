import React, { useEffect, useState } from "react";
import { Building2, LogOut, Plus } from "lucide-react";
import { supabase } from "./lib/supabaseClient";

export default function CompanySelector({ profile, onSelect, onSignOut }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  async function createCompany(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    const { data: company, error } = await supabase
      .from("companies")
      .insert({ name: newName.trim() })
      .select()
      .single();
    if (error) {
      setCreateError(error.message);
      setCreating(false);
      return;
    }
    // Vincula quem criou como admin dessa empresa
    await supabase.from("company_members").insert({ user_id: profile.id, company_id: company.id, role: "admin" });
    setCreating(false);
    setShowForm(false);
    setNewName("");
    await loadCompanies();
    onSelect(company);
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

        {!loading && !error && companies.length === 0 && !profile?.is_super_admin && (
          <div style={{ fontSize: "13px", color: "rgba(237,234,227,0.5)" }}>
            Nenhuma empresa vinculada à sua conta ainda. Peça a um administrador para te adicionar.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: profile?.is_super_admin ? "14px" : 0 }}>
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

        {profile?.is_super_admin && (
          <>
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(201,162,39,0.14)",
                  border: "1px solid rgba(201,162,39,0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12.5px",
                  color: "#C9A227",
                  cursor: "pointer",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <Plus size={14} /> Nova empresa
              </button>
            ) : (
              <form onSubmit={createCompany} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Nome da empresa (ex: Educon FGV)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    background: "rgba(237,234,227,0.06)",
                    border: "1px solid rgba(237,234,227,0.12)",
                    borderRadius: "8px",
                    color: "#EDEAE3",
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                {createError && <div style={{ fontSize: "12px", color: "#E07856" }}>{createError}</div>}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="submit"
                    disabled={creating}
                    style={{
                      flex: 1,
                      background: "#C9A227",
                      border: "none",
                      borderRadius: "8px",
                      padding: "9px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#161D27",
                      cursor: creating ? "not-allowed" : "pointer",
                      opacity: creating ? 0.6 : 1,
                    }}
                  >
                    {creating ? "Criando…" : "Criar e entrar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setNewName(""); setCreateError(""); }}
                    style={{
                      background: "none",
                      border: "1px solid rgba(237,234,227,0.15)",
                      borderRadius: "8px",
                      padding: "9px 14px",
                      fontSize: "12.5px",
                      color: "rgba(237,234,227,0.7)",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
