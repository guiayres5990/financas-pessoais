import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CATS_BASE, fmt } from "./App";

const CICLOS = [1, 5, 10, 15, 20, 25];
const getCat = id => CATS_BASE.find(c => c.id === id) || CATS_BASE[CATS_BASE.length - 1];
const br = iso => iso.split("-").reverse().join("/");
const money = (v, privado) => (privado ? "R$ ••••" : fmt(v));

export default function Relatorio({ txs, userEmail, privado, t = {} }) {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(() => hoje.toISOString().slice(0, 10));
  const [cicloAtivo, setCicloAtivo] = useState(null);
  const [gerando, setGerando] = useState(false);
  const pdfRef = useRef(null);

  const txPeriodo = txs.filter(tx => tx.data >= dataInicio && tx.data <= dataFim);
  const receitas = txPeriodo.filter(tx => tx.tipo === "receita").reduce((s, tx) => s + tx.valor, 0);
  const despesas = txPeriodo.filter(tx => tx.tipo === "despesa").reduce((s, tx) => s + tx.valor, 0);
  const saldo = receitas - despesas;
  const dias = Math.max(1, Math.ceil((new Date(dataFim) - new Date(dataInicio)) / 86400000) + 1);
  const maiorDespesa = Math.max(0, ...txPeriodo.filter(tx => tx.tipo === "despesa").map(tx => tx.valor));

  const porCat = CATS_BASE
    .map(c => ({
      ...c,
      total: txPeriodo.filter(tx => tx.tipo === "despesa" && tx.cat === c.id).reduce((s, tx) => s + tx.valor, 0),
      qtd: txPeriodo.filter(tx => tx.tipo === "despesa" && tx.cat === c.id).length,
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  function periodoFixo(dia) {
    setCicloAtivo(dia);
    setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth() - 1, dia).toISOString().slice(0, 10));
    setDataFim(new Date(hoje.getFullYear(), hoje.getMonth(), dia).toISOString().slice(0, 10));
  }

  async function gerarPDF() {
    if (!pdfRef.current) { alert("Nenhum conteúdo para gerar PDF."); return; }
    setGerando(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const el = pdfRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#1a1a2e",
        logging: false,
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
    } catch (err) {
      console.error("Erro PDF:", err);
      alert("Erro ao gerar PDF: " + err.message);
    } finally {
      setGerando(false);
    }
  }

  const catLabel = id => {
    const labels = {
      moradia: t.moradia || "Moradia",
      alimentacao: t.alimentacao || "Alimentação",
      transporte: t.transporte || "Transporte",
      lazer: t.lazer || "Lazer",
      saude: t.saude || "Saúde",
      educacao: t.educacao || "Educação",
      outros: t.outros || "Outros",
    };
    return labels[id] || id;
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 820 }}>
      <div className="card" style={{ display: "grid", gap: 16 }}>
        <p className="card-title" style={{ margin: 0 }}>{t.periodoRelatorio || "Período do relatório"}</p>
        <div className="chips">
          {CICLOS.map(d => (
            <button key={d} className="chip" aria-pressed={cicloAtivo === d} onClick={() => periodoFixo(d)}>
              Dia {d} → {d}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div className="field">
            <label>{t.inicio || "Início"}</label>
            <input className="input" type="date" value={dataInicio}
              onChange={e => { setDataInicio(e.target.value); setCicloAtivo(null); }} />
          </div>
          <div className="field">
            <label>{t.fim || "Fim"}</label>
            <input className="input" type="date" value={dataFim}
              onChange={e => { setDataFim(e.target.value); setCicloAtivo(null); }} />
          </div>
          <button className="btn btn-primary" style={{ padding: "10px 18px", gap: 8 }}
            disabled={gerando || !txPeriodo.length} onClick={gerarPDF}>
            <i className="ph ph-file-pdf" style={{ fontSize: 16 }} />
            {gerando ? (t.gerando || "Gerando…") : (t.gerarPDF || "Gerar PDF")}
          </button>
        </div>
      </div>

      {txPeriodo.length === 0 ? (
        <div className="card"><p className="empty">{t.nenhumPeriodo || "Nenhum lançamento no período selecionado."}</p></div>
      ) : (
        <div ref={pdfRef} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>

          {/* Cabeçalho */}
          <div style={{ background: "var(--color-section)", backgroundImage: "radial-gradient(110% 130% at 8% 0%, var(--color-section-glow), transparent 62%)", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d2cefd" }}>{t.relatorioFinanceiro || "Relatório financeiro"}</p>
                <h3 style={{ margin: "8px 0 4px", color: "#f5f4ff" }}>{br(dataInicio)} — {br(dataFim)}</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#d2cefd" }}>{userEmail}</p>
              </div>
              <img src="/marca-capitalhub-light.png" alt="" style={{ width: 46, height: 46, objectFit: "contain" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 26 }}>
              {[[t.receitas || "Receitas", receitas], [t.despesas || "Despesas", despesas], [t.saldo || "Saldo", saldo]].map(([l, v]) => (
                <div key={l} style={{ padding: 14, borderRadius: "var(--radius-md)", background: "rgba(76,83,151,0.5)" }}>
                  <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#e7e5fe" }}>{l}</p>
                  <p style={{ margin: "6px 0 0", fontSize: 19, fontFamily: "var(--font-heading)", color: "#f5f4ff" }}>{money(v, privado)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Corpo */}
          <div style={{ padding: 24, display: "grid", gap: 22 }}>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                [txPeriodo.length, t.lancamentosPeriodo || "lançamentos no período"],
                [money(despesas / dias, privado), t.mediaDiaria || "média diária de gastos"],
                [money(maiorDespesa, privado), t.maiorDespesa || "maior despesa"],
              ].map(([v, l]) => (
                <div key={l} style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--color-neutral-900)" }}>
                  <p style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-heading)" }}>{v}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-neutral-500)" }}>{l}</p>
                </div>
              ))}
            </div>

            {/* Categorias */}
            {porCat.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                <p className="card-title" style={{ margin: 0 }}>{t.gastosPorCategoria || "Gastos por categoria"}</p>
                {porCat.map(c => (
                  <div key={c.id} style={{ display: "grid", gap: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: c.cor, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "var(--color-neutral-300)" }}>{catLabel(c.id)}</span>
                      <span style={{ color: "var(--color-neutral-500)", fontSize: 11 }}>{c.qtd} lanç. · {Math.round((c.total / despesas) * 100)}%</span>
                      <span style={{ color: "var(--color-neutral-200)" }}>{money(c.total, privado)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "var(--color-neutral-900)" }}>
                      <div style={{ height: 4, borderRadius: 2, background: c.cor, width: (c.total / despesas) * 100 + "%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lançamentos */}
            <div style={{ display: "grid", gap: 10 }}>
              <p className="card-title" style={{ margin: 0 }}>{t.lancamentosLista || "Lançamentos"}</p>
              <table className="table">
                <tbody>
                  {[...txPeriodo].sort((a, b) => a.data.localeCompare(b.data)).map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontSize: 13 }}>{tx.desc}</td>
                      <td style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{catLabel(tx.cat)}</td>
                      <td style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                        {new Date(tx.data + "T12:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className={"num " + (tx.tipo === "receita" ? "pos" : "neg")} style={{ fontSize: 13 }}>
                        {tx.tipo === "receita" ? "+" : "−"}{money(tx.valor, privado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: "var(--color-neutral-700)", textAlign: "center" }}>
              Capital Hub · {hoje.toLocaleDateString("pt-BR")} · {userEmail}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}