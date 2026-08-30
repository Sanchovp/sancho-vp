import React, { useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "./lib/supabaseClient";

export default function SetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      if (error.message?.toLowerCase().includes("auth session missing") || error.message?.toLowerCase().includes("session")) {
        setExpired(true);
      } else {
        setError(error.message);
      }
      return;
    }
    onDone();
  }

  if (expired) {
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
            maxWidth: "380px",
            background: "#161D27",
            border: "1px solid rgba(237,234,227,0.08)",
            borderRadius: "12px",
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "10px" }}>Este link já foi usado ou expirou</div>
          <div style={{ fontSize: "12.5px", color: "rgba(237,234,227,0.6)", lineHeight: 1.6, marginBottom: "20px" }}>
            Links de acesso funcionam só uma vez. Se você clicou nele mais de uma vez, ou se algum tempo já passou, peça um novo link em "Esqueceu a senha?" na tela de login.
          </div>
          <button
            onClick={() => { window.location.href = window.location.origin; }}
            style={{
              background: "#C9A227",
              border: "none",
              borderRadius: "8px",
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#161D27",
              cursor: "pointer",
            }}
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
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
          maxWidth: "380px",
          background: "#161D27",
          border: "1px solid rgba(237,234,227,0.08)",
          borderRadius: "12px",
          padding: "32px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "#C9A227",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Crown size={17} color="#161D27" />
          </span>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "20px", fontWeight: 600 }}>Sancho VP</div>
        </div>
        <div style={{ fontSize: "12.5px", color: "rgba(237,234,227,0.6)", marginBottom: "26px" }}>
          Bem-vindo! Crie uma senha para acessar sua conta nas próximas vezes.
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirme a senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && <div style={{ fontSize: "12.5px", color: "#E07856" }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "6px",
              background: "#C9A227",
              border: "none",
              borderRadius: "8px",
              padding: "11px",
              fontSize: "13.5px",
              fontWeight: 600,
              color: "#161D27",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Salvando…" : "Criar senha e entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "rgba(237,234,227,0.06)",
  border: "1px solid rgba(237,234,227,0.12)",
  borderRadius: "8px",
  color: "#EDEAE3",
  padding: "10px 12px",
  fontSize: "13.5px",
  fontFamily: "inherit",
  outline: "none",
};
