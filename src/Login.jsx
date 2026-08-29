import React, { useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "./lib/supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setNotice("Conta criada. Verifique seu e-mail para confirmar o acesso, se necessário.");
      }
    } catch (err) {
      setError(traduzErro(err.message));
    } finally {
      setLoading(false);
    }
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
        <div style={{ fontSize: "12px", color: "rgba(237,234,227,0.5)", marginBottom: "26px" }}>
          Conselho executivo de IA
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && <div style={{ fontSize: "12.5px", color: "#E07856" }}>{error}</div>}
          {notice && <div style={{ fontSize: "12.5px", color: "#7FB08A" }}>{notice}</div>}

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
            {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div style={{ marginTop: "18px", fontSize: "12.5px", color: "rgba(237,234,227,0.55)", textAlign: "center" }}>
          {mode === "signin" ? (
            <>
              Ainda não tem conta?{" "}
              <button onClick={() => { setMode("signup"); setError(""); setNotice(""); }} style={linkStyle}>
                Criar agora
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button onClick={() => { setMode("signin"); setError(""); setNotice(""); }} style={linkStyle}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function traduzErro(msg) {
  if (!msg) return "Ocorreu um erro. Tente novamente.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (msg.includes("Password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
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

const linkStyle = {
  background: "none",
  border: "none",
  color: "#C9A227",
  fontSize: "12.5px",
  cursor: "pointer",
  padding: 0,
  textDecoration: "underline",
};
