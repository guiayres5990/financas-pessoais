import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CATS_BASE, fmt } from "./App";

const CICLOS = [1, 5, 10, 15, 20, 25];
const cat = id => CATS_BASE.find(c => c.id === id) || CATS_BASE[CATS_BASE.length - 1];
const br = iso => iso.split("-").reverse().join("/");

export default function Relatorio({ txs, userEmail, privado, t = {} }) {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(() => hoje.toISOString().slice(0, 10));
  const [cicloAtivo, setCicloAtivo] = useState(null);
  const [gerando, setGerando] = useState(false);
  const pdfRef = useRef(null);

  const money = v => (privado ? "R$ ••••" : fmt(v));

  const txPeriodo = txs.filter(t => t.data >= dataInicio && t.data <= dataFim);
  const receitas = txPeriodo.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
  const despesas = txPeriodo.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
  const saldo = receitas - despesas;
  const dias = Math.max(1, Math.ceil((new Date(dataFim) - new Date(dataInicio)) / 86400000) + 1);
  const maiorDespesa = Math.max(0, ...txPeriodo.filter(t => t.tipo === "despesa").map(t => t.valor));

  const porCat = CATS
    .map(c => ({
      ...c,
      total: txPeriodo.filter(t => t.tipo === "despesa" && t.cat === c.id).reduce((s, t) => s + t.valor, 0),
      qtd: txPeriodo.filter(t => t.tipo === "despesa" && t.cat === c.id).length,
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  function periodoFixo(dia) {
    setCicloAtivo(dia);
    setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth() - 1, dia).toISOString().slice(0, 10));
    setDataFim(new Date(hoje.getFullYear(), hoje.getMonth(), dia).toISOString().slice(0, 10));
  }

  async function gerarPDF() {
    setGerando(true);
    await new Promise(r => setTimeout(r, 250));
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, useCORS: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let posY = 0;
      while (posY < h) {
        if (posY > 0) pdf.addPage();
        pdf.addImage(img, "PNG", 0, -posY, w, h);
        posY += pageH;
      }
      pdf.save(`capital-hub-${br(dataInicio).replace(/\//g, "-")}-a-${br(dataFim).replace(/\//g, "-")}.pdf`);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 820 }}>
      <div className="card" style={{ display: "grid", gap: 16 }}>
        <p className="card-title" style={{ margin: 0 }}>Período do relatório</p>
        <div className="chips">
          {CICLOS.map(d => (
            <button key={d} className="chip" aria-pressed={cicloAtivo === d} onClick={() => periodoFixo(d)}>
              Dia {d} → {d}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div className="field">
            <label>Início</label>
            <input className="input" type="date" value={dataInicio}
              onChange={e => { setDataInicio(e.target.value); setCicloAtivo(null); }} />
          </div>
          <div className="field">
            <label>Fim</label>
            <input className="input" type="date" value={dataFim}
              onChange={e => { setDataFim(e.target.value); setCicloAtivo(null); }} />
          </div>
          <button className="btn btn-primary" style={{ padding: "10px 18px", gap: 8 }} disabled={gerando || !txPeriodo.length} onClick={gerarPDF}>
            <i className="ph ph-file-pdf" style={{ fontSize: 16 }} />
            {gerando ? "Gerando…" : "Gerar PDF"}
          </button>
        </div>
      </div>

      {txPeriodo.length === 0 ? (
        <div className="card"><p className="empty">Nenhum lançamento no período selecionado.</p></div>
      ) : (
        <div className="report" ref={pdfRef}>
          <div className="report-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <p className="kicker">Relatório financeiro</p>
                <h3>{br(dataInicio)} até {br(dataFim)}</h3>
                <p className="sub">{userEmail}</p>
              </div>
              <img src="/marca-capitalhub-light.png" alt="" style={{ width: 46, height: 46, objectFit: "contain" }} />
            </div>
            <div className="report-cards">
              <div><p>Receitas</p><p>{money(receitas)}</p></div>
              <div><p>Despesas</p><p>{money(despesas)}</p></div>
              <div><p>Saldo</p><p>{money(saldo)}</p></div>
            </div>
          </div>

          <div className="report-body">
            <div className="stat-mini">
              <div><p>{txPeriodo.length}</p><p>lançamentos no período</p></div>
              <div><p>{money(despesas / dias)}</p><p>média diária de gastos</p></div>
              <div><p>{money(maiorDespesa)}</p><p>maior despesa</p></div>
            </div>

            {porCat.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                <p className="card-title" style={{ margin: 0 }}>Gastos por categoria</p>
                {porCat.map(c => (
                  <div key={c.id} className="cat-row">
                    <div className="cat-head">
                      <span className="dot" style={{ background: c.cor }} />
                      <span className="name" style={{ color: "var(--color-neutral-300)" }}>{c.label}</span>
                      <span className="pct">{c.qtd} lanç. · {Math.round((c.total / despesas) * 100)}%</span>
                      <span className="val">{money(c.total)}</span>
                    </div>
                    <div className="bar-track" style={{ height: 4 }}>
                      <div style={{ height: 4, background: c.cor, width: (c.total / despesas) * 100 + "%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              <p className="card-title" style={{ margin: 0 }}>Lançamentos</p>
              <table className="table">
                <tbody>
                  {[...txPeriodo].sort((a, b) => a.data.localeCompare(b.data)).map(t => (
                    <tr key={t.id}>
                      <td style={{ fontSize: 13 }}>{t.desc}</td>
                      <td style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{cat(t.cat).label}</td>
                      <td style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                        {new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className={"num " + (t.tipo === "receita" ? "pos" : "neg")} style={{ fontSize: 13 }}>
                        {t.tipo === "receita" ? "+" : "−"}{money(t.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: "var(--color-neutral-700)", textAlign: "center" }}>
              Relatório gerado pelo Capital Hub · {hoje.toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
