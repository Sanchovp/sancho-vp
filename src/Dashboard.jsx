import React, { useEffect, useState, useRef } from "react";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  ListChecks,
  FileSpreadsheet,
  Megaphone,
  CalendarDays,
  Building2,
  Users,
  Plus,
  Trash2,
  Pencil,
  Mail,
} from "lucide-react";
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
const TEAM_FN_URL = "https://rwgjcshisoljccikhtgq.supabase.co/functions/v1/manage-team";

const DRE_LABELS = {
  receita_liquida: "Receita Líquida",
  cmv: "CMV",
  lucro_bruto: "Lucro Bruto",
  despesas_operacionais: "Despesas Operacionais",
  ebitda: "EBITDA",
  lucro_liquido: "Lucro Líquido",
  caixa: "Caixa",
};

const BALANCE_LABELS = {
  ativo_total: "Ativo Total",
  passivo_total: "Passivo Total",
  patrimonio_liquido: "Patrimônio Líquido",
};

function currency(v) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function percent(v) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

const SECTIONS = [
  { key: "overview", label: "Visão Geral", icon: TrendingUp },
  { key: "indicators", label: "Indicadores", icon: ListChecks },
  { key: "statements", label: "DRE & Balanço", icon: FileSpreadsheet },
  { key: "profile", label: "Empresa", icon: Building2 },
  { key: "team", label: "Equipe", icon: Users },
  { key: "news", label: "Comunicados", icon: Megaphone },
  { key: "events", label: "Calendário", icon: CalendarDays },
];

