import { useState } from "react";
import jsPDF from "jspdf";
import { CATS_BASE, fmt } from "./App";

const CICLOS = [1, 5, 10, 15, 20, 25];
const br = iso => iso.split("-").reverse().join("/");

const CAT_COLORS = {
  moradia:     "#4F6F86",
  alimentacao: "#B35A4A",
  transporte:  "#A08B6C",
  lazer:       "#B58A2E",
  saude:       "#5F7A60",
  educacao:    "#7F5F83",
  outros:      "#8A7C6D",
};

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function loadImageAsBase64(src) {
  return new Promise(resolve => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function Relatorio({ txs, userEmail, privado, t = {} }) {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(() => hoje.toISOString().slice(0, 10));
  const [cicloAtivo, setCicloAtivo] = useState(null);
  const [gerando, setGerando] = useState(false);

  const m = v => (privado ? "R$ ••••" : fmt(v));

  const txPeriodo = txs.filter(tx => tx.data >= dataInicio && tx.data <= dataFim);
  const receitas  = txPeriodo.filter(tx => tx.tipo === "receita").reduce((s, tx) => s + tx.valor, 0);
  const despesas  = txPeriodo.filter(tx => tx.tipo === "despesa").reduce((s, tx) => s + tx.valor, 0);
  const saldo     = receitas - despesas;
  const dias      = Math.max(1, Math.ceil((new Date(dataFim) - new Date(dataInicio)) / 86400000) + 1);
  const maiorDesp = Math.max(0, ...txPeriodo.filter(tx => tx.tipo === "despesa").map(tx => tx.valor));

  const porCat = CATS_BASE
    .map(c => ({
      ...c,
      total: txPeriodo.filter(tx => tx.tipo === "despesa" && tx.cat === c.id).reduce((s, tx) => s + tx.valor, 0),
      qtd:   txPeriodo.filter(tx => tx.tipo === "despesa" && tx.cat === c.id).length,
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  function periodoFixo(dia) {
    setCicloAtivo(dia);
    setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth() - 1, dia).toISOString().slice(0, 10));
    setDataFim(new Date(hoje.getFullYear(), hoje.getMonth(), dia).toISOString().slice(0, 10));
  }

  const catLabel = id => {
    const labels = {
      moradia: t.moradia || "Moradia",
      alimentacao: t.alimentacao || "Alimentação",
      transporte: t.transporte || "Transporte",
      lazer: t.lazer || "Lazer",
      saude: t.saude || "Saúde",
      educacao: t.educacao || "Educação",
      outros: t.outros || "Outros"
    };
    return labels[id] || id;
  };

  async function gerarPDF() {
    if (!txPeriodo.length) {
      alert("Nenhum lançamento no período.");
      return;
    }
    setGerando(true);

    const logoBase64 = await loadImageAsBase64(window.location.origin + "/falc-icone-creme-512.png");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, M = 14;
    let y = 0;

    function checkPage(need) {
      if (y + need > 280) { pdf.addPage(); y = 14; }
    }

    // Cabeçalho fundo escuro
    pdf.setFillColor(31, 24, 18);
    pdf.rect(0, 0, W, 52, "F");

    // Bolha verde-petróleo
    pdf.setFillColor(46, 35, 26);
    pdf.circle(170, 10, 30, "F");

    // Falcão (ícone) sobre a bolha
    if (logoBase64) {
      pdf.addImage(logoBase64, "PNG", 160, 8, 30, 30);
    }

    // Textos do cabeçalho
    pdf.setTextColor(243, 236, 226);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("RELATÓRIO FINANCEIRO", M, 14);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(br(dataInicio) + " — " + br(dataFim), M, 22);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(userEmail || "", M, 28);

    // Cards resumo
    const cards = [
      [t.receitas || "Receitas", m(receitas)],
      [t.despesas || "Despesas", m(despesas)],
      [t.saldo || "Saldo", m(saldo)]
    ];
    cards.forEach(([label, val], i) => {
      const x = M + i * 61;
      pdf.setFillColor(74, 56, 40);
      pdf.roundedRect(x, 34, 58, 14, 2, 2, "F");
      pdf.setTextColor(217, 205, 182);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(label.toUpperCase(), x + 4, 40);
      pdf.setTextColor(243, 236, 226);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(val, x + 4, 46);
    });

    y = 62;
    pdf.setTextColor(31, 24, 18);

    // Stats rápidas
    const stats = [
      [String(txPeriodo.length), t.lancamentosPeriodo || "lançamentos"],
      [m(despesas / dias), t.mediaDiaria || "média diária"],
      [m(maiorDesp), t.maiorDespesa || "maior despesa"],
    ];
    stats.forEach(([val, label], i) => {
      const x = M + i * 61;
      pdf.setFillColor(243, 236, 226);
      pdf.roundedRect(x, y, 58, 16, 2, 2, "F");
      pdf.setTextColor(31, 24, 18);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(val, x + 4, y + 8);
      pdf.setTextColor(117, 103, 90);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(label, x + 4, y + 13);
    });
    y += 24;

    // Categorias
    if (porCat.length > 0) {
      checkPage(12);
      pdf.setTextColor(31, 24, 18);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(t.gastosPorCategoria || "Gastos por categoria", M, y);
      y += 6;
      porCat.forEach(c => {
        checkPage(12);
        const cor = CAT_COLORS[c.id] || "#8A7C6D";
        const [r, g, b] = hexToRgb(cor);
        pdf.setFillColor(r, g, b);
        pdf.roundedRect(M, y, 3, 3, 0.5, 0.5, "F");
        pdf.setTextColor(31, 24, 18);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(catLabel(c.id), M + 5, y + 2.5);
        pdf.setTextColor(117, 103, 90);
        pdf.text(c.qtd + " lanç. · " + Math.round((c.total / despesas) * 100) + "%", M + 60, y + 2.5);
        pdf.setTextColor(31, 24, 18);
        pdf.setFont("helvetica", "bold");
        pdf.text(m(c.total), W - M - pdf.getTextWidth(m(c.total)), y + 2.5);
        pdf.setFillColor(232, 223, 209);
        pdf.rect(M, y + 4.5, W - M * 2, 1.5, "F");
        pdf.setFillColor(r, g, b);
        pdf.rect(M, y + 4.5, (W - M * 2) * (c.total / despesas), 1.5, "F");
        y += 10;
      });
      y += 4;
    }

    // Lançamentos
    checkPage(12);
    pdf.setTextColor(31, 24, 18);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(t.lancamentosLista || "Lançamentos", M, y);
    y += 6;

    pdf.setFillColor(243, 236, 226);
    pdf.rect(M, y, W - M * 2, 6, "F");
    pdf.setTextColor(117, 103, 90);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("DESCRIÇÃO", M + 2, y + 4);
    pdf.text("CATEGORIA", M + 70, y + 4);
    pdf.text("DATA", M + 110, y + 4);
    pdf.text("VALOR", W - M - 20, y + 4);
    y += 8;

    [...txPeriodo].sort((a, b) => a.data.localeCompare(b.data)).forEach((tx, i) => {
      checkPage(8);
      if (i % 2 === 0) {
        pdf.setFillColor(250, 247, 242);
        pdf.rect(M, y - 3, W - M * 2, 7, "F");
      }
      pdf.setTextColor(31, 24, 18);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const desc = tx.desc.length > 28 ? tx.desc.slice(0, 25) + "..." : tx.desc;
      pdf.text(desc, M + 2, y + 1);
      pdf.text(catLabel(tx.cat), M + 70, y + 1);
      pdf.text(new Date(tx.data + "T12:00:00").toLocaleDateString("pt-BR"), M + 110, y + 1);
      const val = (tx.tipo === "receita" ? "+" : "-") + m(tx.valor);
      if (tx.tipo === "receita") {
        pdf.setTextColor(122, 95, 52);
      } else {
        pdf.setTextColor(165, 80, 63);
      }
      pdf.setFont("helvetica", "bold");
      pdf.text(val, W - M - pdf.getTextWidth(val), y + 1);
      y += 7;
    });

    // Rodapé
    y += 6;
    checkPage(8);
    pdf.setFillColor(243, 236, 226);
    pdf.rect(M, y, W - M * 2, 0.5, "F");
    y += 5;
    pdf.setTextColor(150, 136, 120);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Falc · " + hoje.toLocaleDateString("pt-BR") + " · " + (userEmail || ""), M, y);

    pdf.save("falc-" + br(dataInicio).replace(/\//g, "-") + "-a-" + br(dataFim).replace(/\//g, "-") + ".pdf");
    setGerando(false);
  }

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
        <div className="card">
          <p className="empty">{t.nenhumPeriodo || "Nenhum lançamento no período selecionado."}</p>
        </div>
      ) : (
        <div className="card">
          <p className="card-title">{t.relatorioFinanceiro || "Prévia do relatório"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {[
              [t.receitas || "Receitas", m(receitas)],
              [t.despesas || "Despesas", m(despesas)],
              [t.saldo || "Saldo", m(saldo)]
            ].map(([l, v]) => (
              <div key={l} style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--color-neutral-900)" }}>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-neutral-500)" }}>{l}</p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontFamily: "var(--font-heading)" }}>{v}</p>
              </div>
            ))}
          </div>

          {porCat.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p className="card-title" style={{ marginBottom: 10 }}>{t.gastosPorCategoria || "Gastos por categoria"}</p>
              {porCat.map(c => (
                <div key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: CAT_COLORS[c.id], flexShrink: 0 }} />
                    <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>{catLabel(c.id)}</span>
                    <span style={{ color: "var(--color-neutral-600)", fontSize: 11 }}>{c.qtd} lanç. · {Math.round((c.total / despesas) * 100)}%</span>
                    <span style={{ color: "var(--color-neutral-200)" }}>{m(c.total)}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: "var(--color-neutral-900)" }}>
                    <div style={{ height: 3, borderRadius: 2, background: CAT_COLORS[c.id], width: (c.total / despesas) * 100 + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="card-title" style={{ marginBottom: 8 }}>{t.lancamentosLista || "Lançamentos"}</p>
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
                    {tx.tipo === "receita" ? "+" : "−"}{m(tx.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}