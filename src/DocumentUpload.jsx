import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, FileSpreadsheet, File, Trash2, Download } from "lucide-react";
import { supabase } from "./lib/supabaseClient";

function fileTypeOf(name) {
  return name.split(".").pop()?.toLowerCase() || "arquivo";
}

function iconFor(type) {
  if (type === "pdf") return FileText;
  if (type === "xlsx" || type === "xls" || type === "csv") return FileSpreadsheet;
  return File;
}

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED = [".pdf", ".csv", ".xlsx", ".xls", ".txt", ".md", ".docx", ".png", ".jpg", ".jpeg"];

export default function DocumentUpload({ company, profile }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    load();
  }, [company?.id]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("id, file_name, file_path, file_type, file_size, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setError("");
    setUploading(true);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" é maior que 20MB e foi ignorado.`);
        continue;
      }
      const path = `${company.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) {
        setError(`Erro ao enviar "${file.name}": ${upErr.message}`);
        continue;
      }
      await supabase.from("documents").insert({
        company_id: company.id,
        uploaded_by: profile.id,
        file_name: file.name,
        file_path: path,
        file_type: fileTypeOf(file.name),
        file_size: file.size,
      });
    }
    setUploading(false);
    load();
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function downloadFile(doc) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      setError("Não foi possível gerar o link de download.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function removeFile(doc) {
    await supabase.storage.from("documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    load();
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#C9A227" : "rgba(237,234,227,0.2)"}`,
          borderRadius: "12px",
          padding: "32px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "rgba(201,162,39,0.06)" : "rgba(237,234,227,0.02)",
          marginBottom: "20px",
          transition: "border-color 0.15s ease, background 0.15s ease",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(",")}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          style={{ display: "none" }}
        />
        <UploadCloud size={26} color="#C9A227" style={{ marginBottom: "8px" }} />
        <div style={{ fontSize: "13.5px", color: "#EDEAE3", fontWeight: 600 }}>
          Arraste arquivos aqui ou clique para selecionar
        </div>
        <div style={{ fontSize: "11.5px", color: "rgba(237,234,227,0.45)", marginTop: "4px" }}>
          PDF, XLSX, CSV, DOCX, TXT, imagens — até 20MB por arquivo
        </div>
        {uploading && <div style={{ fontSize: "12px", color: "#C9A227", marginTop: "10px" }}>Enviando…</div>}
      </div>

      {error && <div style={{ fontSize: "12px", color: "#E07856", marginBottom: "14px" }}>{error}</div>}

      {loading && <div style={{ fontSize: "13px", color: "rgba(237,234,227,0.5)" }}>Carregando…</div>}

      {!loading && documents.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "rgba(237,234,227,0.5)",
            fontSize: "13px",
            padding: "30px 20px",
            textAlign: "center",
            background: "#161D27",
            border: "1px solid rgba(237,234,227,0.08)",
            borderRadius: "10px",
          }}
        >
          Nenhum arquivo enviado ainda para {company?.name}.
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {documents.map((doc) => {
            const Icon = iconFor(doc.file_type);
            return (
              <div
                key={doc.id}
                style={{
                  background: "#161D27",
                  border: "1px solid rgba(237,234,227,0.08)",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(201,162,39,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} color="#C9A227" />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={doc.file_name}
                    >
                      {doc.file_name}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "rgba(237,234,227,0.45)", marginTop: "2px" }}>
                      {doc.file_type?.toUpperCase()} · {formatSize(doc.file_size)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "10.5px", color: "rgba(237,234,227,0.4)" }}>
                  Enviado em {new Date(doc.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  <button onClick={() => downloadFile(doc)} style={smallButtonStyle}>
                    <Download size={12} /> Baixar
                  </button>
                  <button onClick={() => removeFile(doc)} style={{ ...smallButtonStyle, color: "#E07856" }}>
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const smallButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  background: "rgba(237,234,227,0.06)",
  border: "1px solid rgba(237,234,227,0.1)",
  borderRadius: "6px",
  padding: "5px 9px",
  fontSize: "11px",
  color: "rgba(237,234,227,0.75)",
  cursor: "pointer",
  flex: 1,
  justifyContent: "center",
};
