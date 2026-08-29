import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Login from "./Login";
import CompanySelector from "./CompanySelector";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = carregando, null = sem sessão
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Só reseta a empresa selecionada em login/logout de verdade,
      // não em renovações silenciosas de token (ex: ao voltar pra aba).
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        setCompany(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("id, full_name, is_super_admin")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  if (session === undefined) {
    return <FullscreenMessage text="Carregando…" />;
  }
  if (!session) {
    return <Login />;
  }
  if (!profile) {
    return <FullscreenMessage text="Preparando seu perfil…" />;
  }
  if (!company) {
    return (
      <CompanySelector
        profile={profile}
        onSelect={setCompany}
        onSignOut={() => supabase.auth.signOut()}
      />
    );
  }

  return children({ session, profile, company, onSwitchCompany: () => setCompany(null), onSignOut: () => supabase.auth.signOut() });
}

function FullscreenMessage({ text }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1B2430",
        color: "rgba(237,234,227,0.6)",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        fontSize: "13.5px",
      }}
    >
      {text}
    </div>
  );
}
