import { useState, useEffect, useRef } from "react";
import "./App.css";

const CATS = [
  { id: "alimentacao", label: "Alimentação", color: "#E24B4A" },
  { id: "transporte", label: "Transporte", color: "#378ADD" },
  { id: "moradia", label: "Moradia", color: "#1D9E75" },
  { id: "saude", label: "Saúde", color: "#D4537E" },
  { id: "lazer", label: "Lazer", color: "#EF9F27" },
  { id: "educacao", label: "Educação", color: "#7F77DD" },
  { id: "outros", label: "Outros", color: "#888780" },
];

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

let chartInstances = {};

export default function App() {
  const [txs, setTxs] = useState(() => {
    try { const d = localStorage.getItem("fp_txs"); return d ? JSON.parse(d) : []; } catch { return []; }
  });
  const [view, setView] = useState("dashboard");
  const [form, setForm] = useState({
    tipo: "despesa", valor: "", desc: "", cat: "alimentacao",
    data: new Date().toISOString().slice(0, 10)
  });
  const [mes, setMes] = useState(new Date().getMonth());
  const [ano, setAno] = useState(new Date().getFullYear());
  const [confirmDel, setConfirmDel] = useState(null);
  const pieRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("fp_txs", JSON.stringify(txs)); } catch {}
  }, [txs]);

  const txMes = txs.filter(t => {
    const d = new Date(t.data + "T12:00:00");
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  const receitas = txMes.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
  const despesas = txMes.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
  const saldo = receitas - despesas;

  const porCat = CATS.map(c => ({
    ...c,
    total: txMes.filter(t => t.tipo === "despesa" && t.cat === c.id).reduce((s, t) => s + t.valor, 0)
  })).filter(c => c.total > 0);

  useEffect(() => {
    if (view !== "dashboard") return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.onload = () => renderCharts();
    if (window.Chart) renderCharts();
    else document.head.appendChild(script);
  }, [view, txs, mes, ano]);

  function renderCharts() {
    setTimeout(() => {
      if (pieRef.current && porCat.length > 0) {
        if (chartInstances.pie) chartInstances.pie.destroy();
        chartInstances.pie = new window.Chart(pieRef.current.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: porCat.map(c => c.label),
            datasets: [{ data: porCat.map(c => c.total), backgroundColor: porCat.map(c => c.color), borderWidth: 2, borderColor: "#fff" }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }
      if (barRef.current) {
        if (chartInstances.bar) chartInstances.bar.destroy();
        const ultMeses = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(ano, mes - 5 + i, 1);
          return { m: d.getMonth(), a: d.getFullYear(), label: MONTHS[d.getMonth()] };
        });
        chartInstances.bar = new window.Chart(barRef.current.getContext("2d"), {
          type: "bar",
          data: {
            labels: ultMeses.map(x => x.label),
            datasets: [
              { label: "Receitas", data: ultMeses.map(x => txs.filter(t => { const d = new Date(t.data + "T12:00:00"); return d.getMonth() === x.m && d.getFullYear() === x.a && t.tipo === "receita"; }).reduce((s, t) => s + t.valor, 0)), backgroundColor: "#1D9E75" },
              { label: "Despesas", data: ultMeses.map(x => txs.filter(t => { const d = new Date(t.data + "T12:00:00"); return d.getMonth() === x.m && d.getFullYear() === x.a && t.tipo === "despesa"; }).reduce((s, t) => s + t.valor, 0)), backgroundColor: "#E24B4A" }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { autoSkip: false } } } }
        });
      }
    }, 100);
  }

  function addTx() {
    const v = parseFloat(form.valor.replace(",", "."));
    if (!v || v <= 0 || !form.desc.trim()) return alert("Preencha descrição e valor corretamente.");
    setTxs(prev => [...prev, { id: Date.now(), ...form, valor: v }]);
    setForm(f => ({ ...f, valor: "", desc: "" }));
  }

  function exportCSV() {
    const header = "Data,Tipo,Categoria,Descrição,Valor\n";
    const rows = txs.map(t => `${t.data},${t.tipo},${CATS.find(c => c.id === t.cat)?.label},${t.desc},${t.valor}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "financas.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>Finanças pessoais</h1>
          <p className="subtitle">{MONTHS[mes]} {ano}</p>
        </div>
        <button className="btn-export" onClick={exportCSV}>Exportar CSV</button>
      </div>

      <div className="nav">
        {[["dashboard","Visão geral"],["lancamento","Lançar"],["historico","Histórico"]].map(([v, l]) => (
          <button key={v} className={`nav-btn ${view === v ? "active" : ""}`} onClick={() => setView(v)}>{l}</button>
        ))}
        <select value={mes} onChange={e => setMes(+e.target.value)}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(+e.target.value)}>
          {[2023,2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {view === "dashboard" && (
        <div>
          <div className="cards">
            {[["Receitas", fmt(receitas), "#1D9E75"], ["Despesas", fmt(despesas), "#E24B4A"], ["Saldo", fmt(saldo), saldo >= 0 ? "#1D9E75" : "#E24B4A"]].map(([l, v, c]) => (
              <div key={l} className="card-metric">
                <p className="card-label">{l}</p>
                <p className="card-value" style={{ color: c }}>{v}</p>
              </div>
            ))}
          </div>

          {porCat.length > 0 ? (
            <div className="chart-box">
              <p className="chart-title">Despesas por categoria</p>
              <div className="pie-row">
                <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
                  <canvas ref={pieRef} role="img" aria-label="Gráfico de despesas por categoria" />
                </div>
                <div className="legend">
                  {porCat.map(c => (
                    <div key={c.id} className="legend-item">
                      <span className="legend-dot" style={{ background: c.color }} />
                      <span className="legend-label">{c.label}</span>
                      <span className="legend-value">{fmt(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : <p className="empty">Nenhuma despesa lançada neste mês.</p>}

          <div className="chart-box">
            <p className="chart-title">Últimos 6 meses</p>
            <div className="bar-legend">
              <span><span className="leg-sq" style={{ background: "#1D9E75" }} />Receitas</span>
              <span><span className="leg-sq" style={{ background: "#E24B4A" }} />Despesas</span>
            </div>
            <div style={{ position: "relative", height: 200 }}>
              <canvas ref={barRef} role="img" aria-label="Receitas e despesas dos últimos 6 meses" />
            </div>
          </div>
        </div>
      )}

      {view === "lancamento" && (
        <div className="form-box">
          <p className="form-title">Novo lançamento</p>
          <div className="tipo-row">
            {["despesa","receita"].map(t => (
              <button key={t} className={`tipo-btn ${form.tipo === t ? "active-" + t : ""}`} onClick={() => setForm(f => ({ ...f, tipo: t }))}>
                {t === "despesa" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>
          <input placeholder="Descrição" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
          <input placeholder="Valor (R$)" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} type="number" min="0" />
          <select value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          <button className="btn-add" onClick={addTx}>Adicionar</button>
        </div>
      )}

      {view === "historico" && (
        <div>
          {txMes.length === 0
            ? <p className="empty">Nenhum lançamento neste mês.</p>
            : [...txMes].sort((a, b) => b.data.localeCompare(a.data)).map(t => {
              const cat = CATS.find(c => c.id === t.cat);
              return (
                <div key={t.id} className="tx-item">
                  <span className="tx-dot" style={{ background: cat?.color }} />
                  <div className="tx-info">
                    <p className="tx-desc">{t.desc}</p>
                    <p className="tx-meta">{cat?.label} · {new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className="tx-valor" style={{ color: t.tipo === "receita" ? "#1D9E75" : "#E24B4A" }}>
                    {t.tipo === "receita" ? "+" : "-"}{fmt(t.valor)}
                  </span>
                  <button className="btn-del" onClick={() => setConfirmDel(t.id)}>×</button>
                </div>
              );
            })}
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Tem certeza que deseja excluir este lançamento?</p>
            <div className="modal-btns">
              <button onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn-confirm-del" onClick={() => { setTxs(p => p.filter(t => t.id !== confirmDel)); setConfirmDel(null); }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}