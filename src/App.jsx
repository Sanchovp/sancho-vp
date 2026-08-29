import React, { useState, useRef, useEffect } from "react";
import { Send, Crown, Calculator, CalendarClock, Building2, LogOut, Paperclip, X, FileText, BarChart3, FileStack } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { fileToAttachment } from "./lib/fileToAttachment";
import Dashboard from "./Dashboard";
import Documents from "./Documents";

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

function messagesStorageKey(companyId) {
  return `sancho_vp_messages_${companyId}`;
}

function loadStoredMessages(companyId) {
  const empty = { sancho: [], savio: [], sandra: [] };
  if (!companyId) return empty;
  try {
    const raw = sessionStorage.getItem(messagesStorageKey(companyId));
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

function saveStoredMessages(companyId, messages) {
  try {
    sessionStorage.setItem(messagesStorageKey(companyId), JSON.stringify(messages));
  } catch {
    // Armazenamento indisponível ou cheio — ignora silenciosamente.
  }
}

export default function App({ company, profile, onSwitchCompany, onSignOut }) {
  const [active, setActive] = useState("sancho");
  const [messages, setMessages] = useState(() => loadStoredMessages(company?.id));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // [{name, attachment}]
  const [processingFiles, setProcessingFiles] = useState(false);
  const [fileError, setFileError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [showDocs, setShowDocs] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const persona = PERSONAS[active];
  const thread = messages[active] || [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread, loading]);

  useEffect(() => {
    if (company?.id) loadDocuments();
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) saveStoredMessages(company.id, messages);
  }, [messages, company?.id]);

  async function loadDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("id, file_name, file_type, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
  }

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setFileError("");
    setProcessingFiles(true);
    for (const file of files) {
      try {
        const attachment = await fileToAttachment(file);
        setPendingFiles((prev) => [...prev, { name: file.name, attachment }]);

        // Salva o arquivo original no Storage + metadados na tabela, para histórico da empresa
        const path = `${company.id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
        if (!upErr) {
          await supabase.from("documents").insert({
            company_id: company.id,
            uploaded_by: profile.id,
            file_name: file.name,
            file_path: path,
            file_type: fileTypeLabel(file),
            file_size: file.size,
          });
          loadDocuments();
        }
      } catch (err) {
        setFileError(err.message);
      }
    }
    setProcessingFiles(false);
  }

  function fileTypeLabel(file) {
    return file.name.split(".").pop()?.toLowerCase() || "arquivo";
  }

  function removePendingFile(idx) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function send() {
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || loading) return;
    setInput("");
    const attachmentsToSend = pendingFiles.map((f) => f.attachment);
    const attachmentNote = pendingFiles.length > 0 ? `\n\n📎 ${pendingFiles.map((f) => f.name).join(", ")}` : "";
    const userMsg = { role: "user", content: (text || "Analise o(s) documento(s) anexado(s).") + attachmentNote };
    const nextThread = [...thread, userMsg];
    setMessages((m) => ({ ...m, [active]: nextThread }));
    setPendingFiles([]);
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
          attachments: attachmentsToSend,
          company_id: company?.id,
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

  async function sendPreset(text) {
    if (loading) return;
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
          attachments: [],
          company_id: company?.id,
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Desculpe, não consegui formular uma resposta agora.";
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

  return (
    <div
      style={{
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        background: "#1B2430",
        minHeight: "100vh",
        height: "100%",
        color: "#EDEAE3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Barra de contexto: empresa atual e usuário */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid rgba(237,234,227,0.08)",
          fontSize: "12px",
          color: "rgba(237,234,227,0.65)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Building2 size={13} color="#C9A227" />
          {company?.name}
          {profile?.is_super_admin && (
            <button
              onClick={onSwitchCompany}
              style={{ background: "none", border: "none", color: "#C9A227", fontSize: "11.5px", cursor: "pointer", marginLeft: "6px", textDecoration: "underline" }}
            >
              trocar
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => setShowDocs((v) => !v)}
            style={{ background: "none", border: "none", color: showDocs ? "#C9A227" : "rgba(237,234,227,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px" }}
          >
            <FileText size={12} /> Documentos ({documents.length})
          </button>
          <button
            onClick={onSignOut}
            title="Sair"
            style={{ background: "none", border: "none", color: "rgba(237,234,227,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px" }}
          >
            <LogOut size={12} /> Sair
          </button>
        </div>
      </div>

      {showDocs && (
        <div
          style={{
            padding: "12px 22px",
            borderBottom: "1px solid rgba(237,234,227,0.08)",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          {documents.length === 0 && (
            <div style={{ fontSize: "12px", color: "rgba(237,234,227,0.4)" }}>Nenhum documento enviado ainda para {company?.name}.</div>
          )}
          {documents.map((d) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(237,234,227,0.06)",
                border: "1px solid rgba(237,234,227,0.1)",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "11.5px",
                color: "rgba(237,234,227,0.75)",
              }}
            >
              <FileText size={11} /> {d.file_name}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
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

        <div style={{ height: "1px", background: "rgba(237,234,227,0.08)", margin: "10px 8px" }} />

        <button
          onClick={() => setActive("dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 10px",
            borderRadius: "8px",
            border: "none",
            background: active === "dashboard" ? "rgba(201,162,39,0.14)" : "transparent",
            color: active === "dashboard" ? "#C9A227" : "rgba(237,234,227,0.75)",
            cursor: "pointer",
            textAlign: "left",
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
              background: active === "dashboard" ? "#C9A227" : "rgba(237,234,227,0.08)",
              color: active === "dashboard" ? "#161D27" : "rgba(237,234,227,0.6)",
              flexShrink: 0,
            }}
          >
            <BarChart3 size={15} />
          </span>
          <span>
            <div style={{ fontSize: "13.5px", fontWeight: 600 }}>Dashboard</div>
            <div style={{ fontSize: "10.5px", opacity: 0.75 }}>Financeiro</div>
          </span>
        </button>

        <button
          onClick={() => setActive("documents")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 10px",
            borderRadius: "8px",
            border: "none",
            background: active === "documents" ? "rgba(201,162,39,0.14)" : "transparent",
            color: active === "documents" ? "#C9A227" : "rgba(237,234,227,0.75)",
            cursor: "pointer",
            textAlign: "left",
            marginTop: "4px",
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
              background: active === "documents" ? "#C9A227" : "rgba(237,234,227,0.08)",
              color: active === "documents" ? "#161D27" : "rgba(237,234,227,0.6)",
              flexShrink: 0,
            }}
          >
            <FileStack size={15} />
          </span>
          <span>
            <div style={{ fontSize: "13.5px", fontWeight: 600 }}>Documentos</div>
            <div style={{ fontSize: "10.5px", opacity: 0.75 }}>Pautas e memorandos</div>
          </span>
        </button>
      </div>

      {active === "dashboard" ? (
        <Dashboard company={company} profile={profile} />
      ) : active === "documents" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <FileStack size={16} color="#C9A227" />
            <div style={{ fontSize: "15px", fontWeight: 600 }}>Documentos</div>
            <div style={{ fontSize: "12px", color: "rgba(237,234,227,0.5)" }}>· {company?.name}</div>
          </div>
          <Documents company={company} />
        </div>
      ) : (
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
          {active === "sandra" && (
            <button
              onClick={() => sendPreset("Me dê um resumo da semana: eventos e contas próximas, documentos pendentes e sugestões de atividades prioritárias.")}
              disabled={loading}
              style={{
                marginLeft: "auto",
                background: persona.accentSoft,
                border: `1px solid ${persona.accent}44`,
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "11.5px",
                color: persona.accent,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Resumo da semana
            </button>
          )}
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

        <div style={{ padding: "12px 22px 16px 22px", borderTop: "1px solid rgba(237,234,227,0.08)" }}>
          {fileError && (
            <div style={{ fontSize: "12px", color: "#E07856", marginBottom: "8px" }}>{fileError}</div>
          )}
          {pendingFiles.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {pendingFiles.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: persona.accentSoft,
                    border: `1px solid ${persona.accent}33`,
                    borderRadius: "6px",
                    padding: "5px 8px",
                    fontSize: "11.5px",
                  }}
                >
                  <FileText size={11} color={persona.accent} />
                  {f.name}
                  <button onClick={() => removePendingFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(237,234,227,0.6)", display: "flex" }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
              {processingFiles && <div style={{ fontSize: "11.5px", color: "rgba(237,234,227,0.5)" }}>Processando…</div>}
            </div>
          )}
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.xlsx,.xls,.txt,.md"
              onChange={handleFilesSelected}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Anexar documento (PDF, CSV, XLSX)"
              style={{
                background: "rgba(237,234,227,0.06)",
                border: "1px solid rgba(237,234,227,0.12)",
                borderRadius: "8px",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "rgba(237,234,227,0.7)",
                flexShrink: 0,
              }}
            >
              <Paperclip size={16} />
            </button>
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
              disabled={loading || (!input.trim() && pendingFiles.length === 0)}
              style={{
                background: persona.accent,
                border: "none",
                borderRadius: "8px",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: loading || (!input.trim() && pendingFiles.length === 0) ? "not-allowed" : "pointer",
                opacity: loading || (!input.trim() && pendingFiles.length === 0) ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <Send size={16} color="#161D27" />
            </button>
          </div>
        </div>
      </div>
      )}
      </div>
    </div>
  );
}
