import React, { useState, useRef, useEffect } from "react";
import { Send, Crown, Calculator, CalendarClock } from "lucide-react";

// Chave pública (anon) do projeto Supabase — segura para expor no front-end.
// A chave da Anthropic fica só no servidor, dentro da Edge Function.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3Z2pjc2hpc29samNjaWtodGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjkzOTIsImV4cCI6MjEwMzQ0NTM5Mn0._-OrUCqiV76bcAKQu9d7fSVh6o5be8wJrRWr1wntDjc";
const SUPABASE_FN_URL = "https://rwgjcshisoljccikhtgq.supabase.co/functions/v1/sancho-chat";

const PERSONAS = {
  sancho: {
    name: "Sancho",
    role: "Vice-Presidente Executivo",
    accent: "#C9A227",
    accentSoft: "rgba(201,162,39,0.14)",
    icon: Crown,
  },
  savio: {
    name: "Sávio",
    role: "Consultor Financeiro",
    accent: "#4C7A5C",
    accentSoft: "rgba(76,122,92,0.14)",
    icon: Calculator,
  },
  sandra: {
    name: "Sandra",
    role: "Secretária Executiva",
    accent: "#B25C45",
    accentSoft: "rgba(178,92,69,0.14)",
    icon: CalendarClock,
  },
};

export default function App() {
  const [active, setActive] = useState("sancho");
  const [messages, setMessages] = useState({ sancho: [], savio: [], sandra: [] });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const persona = PERSONAS[active];
  const thread = messages[active];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg = { role: "user", content: text };
    const nextThread = [...thread, userMsg];
    setMessages((m) => ({ ...m, [active]: nextThread }));
    setLoading(true);
    try {
      const res = await fetch(SUPABASE_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          persona: active,
          messages: nextThread.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.error?.error?.message || "Desculpe, não consegui formular uma resposta agora.";
      setMessages((m) => ({ ...m, [active]: [...nextThread, { role: "assistant", content: reply }] }));
    } catch (e) {
      setMessages((m) => ({
        ...m,
        [active]: [...nextThread, { role: "assistant", content: "Houve um erro ao consultar o conselho. Tente novamente." }],
      }));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        background: "#1B2430",
        minHeight: "100vh",
        height: "100%",
        color: "#EDEAE3",
        display: "flex",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "220px",
          flexShrink: 0,
          background: "#161D27",
          borderRight: "1px solid rgba(237,234,227,0.08)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
        }}
      >
        <div style={{ padding: "0 8px 20px 8px" }}>
          <div
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "0.01em",
              color: "#EDEAE3",
            }}
          >
            Sancho VP
          </div>
          <div style={{ fontSize: "11px", color: "rgba(237,234,227,0.5)", marginTop: "2px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Conselho Executivo
          </div>
        </div>

        {Object.entries(PERSONAS).map(([key, p]) => {
          const Icon = p.icon;
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 10px",
                borderRadius: "8px",
                border: "none",
                background: isActive ? p.accentSoft : "transparent",
                color: isActive ? p.accent : "rgba(237,234,227,0.75)",
                cursor: "pointer",
                marginBottom: "4px",
                textAlign: "left",
                transition: "background 0.15s ease",
              }}
            >
              <span
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isActive ? p.accent : "rgba(237,234,227,0.08)",
                  color: isActive ? "#161D27" : "rgba(237,234,227,0.6)",
                  flexShrink: 0,
                }}
              >
                <Icon size={15} />
              </span>
              <span>
                <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: "10.5px", opacity: 0.75 }}>{p.role}</div>
              </span>
            </button>
          );
        })}
      </div>

      {/* Chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid rgba(237,234,227,0.08)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: persona.accent,
            }}
          />
          <div style={{ fontSize: "14px", fontWeight: 600 }}>{persona.name}</div>
          <div style={{ fontSize: "12px", color: "rgba(237,234,227,0.5)" }}>· {persona.role}</div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {thread.length === 0 && (
            <div style={{ color: "rgba(237,234,227,0.4)", fontSize: "13px", marginTop: "20px" }}>
              Comece a conversa com {persona.name}.
            </div>
          )}
          {thread.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "78%",
                background: m.role === "user" ? "rgba(237,234,227,0.08)" : persona.accentSoft,
                border: m.role === "user" ? "1px solid rgba(237,234,227,0.1)" : `1px solid ${persona.accent}33`,
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "13.5px",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div
              style={{
                alignSelf: "flex-start",
                background: persona.accentSoft,
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "rgba(237,234,227,0.6)",
              }}
            >
              {persona.name} está digitando…
            </div>
          )}
        </div>

        <div style={{ padding: "16px 22px", borderTop: "1px solid rgba(237,234,227,0.08)", display: "flex", gap: "10px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Escreva para ${persona.name}…`}
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              background: "rgba(237,234,227,0.06)",
              border: "1px solid rgba(237,234,227,0.12)",
              borderRadius: "8px",
              color: "#EDEAE3",
              padding: "10px 12px",
              fontSize: "13.5px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              background: persona.accent,
              border: "none",
              borderRadius: "8px",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <Send size={16} color="#161D27" />
          </button>
        </div>
      </div>
    </div>
  );
}
