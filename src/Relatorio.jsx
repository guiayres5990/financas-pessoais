import { useState } from "react";
import jsPDF from "jspdf";
import { CATS_BASE, fmt } from "./App";
import { Vazio } from "./Vazios";
import { qtdLanc } from "./i18n";
import { ordenarLancamentos, isoLocal } from "./ordenar";

const CICLOS = [1, 5, 10, 15, 20, 25];

// Dia de pagamento escolhido: só no localStorage deste navegador (nunca no Firestore/perfil).
// try/catch: se o armazenamento estiver bloqueado, o Relatório funciona igual, só não lembra.
const CHAVE_DIA = "falc:diaPagamento";
const lerDiaSalvo = () => {
  try { const n = Number(localStorage.getItem(CHAVE_DIA)); return CICLOS.includes(n) ? n : null; } catch { return null; }
};
const salvarDia = dia => {
  try { if (dia) localStorage.setItem(CHAVE_DIA, String(dia)); else localStorage.removeItem(CHAVE_DIA); } catch { /* bloqueado */ }
};
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

export default function Relatorio({ txs, userEmail, privado, t = {}, lang = "pt" }) {
  const hoje = new Date();
  // datas sempre no fuso do aparelho (toISOString usaria UTC e trocaria o dia em alguns horários/fusos)
  // Atalho "Dia N" (ciclo de quem recebe no dia N): Início = dia N do mês passado,
  // Fim = véspera do dia N deste mês, para o mesmo dia não entrar em dois ciclos.
  // Ex.: "Dia 10" = 10/10 a 09/11; "Dia 1" = 01/10 a 31/10 (dia 0 = último dia do mês anterior).
  // k desloca o ciclo (k = -1: o anterior; k = 1: o seguinte).
  function cicloDatas(dia, k = 0) {
    return [
      isoLocal(new Date(hoje.getFullYear(), hoje.getMonth() - 1 + k, dia)),
      isoLocal(new Date(hoje.getFullYear(), hoje.getMonth() + k, dia - 1)),
    ];
  }
  // ao abrir: se houver dia guardado, aplica o mesmo ciclo que o clique no atalho aplicaria
  const [diaInicial] = useState(lerDiaSalvo);
  const [dataInicio, setDataInicio] = useState(() => diaInicial ? cicloDatas(diaInicial)[0] : isoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [dataFim, setDataFim] = useState(() => diaInicial ? cicloDatas(diaInicial)[1] : isoLocal(hoje));
  const [cicloAtivo, setCicloAtivo] = useState(diaInicial);
  const [desloc, setDesloc] = useState(0); // ciclos a partir do do atalho (0 = o do atalho; -1 = anterior...)
  const [gerando, setGerando] = useState(false);

  const m = v => (privado ? "R$ ••••" : fmt(v));

  const txPeriodo = ordenarLancamentos(txs.filter(tx => tx.data >= dataInicio && tx.data <= dataFim));
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

  // período por extenso, sem depender do formato do campo de data do navegador (dd/mm x mm/dd)
  const dataExtensa = iso => new Date(iso + "T12:00:00").toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { day: lang === "en" ? "numeric" : "2-digit", month: lang === "en" ? "short" : "2-digit", year: "numeric" });
  const invertido = dataInicio && dataFim && dataInicio > dataFim;
  // PT: "10/10"; EN: "Oct 10" (nome do mês, para não confundir dia/mês com mês/dia)
  const diaMes = iso => lang === "en"
    ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : iso.slice(8, 10) + "/" + iso.slice(5, 7);
  // Clicar no atalho: aplica o ciclo do atalho (desloc 0) e guarda o dia. Clicar de novo no já
  // selecionado: desmarca e apaga o dia guardado (as datas ficam como estão).
  function periodoFixo(dia) {
    if (cicloAtivo === dia) { setCicloAtivo(null); setDesloc(0); salvarDia(null); return; }
    const [ini, fim] = cicloDatas(dia);
    setCicloAtivo(dia); setDesloc(0); salvarDia(dia);
    setDataInicio(ini);
    setDataFim(fim);
  }

  // Navegação entre ciclos (setas). Limite de trás: ciclo do 1º lançamento da conta (txs já
  // carregados, sem consulta nova). Limite da frente: ciclo que contém hoje.
  const hojeIso = isoLocal(hoje);
  const primeiraData = txs.reduce((min, tx) => (tx.data && (!min || tx.data < min) ? tx.data : min), null);
  const limites = dia => {
    let max = 0;
    while (max < 24 && cicloDatas(dia, max)[1] < hojeIso) max++;
    let min = 0;
    if (primeiraData) while (min > -240 && cicloDatas(dia, min)[0] > primeiraData) min--;
    return { min: Math.min(min, 0), max: Math.max(max, 0) };
  };
  const lim = cicloAtivo ? limites(cicloAtivo) : { min: 0, max: 0 };
  const podeVoltar = !!cicloAtivo && desloc > lim.min;
  const podeAvancar = !!cicloAtivo && desloc < lim.max;
  function andarCiclo(passo) {
    if (!cicloAtivo || (passo < 0 && !podeVoltar) || (passo > 0 && !podeAvancar)) return;
    const novo = desloc + passo;
    const [ini, fim] = cicloDatas(cicloAtivo, novo);
    setDesloc(novo); setDataInicio(ini); setDataFim(fim);
  }
  const cicloEmAndamento = !!cicloAtivo && dataInicio <= hojeIso && hojeIso <= dataFim;

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

    const logoBase64 = await loadImageAsBase64(window.location.origin + "/falc-simbolo-bege-512.png");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, M = 14;
    let y = 0;

    function checkPage(need) {
      if (y + need > 280) { pdf.addPage(); y = 14; }
    }

    // Cabeçalho fundo escuro
    pdf.setFillColor(31, 24, 18);
    pdf.rect(0, 0, W, 52, "F");

    // Bolha café
    pdf.setFillColor(46, 35, 26);
    pdf.circle(170, 10, 30, "F");

    // Falcão (ícone) sobre a bolha
    if (logoBase64) {
      // 24mm, centralizado na bolha (x=170) e acima dos cards (que começam em y=34)
      pdf.addImage(logoBase64, "PNG", 158, 4, 24, 24, "falcao", "FAST");
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
      [String(txPeriodo.length), txPeriodo.length === 1 ? t.lancPeriodoUm : t.lancamentosPeriodo],
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
        pdf.text(qtdLanc(c.qtd, t) + " · " + Math.round((c.total / despesas) * 100) + "%", M + 60, y + 2.5);
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
    pdf.text("CATEGORIA", M + 54, y + 4);
    pdf.text((t.subcategoria || "Subcategoria").toUpperCase(), M + 84, y + 4);
    pdf.text("DATA", M + 122, y + 4);
    pdf.text("VALOR", W - M - 20, y + 4);
    y += 8;

    txPeriodo.forEach((tx, i) => {
      checkPage(8);
      if (i % 2 === 0) {
        pdf.setFillColor(250, 247, 242);
        pdf.rect(M, y - 3, W - M * 2, 7, "F");
      }
      pdf.setTextColor(31, 24, 18);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const corta = (txt, max) => (txt.length > max ? txt.slice(0, max - 3) + "..." : txt);
      pdf.text(corta(tx.desc, 26), M + 2, y + 1);
      pdf.text(catLabel(tx.cat), M + 54, y + 1);
      pdf.text(corta(tx.sub || "-", 20), M + 84, y + 1);
      pdf.text(new Date(tx.data + "T12:00:00").toLocaleDateString("pt-BR"), M + 122, y + 1);
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
    pdf.text("FALC · " + hoje.toLocaleDateString("pt-BR") + " · " + (userEmail || ""), M, y);

    pdf.save("FALC-" + br(dataInicio).replace(/\//g, "-") + "-a-" + br(dataFim).replace(/\//g, "-") + ".pdf");
    setGerando(false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, maxWidth: 820 }}>
      <div className="card card-hover card-hover-fixo" style={{ display: "grid", gap: 16 }}>
        <p className="card-title" style={{ margin: 0 }}>{t.periodoRelatorio || "Período do relatório"}</p>
        <div className="ciclo">
          <p id="ciclo-rotulo" className="ciclo-rotulo">{t.cicloRotulo}</p>
          <div className="chips" role="group" aria-labelledby="ciclo-rotulo">
            {CICLOS.map(d => {
              const [ini, fim] = cicloDatas(d);
              const periodo = `${diaMes(ini)} ${t.cicloAte} ${diaMes(fim)}`;
              return (
                <button key={d} type="button" className="chip chip-ciclo" aria-pressed={cicloAtivo === d}
                  title={periodo} aria-label={`${t.cicloDia} ${d}: ${periodo}`} onClick={() => periodoFixo(d)}>
                  <span className="chip-ciclo-dia">{t.cicloDia} {d}</span>
                  <span className="chip-ciclo-periodo">{periodo}</span>
                </button>
              );
            })}
          </div>
          {cicloAtivo && (
            <div className="month-picker ciclo-nav">
              <button type="button" className="btn btn-icon btn-ghost" aria-label={t.cicloAnterior} title={t.cicloAnterior}
                aria-disabled={!podeVoltar} onClick={() => andarCiclo(-1)}><i className="ph ph-caret-left" style={{ fontSize: 14 }} aria-hidden="true" /></button>
              <span aria-live="polite">
                {diaMes(dataInicio)} {t.cicloAte} {diaMes(dataFim)}
                {cicloEmAndamento && <span className="tag tag-accent ciclo-andamento">{t.emAndamento}</span>}
              </span>
              <button type="button" className="btn btn-icon btn-ghost" aria-label={t.proximoCiclo} title={t.proximoCiclo}
                aria-disabled={!podeAvancar} onClick={() => andarCiclo(1)}><i className="ph ph-caret-right" style={{ fontSize: 14 }} aria-hidden="true" /></button>
            </div>
          )}
        </div>
        <div className="rel-periodo">
          <div className="field">
            <label>{t.inicio || "Início"}</label>
            <input className="input" type="date" value={dataInicio}
              onChange={e => { setDataInicio(e.target.value); setCicloAtivo(null); setDesloc(0); }} />
          </div>
          <div className="field">
            <label>{t.fim || "Fim"}</label>
            <input className="input" type="date" value={dataFim}
              onChange={e => { setDataFim(e.target.value); setCicloAtivo(null); setDesloc(0); }} />
          </div>
          {/* sem lançamentos no período: exportar fica desativado (com a dica no title e ligada à mensagem) */}
          <button className="btn btn-primary" style={{ padding: "10px 18px", gap: 8, minHeight: 44 }}
            disabled={gerando || invertido || !txPeriodo.length} onClick={gerarPDF}
            title={invertido ? t.dataInvertida : !txPeriodo.length ? ((cicloAtivo ? t.cicloVazio : t.nenhumPeriodo) || "") : undefined}
            aria-describedby={invertido ? "rel-aviso" : !txPeriodo.length ? "rel-vazio" : undefined}>
            <i className="ph ph-file-pdf" style={{ fontSize: 16 }} />
            {gerando ? (t.gerando || "Gerando…") : (t.gerarPDF || "Gerar PDF")}
          </button>
        </div>
        {/* confirmação do período por extenso; início depois do fim → aviso (e PDF desativado) */}
        {invertido
          ? <p id="rel-aviso" className="rel-aviso" role="alert"><i className="ph ph-warning-circle" aria-hidden="true" /> {t.dataInvertida}</p>
          : <p className="rel-periodo-texto">{t.periodoAplicado} {dataExtensa(dataInicio)} {t.cicloAte} {dataExtensa(dataFim)}</p>}
      </div>

      {invertido ? null : txPeriodo.length === 0 ? (
        <div className="card vazio-card">
          <Vazio id="rel-vazio" texto={cicloAtivo ? t.cicloVazio : t.nenhumPeriodo} />
        </div>
      ) : (
        <div className="card">
          <p className="card-title">{t.relatorioFinanceiro || "Prévia do relatório"}</p>
          <div className="rel-resumo">
            {[
              [t.receitas || "Receitas", m(receitas)],
              [t.despesas || "Despesas", m(despesas)],
              [t.saldo || "Saldo", m(saldo)]
            ].map(([l, v]) => (
              <div key={l} className="card-hover card-hover-fixo" style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--color-neutral-900)" }}>
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
                    <span style={{ color: "var(--color-neutral-600)", fontSize: 11 }}>{qtdLanc(c.qtd, t)} · {Math.round((c.total / despesas) * 100)}%</span>
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
          <div className="table-scroll"><table className="table">
            <tbody>
              {txPeriodo.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontSize: 13 }}>
                    {tx.desc}
                    {tx.sub && tx.sub.trim().toLowerCase() !== String(tx.desc || "").trim().toLowerCase() && <span className="tag sub-tag">{tx.sub}</span>}
                  </td>
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
          </table></div>
        </div>
      )}
    </div>
  );
}