export default function Dashboard({ company, profile }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState("");
  const isAdmin = profile?.is_super_admin;
  const sectionRefs = useRef({});

  useEffect(() => {
    if (company?.id) loadEntries();
  }, [company?.id]);

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase
      .from("financial_entries")
      .select("id, period, metrics, is_projection, source_label")
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

  function scrollTo(key) {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const realized = entries.filter((e) => !e.is_projection);
  const projected = entries.filter((e) => e.is_projection);

  const chartData = realized.map((e) => ({
    period: e.period,
    receita_liquida: e.metrics?.receita_liquida ?? null,
    lucro_bruto: e.metrics?.lucro_bruto ?? null,
    lucro_liquido: e.metrics?.lucro_liquido ?? null,
    ebitda: e.metrics?.ebitda ?? null,
    caixa: e.metrics?.caixa ?? null,
  }));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" }}>
      {/* Cabeçalho fixo com navegação rápida */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "#1B2430",
          padding: "16px 22px 0 22px",
          borderBottom: "1px solid rgba(237,234,227,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BarChart3 size={16} color="#C9A227" />
            <div style={{ fontSize: "14px", fontWeight: 600 }}>Dashboard</div>
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
            <RefreshCw size={13} />
            {extracting ? "Extraindo…" : "Atualizar dos documentos"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "4px", overflowX: "auto" }}>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => scrollTo(s.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  border: "none",
                  borderBottom: "2px solid transparent",
                  background: "none",
                  color: "rgba(237,234,227,0.6)",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <Icon size={13} /> {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {extractMsg && (
        <div style={{ padding: "10px 22px 0 22px", fontSize: "12.5px", color: "rgba(237,234,227,0.6)" }}>{extractMsg}</div>
      )}

      <div style={{ padding: "20px 22px 60px 22px", flex: 1 }}>
        {loading && <div style={{ fontSize: "13px", color: "rgba(237,234,227,0.5)" }}>Carregando…</div>}

        {!loading && (
          <>
            <SectionBlock innerRef={(el) => (sectionRefs.current.overview = el)} title="Visão Geral" icon={TrendingUp}>
              <Overview entries={realized} chartData={chartData} />
            </SectionBlock>

            <SectionBlock innerRef={(el) => (sectionRefs.current.indicators = el)} title="Indicadores" icon={ListChecks}>
              <Indicators entries={realized} />
            </SectionBlock>

            <SectionBlock innerRef={(el) => (sectionRefs.current.statements = el)} title="DRE & Balanço" icon={FileSpreadsheet}>
              <Statements realized={realized} projected={projected} />
            </SectionBlock>

            <SectionBlock innerRef={(el) => (sectionRefs.current.profile = el)} title="Empresa" icon={Building2}>
              <CompanyProfile company={company} canEdit={isAdmin} />
            </SectionBlock>

            <SectionBlock innerRef={(el) => (sectionRefs.current.team = el)} title="Equipe" icon={Users}>
              <TeamManagement company={company} profile={profile} />
            </SectionBlock>

            <SectionBlock innerRef={(el) => (sectionRefs.current.news = el)} title="Comunicados" icon={Megaphone}>
              <NewsFeed company={company} canPost={isAdmin} />
            </SectionBlock>

            <SectionBlock innerRef={(el) => (sectionRefs.current.events = el)} title="Calendário" icon={CalendarDays} last>
              <EventsCalendar company={company} canPost={isAdmin} />
            </SectionBlock>
          </>
        )}
      </div>
    </div>
  );
}

function SectionBlock({ innerRef, title, icon: Icon, children, last }) {
  return (
    <div ref={innerRef} style={{ marginBottom: last ? 0 : "40px", scrollMarginTop: "120px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Icon size={15} color="#C9A227" />
        <div style={{ fontSize: "15px", fontWeight: 600 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

/* ---------------- Visão Geral ---------------- */

function Overview({ entries, chartData }) {
  if (entries.length === 0) {
    return <EmptyState text='Nenhum dado realizado ainda. Envie documentos (DRE, Balanço fechado) e clique em "Atualizar dos documentos".' />;
  }
  return (
    <>
      <div style={{ fontSize: "11px", color: "rgba(237,234,227,0.4)", marginBottom: "14px" }}>
        Mostrando apenas resultados <strong style={{ color: "rgba(237,234,227,0.6)" }}>realizados</strong>. Projeções (ex: DCF) ficam em "DRE & Balanço", separadas.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {["receita_liquida", "ebitda", "lucro_liquido", "caixa"].map((key) => {
          const last = entries[entries.length - 1]?.metrics?.[key];
          return (
            <div key={key} style={cardStyle}>
              <div style={cardLabelStyle}>{DRE_LABELS[key]}</div>
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

      <ChartCard title="EBITDA e Caixa ao longo do tempo" last>
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
    </>
  );
}

/* ---------------- Indicadores (calculados) ---------------- */

function Indicators({ entries }) {
  if (entries.length === 0) return <EmptyState />;
  const last = entries[entries.length - 1]?.metrics || {};
  const prev = entries.length > 1 ? entries[entries.length - 2]?.metrics || {} : null;

  const margemBruta = last.lucro_bruto && last.receita_liquida ? last.lucro_bruto / last.receita_liquida : null;
  const margemEbitda = last.ebitda && last.receita_liquida ? last.ebitda / last.receita_liquida : null;
  const margemLiquida = last.lucro_liquido && last.receita_liquida ? last.lucro_liquido / last.receita_liquida : null;
  const roe = last.lucro_liquido && last.patrimonio_liquido ? last.lucro_liquido / last.patrimonio_liquido : null;
  const roa = last.lucro_liquido && last.ativo_total ? last.lucro_liquido / last.ativo_total : null;
  const endividamento = last.passivo_total && last.ativo_total ? last.passivo_total / last.ativo_total : null;

  const crescReceita = prev?.receita_liquida && last.receita_liquida ? last.receita_liquida / prev.receita_liquida - 1 : null;
  const crescLucro = prev?.lucro_liquido && last.lucro_liquido ? last.lucro_liquido / prev.lucro_liquido - 1 : null;

  const rows = [
    { group: "Rentabilidade", label: "Margem Bruta", value: percent(margemBruta), formula: "Lucro Bruto / Receita Líquida" },
    { group: "Rentabilidade", label: "Margem EBITDA", value: percent(margemEbitda), formula: "EBITDA / Receita Líquida" },
    { group: "Rentabilidade", label: "Margem Líquida", value: percent(margemLiquida), formula: "Lucro Líquido / Receita Líquida" },
    { group: "Rentabilidade", label: "ROE", value: percent(roe), formula: "Lucro Líquido / Patrimônio Líquido" },
    { group: "Rentabilidade", label: "ROA", value: percent(roa), formula: "Lucro Líquido / Ativo Total" },
    { group: "Endividamento", label: "Passivo / Ativo", value: percent(endividamento), formula: "Passivo Total / Ativo Total" },
    { group: "Crescimento", label: "Crescimento da Receita", value: percent(crescReceita), formula: "Vs. período anterior" },
    { group: "Crescimento", label: "Crescimento do Lucro", value: percent(crescLucro), formula: "Vs. período anterior" },
  ];

  const groups = [...new Set(rows.map((r) => r.group))];

  return (
    <div>
      <div style={{ fontSize: "11.5px", color: "rgba(237,234,227,0.45)", marginBottom: "16px" }}>
        Calculados a partir do período mais recente ({entries[entries.length - 1]?.period}), comparado ao anterior quando aplicável.
      </div>
      {groups.map((g) => (
        <div key={g} style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#C9A227", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>{g}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
            {rows
              .filter((r) => r.group === g)
              .map((r) => (
                <div key={r.label} style={cardStyle}>
                  <div style={cardLabelStyle}>{r.label}</div>
                  <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "4px" }}>{r.value}</div>
                  <div style={{ fontSize: "10px", color: "rgba(237,234,227,0.35)", marginTop: "2px" }}>{r.formula}</div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- DRE & Balanço ---------------- */

function Statements({ realized, projected }) {
  if (realized.length === 0 && projected.length === 0) return <EmptyState />;
  return (
    <>
      {realized.length > 0 && (
        <>
          <StatementTable title="DRE — Realizado" labels={DRE_LABELS} entries={realized} badge="realizado" />
          <StatementTable title="Balanço Patrimonial — Realizado" labels={BALANCE_LABELS} entries={realized} badge="realizado" />
        </>
      )}
      {realized.length === 0 && (
        <div style={{ marginBottom: "20px" }}>
          <EmptyState text="Nenhum dado realizado (fechado/auditado) extraído ainda." />
        </div>
      )}

      {projected.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "24px 0 10px 0" }}>
            <span style={projectionBadgeStyle}>PROJETADO</span>
            <span style={{ fontSize: "11px", color: "rgba(237,234,227,0.45)" }}>
              Estimativas extraídas de documentos como DCF/valuation — ainda não realizadas.
            </span>
          </div>
          <StatementTable title="DRE — Projetado" labels={DRE_LABELS} entries={projected} badge="projetado" />
          <StatementTable title="Balanço Patrimonial — Projetado" labels={BALANCE_LABELS} entries={projected} badge="projetado" last />
        </>
      )}
    </>
  );
}

function StatementTable({ title, labels, entries, last, badge }) {
  return (
    <div style={{ marginBottom: last ? 0 : "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={{ fontSize: "12.5px", color: "rgba(237,234,227,0.7)" }}>{title}</div>
        {badge === "projetado" && <span style={projectionBadgeSmallStyle}>projeção</span>}
      </div>
      <div style={{ overflowX: "auto", background: "#161D27", border: badge === "projetado" ? "1px dashed rgba(178,92,69,0.4)" : "1px solid rgba(237,234,227,0.08)", borderRadius: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(237,234,227,0.1)" }}>
              <th style={thStyle}>Período</th>
              {Object.entries(labels).map(([k, label]) => (
                <th key={k} style={thStyle}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid rgba(237,234,227,0.05)" }}>
                <td style={tdStyle}>{e.period}</td>
                {Object.keys(labels).map((k) => (
                  <td key={k} style={tdStyle}>{currency(e.metrics?.[k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Comunicados ---------------- */

function NewsFeed({ company, canPost }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [company?.id]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("company_news")
      .select("id, title, body, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from("company_news").insert({ company_id: company.id, title: title.trim(), body: body.trim() || null });
    setTitle("");
    setBody("");
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function remove(id) {
    await supabase.from("company_news").delete().eq("id", id);
    load();
  }

  if (loading) return null;

  return (
    <div>
      {canPost && (
        <div style={{ marginBottom: "16px" }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={addButtonStyle}>
              <Plus size={13} /> Novo comunicado
            </button>
          ) : (
            <form onSubmit={submit} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
              <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
              <textarea placeholder="Detalhes (opcional)" value={body} onChange={(e) => setBody(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" disabled={saving} style={saveButtonStyle}>{saving ? "Salvando…" : "Publicar"}</button>
                <button type="button" onClick={() => setShowForm(false)} style={cancelButtonStyle}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}

      {items.length === 0 && <EmptyState text="Nenhum comunicado publicado ainda." />}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((n) => (
          <div key={n.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{n.title}</div>
              {canPost && (
                <button onClick={() => remove(n.id)} style={iconButtonStyle} title="Excluir">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            {n.body && <div style={{ fontSize: "12.5px", color: "rgba(237,234,227,0.7)", marginTop: "6px" }}>{n.body}</div>}
            <div style={{ fontSize: "10.5px", color: "rgba(237,234,227,0.4)", marginTop: "8px" }}>
              {new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Calendário de eventos ---------------- */

const EVENT_TYPE_LABELS = {
  reuniao: "Reunião",
  prazo: "Prazo",
  vencimento: "Vencimento",
  pagamento: "Pagamento",
  outro: "Outro",
};

function EventsCalendar({ company, canPost }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("outro");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [company?.id]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("company_events")
      .select("id, title, event_date, event_type, notes")
      .eq("company_id", company.id)
      .order("event_date");
    setItems(data || []);
    setLoading(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    await supabase.from("company_events").insert({
      company_id: company.id,
      title: title.trim(),
      event_date: date,
      event_type: type,
      notes: notes.trim() || null,
    });
    setTitle("");
    setDate("");
    setType("outro");
    setNotes("");
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function remove(id) {
    await supabase.from("company_events").delete().eq("id", id);
    load();
  }

  if (loading) return null;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter((e) => e.event_date >= today);
  const past = items.filter((e) => e.event_date < today);

  return (
    <div>
      {canPost && (
        <div style={{ marginBottom: "16px" }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={addButtonStyle}>
              <Plus size={13} /> Novo evento
            </button>
          ) : (
            <form onSubmit={submit} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
              <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ ...inputStyle, flex: 1 }} />
                <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </div>
              <textarea placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" disabled={saving} style={saveButtonStyle}>{saving ? "Salvando…" : "Adicionar"}</button>
                <button type="button" onClick={() => setShowForm(false)} style={cancelButtonStyle}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}

      {items.length === 0 && <EmptyState text="Nenhum evento cadastrado ainda." />}

      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: "11px", color: "#C9A227", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>Próximos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            {upcoming.map((ev) => (
              <EventRow key={ev.id} ev={ev} canPost={canPost} onDelete={() => remove(ev.id)} />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <div style={{ fontSize: "11px", color: "rgba(237,234,227,0.4)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>Passados</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: 0.6 }}>
            {past.map((ev) => (
              <EventRow key={ev.id} ev={ev} canPost={canPost} onDelete={() => remove(ev.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EventRow({ ev, canPost, onDelete }) {
  return (
    <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600 }}>{ev.title}</div>
        <div style={{ fontSize: "11px", color: "rgba(237,234,227,0.5)", marginTop: "2px" }}>
          {new Date(ev.event_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} · {EVENT_TYPE_LABELS[ev.event_type]}
        </div>
        {ev.notes && <div style={{ fontSize: "11.5px", color: "rgba(237,234,227,0.6)", marginTop: "4px" }}>{ev.notes}</div>}
      </div>
      {canPost && (
        <button onClick={onDelete} style={iconButtonStyle} title="Excluir">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

/* ---------------- Equipe ---------------- */

const ROLE_LABELS = { admin: "Administrador", member: "Membro" };

function TeamManagement({ company, profile }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, [company?.id]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_company_members", { p_company_id: company.id });
    if (!error) setMembers(data || []);
    const myRow = (data || []).find((m) => m.user_id === profile.id);
    setCanManage(Boolean(profile?.is_super_admin) || myRow?.role === "admin");
    setLoading(false);
  }

  async function callTeamFn(body) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const res = await fetch(TEAM_FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function invite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setMsg("");
    const result = await callTeamFn({ action: "invite", company_id: company.id, email: email.trim(), role });
    if (result.error) {
      setMsg("Erro: " + result.error);
    } else {
      setMsg(result.invited ? `Convite enviado para ${email.trim()}.` : `${email.trim()} adicionado à equipe.`);
      setEmail("");
      setRole("member");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function updateRole(userId, newRole) {
    await callTeamFn({ action: "update_role", company_id: company.id, user_id: userId, role: newRole });
    load();
  }

  async function remove(userId) {
    await callTeamFn({ action: "remove", company_id: company.id, user_id: userId });
    load();
  }

  async function resendInvite(memberEmail) {
    setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(memberEmail, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setMsg("Erro ao reenviar: " + error.message);
    } else {
      setMsg(`Link de acesso reenviado para ${memberEmail}.`);
    }
  }

  if (loading) return null;

  return (
    <div>
      {msg && <div style={{ fontSize: "12px", color: "rgba(237,234,227,0.6)", marginBottom: "12px" }}>{msg}</div>}

      {canManage && (
        <div style={{ marginBottom: "16px" }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={addButtonStyle}>
              <Mail size={13} /> Convidar pessoa
            </button>
          ) : (
            <form onSubmit={invite} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px" }}>
              <input type="email" placeholder="E-mail da pessoa" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
              <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" disabled={saving} style={saveButtonStyle}>{saving ? "Enviando…" : "Convidar"}</button>
                <button type="button" onClick={() => setShowForm(false)} style={cancelButtonStyle}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {members.map((m) => (
          <div key={m.user_id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>{m.full_name || m.email}</div>
              <div style={{ fontSize: "11.5px", color: "rgba(237,234,227,0.5)" }}>{m.email}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => resendInvite(m.email)} style={iconButtonStyle} title="Reenviar convite / link de acesso">
                <Mail size={13} />
              </button>
              {canManage ? (
                <select
                  value={m.role}
                  onChange={(e) => updateRole(m.user_id, e.target.value)}
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: "11.5px" }}
                >
                  <option value="member">Membro</option>
                  <option value="admin">Administrador</option>
                </select>
              ) : (
                <span style={{ fontSize: "11.5px", color: "rgba(237,234,227,0.5)" }}>{ROLE_LABELS[m.role]}</span>
              )}
              {canManage && (
                <button onClick={() => remove(m.user_id)} style={iconButtonStyle} title="Remover">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Empresa (cadastral/institucional) ---------------- */

function CompanyProfile({ company, canEdit }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [company?.id]);

  async function load() {
    const { data } = await supabase
      .from("companies")
      .select("id, name, cnpj, sector, founded_year, website, about")
      .eq("id", company.id)
      .single();
    setData(data);
    setForm(data || {});
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("companies")
      .update({
        cnpj: form.cnpj || null,
        sector: form.sector || null,
        founded_year: form.founded_year ? Number(form.founded_year) : null,
        website: form.website || null,
        about: form.about || null,
      })
      .eq("id", company.id);
    setSaving(false);
    setEditing(false);
    load();
  }

  if (!data) return null;

  if (editing) {
    return (
      <form onSubmit={save} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "10px", maxWidth: "480px" }}>
        <Field label="CNPJ">
          <input value={form.cnpj || ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Setor">
          <input value={form.sector || ""} onChange={(e) => setForm({ ...form, sector: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Ano de fundação">
          <input type="number" value={form.founded_year || ""} onChange={(e) => setForm({ ...form, founded_year: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Site">
          <input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Sobre a empresa">
          <textarea value={form.about || ""} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={5} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="submit" disabled={saving} style={saveButtonStyle}>{saving ? "Salvando…" : "Salvar"}</button>
          <button type="button" onClick={() => { setEditing(false); setForm(data); }} style={cancelButtonStyle}>Cancelar</button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ maxWidth: "560px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div style={{ fontSize: "16px", fontWeight: 600 }}>{data.name}</div>
        {canEdit && (
          <button onClick={() => setEditing(true)} style={addButtonStyle}>
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "18px" }}>
        <InfoCard label="CNPJ" value={data.cnpj || "—"} />
        <InfoCard label="Setor" value={data.sector || "—"} />
        <InfoCard label="Fundação" value={data.founded_year || "—"} />
        <InfoCard label="Site" value={data.website || "—"} />
      </div>

      {data.about && (
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Sobre a empresa</div>
          <div style={{ fontSize: "13px", color: "rgba(237,234,227,0.8)", marginTop: "8px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{data.about}</div>
        </div>
      )}
      {!data.about && <EmptyState text="Nenhuma informação institucional cadastrada ainda." />}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11.5px", color: "rgba(237,234,227,0.6)" }}>
      {label}
      {children}
    </label>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={cardStyle}>
      <div style={cardLabelStyle}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "4px" }}>{value}</div>
    </div>
  );
}

/* ---------------- Shared bits ---------------- */

function EmptyState({ text }) {
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
      <TrendingUp size={24} color="rgba(237,234,227,0.3)" />
      {text ||
        'Nenhum dado financeiro ainda. Envie documentos (DRE, Balanço) na aba de Documentos do chat e clique em "Atualizar dos documentos".'}
    </div>
  );
}

function ChartCard({ title, children, last }) {
  return (
    <div style={{ background: "#161D27", border: "1px solid rgba(237,234,227,0.08)", borderRadius: "10px", padding: "16px", marginBottom: last ? 0 : "20px" }}>
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

const thStyle = { textAlign: "left", padding: "8px 10px", color: "rgba(237,234,227,0.5)", fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle = { padding: "8px 10px", color: "rgba(237,234,227,0.85)", whiteSpace: "nowrap" };

const cardStyle = {
  background: "#161D27",
  border: "1px solid rgba(237,234,227,0.08)",
  borderRadius: "10px",
  padding: "14px 16px",
};

const cardLabelStyle = { fontSize: "11px", color: "rgba(237,234,227,0.5)", textTransform: "uppercase", letterSpacing: "0.03em" };

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

const projectionBadgeStyle = {
  background: "rgba(178,92,69,0.16)",
  border: "1px solid rgba(178,92,69,0.35)",
  color: "#D98A6E",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  padding: "3px 8px",
  borderRadius: "4px",
};

const projectionBadgeSmallStyle = {
  background: "rgba(178,92,69,0.14)",
  color: "#D98A6E",
  fontSize: "10px",
  padding: "2px 7px",
  borderRadius: "4px",
};
