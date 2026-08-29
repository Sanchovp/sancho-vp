import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Login from "./Login";
import CompanySelector from "./CompanySelector";
import SetPassword from "./SetPassword";

const COMPANY_STORAGE_KEY = "sancho_vp_selected_company";

function isInviteOrRecoveryLink() {
  const hash = window.location.hash || "";
  return hash.includes("type=invite") || hash.includes("type=recovery");
}

function withTimeout(promise, ms = 10000) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms));
  return Promise.race([promise, timeout]);
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = carregando, null = sem sessão
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [restoringCompany, setRestoringCompany] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (isInviteOrRecoveryLink()) setNeedsPassword(true);
    withTimeout(supabase.auth.getSession())
      .then(({ data }) => setSession(data.session ?? null))
      .catch(() => setStuck(true));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && isInviteOrRecoveryLink())) {
        setNeedsPassword(true);
      }
      // Só reseta a empresa selecionada em logout de verdade,
      // não em renovações silenciosas de token (ex: ao voltar pra aba).
      if (event === "SIGNED_OUT") {
        setCompany(null);
        localStorage.removeItem(COMPANY_STORAGE_KEY);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    withTimeout(
      supabase.from("profiles").select("id, full_name, is_super_admin").eq("id", session.user.id).single()
    )
      .then(({ data }) => setProfile(data))
      .catch(() => setStuck(true));
  }, [session]);

  // Restaura a empresa selecionada anteriormente (sobrevive a recarregamentos
  // de página, como quando o navegador recarrega a aba em segundo plano).
  useEffect(() => {
    if (!session || !profile) {
      setRestoringCompany(false);
      return;
    }
    const savedId = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (!savedId) {
      setRestoringCompany(false);
      return;
    }
    withTimeout(supabase.from("companies").select("id, name").eq("id", savedId).maybeSingle())
      .then(({ data }) => {
        if (data) setCompany(data);
        else localStorage.removeItem(COMPANY_STORAGE_KEY);
        setRestoringCompany(false);
      })
      .catch(() => {
        localStorage.removeItem(COMPANY_STORAGE_KEY);
        setRestoringCompany(false);
      });
  }, [session, profile]);

  function selectCompany(c) {
    localStorage.setItem(COMPANY_STORAGE_KEY, c.id);
    setCompany(c);
  }

  function switchCompany() {
    localStorage.removeItem(COMPANY_STORAGE_KEY);
    setCompany(null);
  }

  if (stuck) {
    return (
      <FullscreenMessage text="A conexão demorou demais para responder.">
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "14px",
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
          Tentar novamente
        </button>
      </FullscreenMessage>
    );
  }
  if (session === undefined) {
    return <FullscreenMessage text="Carregando…" />;
  }
  if (!session) {
    return <Login />;
  }
  if (needsPassword) {
    return (
      <SetPassword
        onDone={() => {
          setNeedsPassword(false);
          window.history.replaceState(null, "", window.location.pathname);
        }}
      />
    );
  }
  if (!profile || restoringCompany) {
    return <FullscreenMessage text="Preparando seu perfil…" />;
  }
  if (!company) {
    return (
      <CompanySelector
        profile={profile}
        onSelect={selectCompany}
        onSignOut={() => supabase.auth.signOut()}
      />
    );
  }

  return children({ session, profile, company, onSwitchCompany: switchCompany, onSignOut: () => supabase.auth.signOut() });
}

function FullscreenMessage({ text, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#1B2430",
        color: "rgba(237,234,227,0.6)",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        fontSize: "13.5px",
        textAlign: "center",
        padding: "20px",
      }}
    >
      {text}
      {children}
    </div>
  );
}
