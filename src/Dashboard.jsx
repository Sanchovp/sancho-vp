import React, { useEffect, useState } from "react";
import { BarChart3, RefreshCw, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { supabase, SUPABASE_ANON_KEY } from "./lib/supabaseClient";

const EXTRACT_FN_URL = "https://rwgjcshisoljccikhtgq.supabase.co/functions/v1/extract-financials";

const METRIC_LABELS = {
  receita_liquida: "Receita Líquida",
  cmv: "CMV",
  lucro_bruto: "Lucro Bruto",
  despesas_operacionais: "Despesas Operacionais",
  ebitda: "EBITDA",
  lucro_liquido: "Lucro Líquido",
  caixa: "Caixa",
};

function currency(v) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function Dashboard({ company }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState("");

  useEffect(() => {
    if (company?.id) loadEntries();
  }, [company?.id]);

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase
      .from("financial_entries")
      .select("id, period, metrics")
      .eq("company_id", company.id)
      .order("period");
    setEntries(data || []);
    setLoading(false);
  }

  async function runExtraction() {
    setExtracting(true);
    setExtractMsg("");
    try {
      const res = await fetch(EXTRACT_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ company_id: company.id }),
      });
      const data = await res.json();
      if (data.error) {
        setExtractMsg("Erro: " + (typeof data.error === "string" ? data.error : JSON.stringify(data.error)));
      } else if (data.message) {
        setExtractMsg(data.message);
      } else {
        setExtractMsg(`${data.entries} período(s) extraído(s) de ${data.processed} documento(s).`);
      }
      await loadEntries();
    } catch (e) {
      setExtractMsg("Erro ao extrair dados. Tente novamente.");
    } finally {
      setExtracting(false);
    }
  }

  const chartData = entries.map((e) => ({
    period: e.period,
    receita_liquida: e.metrics?.receita_liquida ?? null,
    lucro_bruto: e.metrics?.lucro_bruto ?? null,
    lucro_liquido: e.metrics?.lucro_liquido ?? null,
    ebitda: e.metrics?.ebitda ?? null,
    caixa: e.metrics?.caixa ?? null,
  }));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" }}>
      <div
        style={{
          padding: "16px 22px",
          borderBottom: "1px solid rgba(237,234,227,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BarChart3 size={16} color="#C9A227" />
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Dashboard Financeiro</div>
          <div style={{ fontSize: "12px", color: "rgba(237,234,227,0.5)" }}>· {company?.name}</div>
        </div>
        <button
          onClick={runExtraction}
          disabled={extracting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#C9A227",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "#161D27",
            cursor: extracting ? "not-allowed" : "pointer",
            opacity: extracting ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} className={extracting ? "spin" : ""} />
          {extracting ? "Extraindo…" : "Atualizar dos documentos"}
        </button>
      </div>

      {extractMsg && (
        <div style={{ padding: "10px 22px 0 22px", fontSize: "12.5px", color: "rgba(237,234,227,0.6)" }}>{extractMsg}</div>
      )}

      <div style={{ padding: "20px 22px", flex: 1 }}>
        {loading && <div style={{ fontSize: "13px", color: "rgba(237,234,227,0.5)" }}>Carregando…</div>}

        {!loading && entries.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              color: "rgba(237,234,227,0.5)",
              fontSize: "13px",
              padding: "60px 20px",
              textAlign: "center",
            }}
          >
            <TrendingUp size={28} color="rgba(237,234,227,0.3)" />
            Nenhum dado financeiro ainda. Envie documentos (DRE, Balanço) na aba de Documentos do chat e clique em
            "Atualizar dos documentos" para o Sávio extrair os números automaticamente.
          </div>
        )}

        {!loading && entries.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {["receita_liquida", "ebitda", "lucro_liquido", "caixa"].map((key) => {
                const last = entries[entries.length - 1]?.metrics?.[key];
                return (
                  <div
                    key={key}
                    style={{
                      background: "#161D27",
                      border: "1px solid rgba(237,234,227,0.08)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "rgba(237,234,227,0.5)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {METRIC_LABELS[key]}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "4px" }}>{currency(last)}</div>
                    <div style={{ fontSize: "10.5px", color: "rgba(237,234,227,0.4)", marginTop: "2px" }}>
                      Último período: {entries[entries.length - 1]?.period}
                    </div>
                  </div>
                );
              })}
            </div>

            <ChartCard title="Receita Líquida vs. Lucro Líquido">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(237,234,227,0.08)" />
                <XAxis dataKey="period" stroke="rgba(237,234,227,0.5)" fontSize={11} />
                <YAxis stroke="rgba(237,234,227,0.5)" fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => currency(v)} />
                <Legend wrapperStyle={{ fontSize: "11.5px" }} />
                <Bar dataKey="receita_liquida" name="Receita Líquida" fill="#C9A227" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro_liquido" name="Lucro Líquido" fill="#4C7A5C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="EBITDA e Caixa ao longo do tempo">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(237,234,227,0.08)" />
                <XAxis dataKey="period" stroke="rgba(237,234,227,0.5)" fontSize={11} />
                <YAxis stroke="rgba(237,234,227,0.5)" fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => currency(v)} />
                <Legend wrapperStyle={{ fontSize: "11.5px" }} />
                <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#C9A227" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="caixa" name="Caixa" stroke="#B25C45" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartCard>

            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "12px", color: "rgba(237,234,227,0.5)", marginBottom: "8px" }}>Detalhado por período</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(237,234,227,0.1)" }}>
                      <th style={thStyle}>Período</th>
                      {Object.entries(METRIC_LABELS).map(([k, label]) => (
                        <th key={k} style={thStyle}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} style={{ borderBottom: "1px solid rgba(237,234,227,0.05)" }}>
                        <td style={tdStyle}>{e.period}</td>
                        {Object.keys(METRIC_LABELS).map((k) => (
                          <td key={k} style={tdStyle}>{currency(e.metrics?.[k])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "#161D27", border: "1px solid rgba(237,234,227,0.08)", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
      <div style={{ fontSize: "12.5px", color: "rgba(237,234,227,0.7)", marginBottom: "10px" }}>{title}</div>
      <ResponsiveContainer width="100%" height={240}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const tooltipStyle = {
  background: "#161D27",
  border: "1px solid rgba(237,234,227,0.15)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#EDEAE3",
};

const thStyle = { textAlign: "left", padding: "6px 10px", color: "rgba(237,234,227,0.5)", fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle = { padding: "6px 10px", color: "rgba(237,234,227,0.85)", whiteSpace: "nowrap" };
