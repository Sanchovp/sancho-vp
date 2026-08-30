import React, { useEffect, useState } from "react";
import { FileText, Plus, Download, Copy, Trash2, X, Check, Sparkles, UploadCloud } from "lucide-react";
import jsPDF from "jspdf";
import { supabase, SUPABASE_ANON_KEY } from "./lib/supabaseClient";
import DocumentUpload from "./DocumentUpload";

const GENERATE_FN_URL = "https://rwgjcshisoljccikhtgq.supabase.co/functions/v1/generate-document";

const DOC_TYPES = {
  pauta_conselho: { label: "Pauta de Conselho", placeholder: "Ex: reunião trimestral para discutir expansão e fluxo de caixa" },
  memorando: { label: "Memorando", placeholder: "Ex: recomendação sobre renegociação de contrato com fornecedor X" },
  carta_contador: { label: "Carta ao Contador", placeholder: "Ex: solicitar esclarecimento sobre lançamento de depreciação" },
  nota_valuation: { label: "Nota de Valuation", placeholder: "Ex: estimativa preliminar de valor para negociação de novo sócio" },
  outro: { label: "Outro", placeholder: "Descreva o documento que você precisa" },
};

export default function Documents({ company, profile }) {
  const [tab, setTab] = useState("generate");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState("pauta_conselho");
  const [topic, setTopic] = useState("");
  const [includeFinancials, setIncludeFinancials] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load();
  }, [company?.id]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("generated_documents")
      .select("id, doc_type, title, content, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  }

  async function generate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || SUPABASE_ANON_KEY;
      const res = await fetch(GENERATE_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          company_id: company.id,
          doc_type: docType,
          topic: topic.trim(),
          include_financials: includeFinancials,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(typeof data.error === "string" ? data.error : "Erro ao gerar o documento.");
        setGenerating(false);
        return;
      }
      const title = `${DOC_TYPES[docType].label} — ${topic.trim().slice(0, 60)}`;
      const { data: inserted } = await supabase
        .from("generated_documents")
        .insert({ company_id: company.id, doc_type: docType, title, content: data.content })
        .select()
        .single();
      setTopic("");
      setShowForm(false);
      await load();
      if (inserted) setSelected(inserted);
    } catch (err) {
      setError("Erro ao gerar o documento. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  async function remove(id) {
    await supabase.from("generated_documents").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    load();
  }

  function downloadPdf(doc) {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 48;
    const marginY = 56;
    const maxWidth = 595 - marginX * 2;
    const lineHeight = 15;
    let y = marginY;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    const titleLines = pdf.splitTextToSize(doc.title, maxWidth);
    pdf.text(titleLines, marginX, y);
    y += titleLines.length * lineHeight + 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    const bodyLines = pdf.splitTextToSize(doc.content, maxWidth);
    for (const line of bodyLines) {
      if (y > 780) {
        pdf.addPage();
        y = marginY;
      }
      pdf.text(line, marginX, y);
      y += lineHeight;
    }

    pdf.save(`${doc.title.replace(/[^\w\s-]/g, "").slice(0, 60)}.pdf`);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const tabNav = (
    <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid rgba(237,234,227,0.08)" }}>
      <button
        onClick={() => { setTab("generate"); setSelected(null); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          border: "none",
          borderBottom: tab === "generate" ? "2px solid #C9A227" : "2px solid transparent",
          background: "none",
          color: tab === "generate" ? "#C9A227" : "rgba(237,234,227,0.6)",
          fontSize: "12.5px",
          cursor: "pointer",
        }}
      >
        <Sparkles size={13} /> Gerar Documentos
      </button>
      <button
        onClick={() => setTab("upload")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          border: "none",
          borderBottom: tab === "upload" ? "2px solid #C9A227" : "2px solid transparent",
          background: "none",
          color: tab === "upload" ? "#C9A227" : "rgba(237,234,227,0.6)",
          fontSize: "12.5px",
          cursor: "pointer",
        }}
      >
        <UploadCloud size={13} /> Enviar Documentos
      </button>
    </div>
  );

  if (tab === "upload") {
    return (
      <div>
        {tabNav}
        <DocumentUpload company={company} profile={profile} />
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        {tabNav}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, maxWidth: "70%" }}>{selected.title}</div>
          <button onClick={() => setSelected(null)} style={iconButtonStyle} title="Fechar">
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button onClick={() => downloadPdf(selected)} style={addButtonStyle}>
            <Download size={13} /> Baixar PDF
          </button>
          <button onClick={() => copyToClipboard(selected.content)} style={addButtonStyle}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado!" : "Copiar texto"}
          </button>
          <button onClick={() => remove(selected.id)} style={{ ...addButtonStyle, color: "#E07856", borderColor: "rgba(224,120,86,0.3)", background: "rgba(224,120,86,0.1)" }}>
            <Trash2 size={13} /> Excluir
          </button>
        </div>
        <div
          style={{
            background: "#161D27",
            border: "1px solid rgba(237,234,227,0.08)",
            borderRadius: "10px",
            padding: "24px",
            fontSize: "13px",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            color: "rgba(237,234,227,0.9)",
          }}
        >
          {selected.content}
        </div>
      </div>
    );
  }

  return (
    <div>
      {tabNav}
      <div style={{ marginBottom: "16px" }}>
        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={addButtonStyle}>
            <Plus size={13} /> Gerar documento
          </button>
        ) : (
          <form onSubmit={generate} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "10px", maxWidth: "480px" }}>
            <label style={fieldLabelStyle}>
              Tipo de documento
              <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inputStyle}>
                {Object.entries(DOC_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>
            <label style={fieldLabelStyle}>
              Sobre o que é o documento?
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={DOC_TYPES[docType].placeholder}
                rows={3}
                required
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(237,234,227,0.7)" }}>
              <input type="checkbox" checked={includeFinancials} onChange={(e) => setIncludeFinancials(e.target.checked)} />
              Incluir dados financeiros realizados como contexto
            </label>
            {error && <div style={{ fontSize: "12px", color: "#E07856" }}>{error}</div>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="submit" disabled={generating} style={saveButtonStyle}>{generating ? "Gerando…" : "Gerar"}</button>
              <button type="button" onClick={() => setShowForm(false)} style={cancelButtonStyle}>Cancelar</button>
            </div>
          </form>
        )}
      </div>

      {loading && <div style={{ fontSize: "13px", color: "rgba(237,234,227,0.5)" }}>Carregando…</div>}
      {!loading && docs.length === 0 && (
        <EmptyState />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {docs.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelected(d)}
            style={{
              ...cardStyle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
              fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <FileText size={15} color="#C9A227" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</div>
                <div style={{ fontSize: "11px", color: "rgba(237,234,227,0.45)" }}>
                  {DOC_TYPES[d.doc_type]?.label} · {new Date(d.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        color: "rgba(237,234,227,0.5)",
        fontSize: "13px",
        padding: "40px 20px",
        textAlign: "center",
        background: "#161D27",
        border: "1px solid rgba(237,234,227,0.08)",
        borderRadius: "10px",
      }}
    >
      <FileText size={24} color="rgba(237,234,227,0.3)" />
      Nenhum documento gerado ainda. Clique em "Gerar documento" para criar sua primeira pauta, memorando ou carta.
    </div>
  );
}

const cardStyle = {
  background: "#161D27",
  border: "1px solid rgba(237,234,227,0.08)",
  borderRadius: "10px",
  padding: "14px 16px",
};

const fieldLabelStyle = { display: "flex", flexDirection: "column", gap: "4px", fontSize: "11.5px", color: "rgba(237,234,227,0.6)" };

const inputStyle = {
  background: "rgba(237,234,227,0.06)",
  border: "1px solid rgba(237,234,227,0.12)",
  borderRadius: "6px",
  color: "#EDEAE3",
  padding: "8px 10px",
  fontSize: "12.5px",
  fontFamily: "inherit",
  outline: "none",
};

const addButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  background: "rgba(201,162,39,0.14)",
  border: "1px solid rgba(201,162,39,0.3)",
  borderRadius: "6px",
  padding: "7px 12px",
  fontSize: "12px",
  color: "#C9A227",
  cursor: "pointer",
};

const saveButtonStyle = {
  background: "#C9A227",
  border: "none",
  borderRadius: "6px",
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#161D27",
  cursor: "pointer",
};

const cancelButtonStyle = {
  background: "none",
  border: "1px solid rgba(237,234,227,0.15)",
  borderRadius: "6px",
  padding: "8px 14px",
  fontSize: "12px",
  color: "rgba(237,234,227,0.7)",
  cursor: "pointer",
};

const iconButtonStyle = {
  background: "none",
  border: "none",
  color: "rgba(237,234,227,0.4)",
  cursor: "pointer",
  display: "flex",
  padding: "2px",
};
