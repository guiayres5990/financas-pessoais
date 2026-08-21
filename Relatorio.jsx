import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CATS = [
  { id: "alimentacao", label: "Alimentação", color: "#FF6B6B", emoji: "🍽️" },
  { id: "transporte", label: "Transporte", color: "#4ECDC4", emoji: "🚗" },
  { id: "moradia", label: "Moradia", color: "#45B7D1", emoji: "🏠" },
  { id: "saude", label: "Saúde", color: "#96CEB4", emoji: "💊" },
  { id: "lazer", label: "Lazer", color: "#FFEAA7", emoji: "🎮" },
  { id: "educacao", label: "Educação", color: "#DDA0DD", emoji: "📚" },
  { id: "outros", label: "Outros", color: "#98A8B8", emoji: "📦" },
];

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Relatorio({ txs, th, userEmail }) {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return d.toISOString().slice(0,10);
  });
  const [dataFim, setDataFim] = useState(() => hoje.toISOString().slice(0,10));
  const [gerando, setGerando] = useState(false);
  const pdfRef = useRef(null);

  const txPeriodo = txs.filter(t => t.data >= dataInicio && t.data <= dataFim);
  const receitas = txPeriodo.filter(t=>t.tipo==="receita").reduce((s,t)=>s+t.valor,0);
  const despesas = txPeriodo.filter(t=>t.tipo==="despesa").reduce((s,t)=>s+t.valor,0);
  const saldo = receitas - despesas;

  const porCat = CATS.map(c => ({
    ...c,
    total: txPeriodo.filter(t=>t.tipo==="despesa"&&t.cat===c.id).reduce((s,t)=>s+t.valor,0),
    qtd: txPeriodo.filter(t=>t.tipo==="despesa"&&t.cat===c.id).length
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  function periodoFixo(dia) {
    const d1 = new Date(hoje.getFullYear(), hoje.getMonth()-1, dia);
    const d2 = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    setDataInicio(d1.toISOString().slice(0,10));
    setDataFim(d2.toISOString().slice(0,10));
  }

  async function gerarPDF() {
    setGerando(true);
    await new Promise(r => setTimeout(r, 300));
    const el = pdfRef.current;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    let posY = 0;
    const pageH = pdf.internal.pageSize.getHeight();
    while (posY < h) {
      if (posY > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -posY, w, h);
      posY += pageH;
    }
    const d1 = dataInicio.split("-").reverse().join("/");
    const d2 = dataFim.split("-").reverse().join("/");
    pdf.save(`relatorio-${d1}-a-${d2}.pdf`);
    setGerando(false);
  }

  const inp = { padding:"10px 14px", borderRadius:10, border:`1px solid ${th.inputBorder}`, background:th.input, color:th.text, fontSize:14, outline:"none" };

  return (
    <div>
      {/* Controles */}
      <div style={{ background:th.card, borderRadius:16, padding:"1.25rem", border:`1px solid ${th.border}`, marginBottom:"1.25rem" }}>
        <p style={{ fontSize:14, fontWeight:600, margin:"0 0 1rem", color:th.text }}>Selecionar período</p>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"1rem" }}>
          {[1,5,10,15,20,25,28].map(d => (
            <button key={d} onClick={()=>periodoFixo(d)} style={{ padding:"6px 12px", borderRadius:20, border:`1px solid ${th.border}`, background:"transparent", color:th.sub, fontSize:12, cursor:"pointer" }}>
              Dia {d}→{d}
            </button>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:"1rem" }}>
          <div>
            <p style={{ fontSize:12, color:th.sub, margin:"0 0 6px" }}>Data inicial</p>
            <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} style={{...inp, width:"100%"}} />
          </div>
          <div>
            <p style={{ fontSize:12, color:th.sub, margin:"0 0 6px" }}>Data final</p>
            <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={{...inp, width:"100%"}} />
          </div>
        </div>

        <button onClick={gerarPDF} disabled={gerando} style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:th.accentGrad, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer", opacity:gerando?0.7:1 }}>
          {gerando ? "⏳ Gerando PDF..." : "📄 Exportar relatório em PDF"}
        </button>
      </div>

      {/* Preview do relatório */}
      {txPeriodo.length === 0 ? (
        <div style={{ background:th.card, borderRadius:16, padding:"2rem", border:`1px solid ${th.border}`, textAlign:"center" }}>
          <p style={{ color:th.muted, margin:0 }}>Nenhum lançamento no período selecionado.</p>
        </div>
      ) : (
        <div ref={pdfRef} style={{ background:"#ffffff", borderRadius:16, overflow:"hidden", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

          {/* Cabeçalho PDF */}
          <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding:"2rem", color:"#fff" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:28, marginBottom:4 }}>💰</div>
                <h1 style={{ fontSize:24, fontWeight:800, margin:"0 0 4px", color:"#fff" }}>Relatório Financeiro</h1>
                <p style={{ fontSize:13, color:"#4ECDC4", margin:0, fontWeight:500 }}>
                  {dataInicio.split("-").reverse().join("/")} até {dataFim.split("-").reverse().join("/")}
                </p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:11, color:"rgba(255,255,255,0.5)", margin:"0 0 4px" }}>Gerado em</p>
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.8)", margin:"0 0 8px" }}>{new Date().toLocaleDateString("pt-BR")}</p>
                <p style={{ fontSize:11, color:"rgba(255,255,255,0.5)", margin:"0 0 2px" }}>Conta</p>
                <p style={{ fontSize:11, color:"rgba(255,255,255,0.7)", margin:0 }}>{userEmail}</p>
              </div>
            </div>

            {/* Cards resumo */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginTop:"1.5rem" }}>
              {[["Receitas",fmt(receitas),"#4ECDC4","📈"],["Despesas",fmt(despesas),"#FF6B6B","📉"],["Saldo",fmt(saldo),saldo>=0?"#4ECDC4":"#FF6B6B",saldo>=0?"✅":"⚠️"]].map(([l,v,c,e])=>(
                <div key={l} style={{ background:"rgba(255,255,255,0.1)", borderRadius:12, padding:"1rem", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.15)" }}>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", margin:"0 0 6px", textTransform:"uppercase", letterSpacing:1 }}>{e} {l}</p>
                  <p style={{ fontSize:18, fontWeight:800, margin:0, color:c }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:"1.5rem", background:"#f8f9fa" }}>

            {/* Estatísticas rápidas */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:"1.5rem" }}>
              {[
                ["Total de lançamentos", txPeriodo.length, "📋"],
                ["Média diária de gastos", fmt(despesas / Math.max(1, Math.ceil((new Date(dataFim)-new Date(dataInicio))/(1000*60*60*24)+1))), "📅"],
                ["Maior despesa", fmt(Math.max(...txPeriodo.filter(t=>t.tipo==="despesa").map(t=>t.valor), 0)), "🔺"]
              ].map(([l,v,e])=>(
                <div key={l} style={{ background:"#fff", borderRadius:12, padding:"1rem", border:"1px solid #e5e5ea", textAlign:"center" }}>
                  <p style={{ fontSize:18, margin:"0 0 4px" }}>{e}</p>
                  <p style={{ fontSize:18, fontWeight:700, margin:"0 0 4px", color:"#1a1a1a" }}>{v}</p>
                  <p style={{ fontSize:11, color:"#888", margin:0 }}>{l}</p>
                </div>
              ))}
            </div>

            {/* Gastos por categoria */}
            {porCat.length > 0 && (
              <div style={{ background:"#fff", borderRadius:12, padding:"1.25rem", marginBottom:"1.5rem", border:"1px solid #e5e5ea" }}>
                <p style={{ fontSize:14, fontWeight:700, margin:"0 0 1rem", color:"#1a1a1a" }}>💸 Gastos por categoria</p>
                {porCat.map(c=>(
                  <div key={c.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:16 }}>{c.emoji}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", flex:1 }}>{c.label}</span>
                      <span style={{ fontSize:12, color:"#888" }}>{c.qtd} lançamento{c.qtd>1?"s":""}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:c.color }}>{fmt(c.total)}</span>
                    </div>
                    <div style={{ height:6, background:"#f0f0f0", borderRadius:4 }}>
                      <div style={{ height:6, borderRadius:4, background:c.color, width:((c.total/despesas)*100)+"%" }} />
                    </div>
                    <p style={{ fontSize:11, color:"#aaa", margin:"3px 0 0", textAlign:"right" }}>{((c.total/despesas)*100).toFixed(1)}% do total</p>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de lançamentos */}
            <div style={{ background:"#fff", borderRadius:12, padding:"1.25rem", border:"1px solid #e5e5ea" }}>
              <p style={{ fontSize:14, fontWeight:700, margin:"0 0 1rem", color:"#1a1a1a" }}>📋 Lançamentos do período</p>
              {[...txPeriodo].sort((a,b)=>a.data.localeCompare(b.data)).map((t,i)=>{
                const cat = CATS.find(c=>c.id===t.cat);
                return (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:i<txPeriodo.length-1?"1px solid #f0f0f0":"none" }}>
                    <span style={{ fontSize:16 }}>{cat?.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:500, color:"#1a1a1a", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.desc}</p>
                      <p style={{ margin:0, fontSize:11, color:"#888" }}>{cat?.label} · {new Date(t.data+"T12:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:t.tipo==="receita"?"#1D9E75":"#FF6B6B", whiteSpace:"nowrap" }}>
                      {t.tipo==="receita"?"+":"-"}{fmt(t.valor)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rodapé */}
            <div style={{ marginTop:"1.5rem", textAlign:"center", paddingTop:"1rem", borderTop:"1px solid #e5e5ea" }}>
              <p style={{ fontSize:11, color:"#bbb", margin:0 }}>Relatório gerado pelo Finanças Pessoais · {new Date().toLocaleDateString("pt-BR")} · {userEmail}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}