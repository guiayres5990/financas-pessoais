import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy
} from "firebase/firestore";

const CATS = [
  { id: "alimentacao", label: "Alimentação", color: "#FF6B6B" },
  { id: "transporte", label: "Transporte", color: "#4ECDC4" },
  { id: "moradia", label: "Moradia", color: "#45B7D1" },
  { id: "saude", label: "Saúde", color: "#96CEB4" },
  { id: "lazer", label: "Lazer", color: "#FFEAA7" },
  { id: "educacao", label: "Educação", color: "#DDA0DD" },
  { id: "outros", label: "Outros", color: "#98A8B8" },
];

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0,10);

let ci = {};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [txs, setTxs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [mes, setMes] = useState(new Date().getMonth());
  const [ano, setAno] = useState(new Date().getFullYear());
  const [busca, setBusca] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({ tipo: "despesa", valor: "", desc: "", cat: "alimentacao", data: today() });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("grafico");

  const pieRef = useRef(null);
  const barRef = useRef(null);
  const [chartLib, setChartLib] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transacoes"), where("uid", "==", user.uid), orderBy("data", "desc"));
    const unsub = onSnapshot(q, snap => {
      setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!window.Chart) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      s.onload = () => setChartLib(true);
      document.head.appendChild(s);
    } else setChartLib(true);
  }, []);

  async function handleAuth() {
    setAuthErr(""); setAuthLoading(true);
    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email, senha);
      } else {
        await createUserWithEmailAndPassword(auth, email, senha);
      }
    } catch (e) {
      const msgs = {
        "auth/user-not-found": "E-mail não encontrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/email-already-in-use": "E-mail já cadastrado.",
        "auth/weak-password": "Senha fraca. Use ao menos 6 caracteres.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/invalid-credential": "E-mail ou senha incorretos.",
      };
      setAuthErr(msgs[e.code] || "Erro ao autenticar. Tente novamente.");
    }
    setAuthLoading(false);
  }

  async function addTx() {
    const v = parseFloat(form.valor.replace(",", "."));
    if (!v || v <= 0 || !form.desc.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "transacoes"), { ...form, valor: v, uid: user.uid, criadoEm: new Date() });
    setForm(f => ({ ...f, valor: "", desc: "" }));
    setSaving(false);
  }

  async function delTx(id) {
    await deleteDoc(doc(db, "transacoes", id));
    setConfirmDel(null);
  }

  function exportCSV() {
    const h = "Data,Tipo,Categoria,Descrição,Valor\n";
    const r = txs.map(t => `${t.data},${t.tipo},${CATS.find(c=>c.id===t.cat)?.label},${t.desc},${t.valor}`).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([h+r],{type:"text/csv"})); a.download = "financas.csv"; a.click();
  }

  const txMes = txs.filter(t => { const d = new Date(t.data+"T12:00:00"); return d.getMonth()===mes && d.getFullYear()===ano; });
  const receitas = txMes.filter(t=>t.tipo==="receita").reduce((s,t)=>s+t.valor,0);
  const despesas = txMes.filter(t=>t.tipo==="despesa").reduce((s,t)=>s+t.valor,0);
  const saldo = receitas - despesas;
  const porCat = CATS.map(c=>({...c, total: txMes.filter(t=>t.tipo==="despesa"&&t.cat===c.id).reduce((s,t)=>s+t.valor,0)})).filter(c=>c.total>0);
  const hoje = new Date(); const diasMes = new Date(ano,mes+1,0).getDate();
  const diaAtual = (mes===hoje.getMonth()&&ano===hoje.getFullYear()) ? hoje.getDate() : diasMes;
  const projecao = diaAtual > 0 ? (despesas/diaAtual)*diasMes : 0;
  const txFiltradas = txMes.filter(t => busca===""||t.desc.toLowerCase().includes(busca.toLowerCase())||CATS.find(c=>c.id===t.cat)?.label.toLowerCase().includes(busca.toLowerCase()));

  useEffect(() => {
    if (!chartLib || view !== "dashboard") return;
    setTimeout(() => {
      if (pieRef.current && porCat.length > 0) {
        if (ci.pie) ci.pie.destroy();
        ci.pie = new window.Chart(pieRef.current.getContext("2d"), {
          type: "doughnut",
          data: { labels: porCat.map(c=>c.label), datasets: [{ data: porCat.map(c=>c.total), backgroundColor: porCat.map(c=>c.color), borderWidth: 0 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "70%" }
        });
      }
      if (barRef.current) {
        if (ci.bar) ci.bar.destroy();
        const ult = Array.from({length:6},(_,i)=>{ const d=new Date(ano,mes-5+i,1); return { m:d.getMonth(), a:d.getFullYear(), label:MONTHS[d.getMonth()] }; });
        ci.bar = new window.Chart(barRef.current.getContext("2d"), {
          type: "bar",
          data: { labels: ult.map(x=>x.label), datasets: [
            { label:"Receitas", data: ult.map(x=>txs.filter(t=>{const d=new Date(t.data+"T12:00:00");return d.getMonth()===x.m&&d.getFullYear()===x.a&&t.tipo==="receita";}).reduce((s,t)=>s+t.valor,0)), backgroundColor:"#4ECDC4", borderRadius: 6 },
            { label:"Despesas", data: ult.map(x=>txs.filter(t=>{const d=new Date(t.data+"T12:00:00");return d.getMonth()===x.m&&d.getFullYear()===x.a&&t.tipo==="despesa";}).reduce((s,t)=>s+t.valor,0)), backgroundColor:"#FF6B6B", borderRadius: 6 }
          ]},
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color:"#aaa" }, grid: { display:false } }, y: { ticks: { color:"#aaa" }, grid: { color:"#ffffff15" } } } }
        });
      }
    }, 100);
  }, [chartLib, view, txs, mes, ano, tab]);

  const s = {
    page: { minHeight:"100vh", background:"#0f0f13", color:"#f0f0f0", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
    card: { background:"#1a1a24", borderRadius:16, padding:"1.25rem", border:"1px solid #ffffff10" },
    input: { width:"100%", padding:"11px 14px", borderRadius:10, border:"1px solid #ffffff15", background:"#0f0f13", color:"#f0f0f0", fontSize:14 },
    btn: (bg, col="#fff") => ({ padding:"11px 20px", borderRadius:10, border:"none", background:bg, color:col, fontWeight:600, fontSize:14, cursor:"pointer" }),
  };

  if (loading) return (
    <div style={{...s.page, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:48,height:48,border:"3px solid #ffffff20",borderTop:"3px solid #4ECDC4",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 1rem"}} />
        <p style={{color:"#888"}}>Carregando...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return (
    <div style={{...s.page, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem"}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{...s.card, width:"100%", maxWidth:400, animation:"fadeIn .4s ease"}}>
        <div style={{textAlign:"center", marginBottom:"2rem"}}>
          <div style={{fontSize:40, marginBottom:8}}>💰</div>
          <h1 style={{fontSize:22, fontWeight:700, margin:"0 0 4px", background:"linear-gradient(135deg,#4ECDC4,#45B7D1)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>Finanças Pessoais</h1>
          <p style={{color:"#666", fontSize:13, margin:0}}>Controle seu dinheiro com inteligência</p>
        </div>
        <div style={{display:"flex", background:"#0f0f13", borderRadius:10, padding:4, marginBottom:"1.5rem"}}>
          {["login","cadastro"].map(m=>(
            <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}} style={{flex:1, padding:"8px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:500, background:authMode===m?"#4ECDC4":"transparent", color:authMode===m?"#0f0f13":"#888", transition:"all .2s"}}>
              {m==="login"?"Entrar":"Cadastrar"}
            </button>
          ))}
        </div>
        <div style={{display:"grid", gap:12}}>
          <input placeholder="E-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={s.input} />
          <input placeholder="Senha" type="password" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAuth()} style={s.input} />
          {authErr && <p style={{color:"#FF6B6B", fontSize:13, margin:0, textAlign:"center"}}>{authErr}</p>}
          <button onClick={handleAuth} disabled={authLoading} style={{...s.btn("linear-gradient(135deg,#4ECDC4,#45B7D1)","#0f0f13"), opacity:authLoading?.7:1}}>
            {authLoading ? "Aguarde..." : authMode==="login" ? "Entrar" : "Criar conta"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{...s.page, padding:"0 0 3rem"}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}input,select{outline:none}button{transition:opacity .15s}button:hover{opacity:.85}`}</style>

      {/* Header */}
      <div style={{background:"#1a1a24", borderBottom:"1px solid #ffffff10", padding:"1rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, backdropFilter:"blur(10px)"}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{fontSize:22}}>💰</span>
          <div>
            <h1 style={{fontSize:16, fontWeight:700, margin:0, background:"linear-gradient(135deg,#4ECDC4,#45B7D1)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>Finanças Pessoais</h1>
            <p style={{fontSize:11, color:"#666", margin:0}}>{user.email}</p>
          </div>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <button onClick={exportCSV} style={{...s.btn("#ffffff10","#ccc"), padding:"7px 12px", fontSize:12}}>Exportar CSV</button>
          <button onClick={()=>signOut(auth)} style={{...s.btn("#FF6B6B20","#FF6B6B"), padding:"7px 12px", fontSize:12}}>Sair</button>
        </div>
      </div>

      <div style={{maxWidth:700, margin:"0 auto", padding:"1.25rem 1rem", animation:"fadeIn .3s ease"}}>

        {/* Seletor mes/ano */}
        <div style={{display:"flex", gap:8, marginBottom:"1.25rem", alignItems:"center", flexWrap:"wrap"}}>
          {[["dashboard","📊 Visão geral"],["lancamento","➕ Lançar"],["historico","📋 Histórico"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"8px 16px", borderRadius:20, border:"none", cursor:"pointer", fontSize:13, fontWeight:500, background:view===v?"linear-gradient(135deg,#4ECDC4,#45B7D1)":"#1a1a24", color:view===v?"#0f0f13":"#888", border:view===v?"none":"1px solid #ffffff10"}}>
              {l}
            </button>
          ))}
          <div style={{marginLeft:"auto", display:"flex", gap:6}}>
            <select value={mes} onChange={e=>setMes(+e.target.value)} style={{...s.input, width:"auto", padding:"6px 10px", fontSize:12}}>
              {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <select value={ano} onChange={e=>setAno(+e.target.value)} style={{...s.input, width:"auto", padding:"6px 10px", fontSize:12}}>
              {[2023,2024,2025,2026].map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {view==="dashboard" && (
          <div>
            {/* Cards */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:"1.25rem"}}>
              {[["Receitas",fmt(receitas),"#4ECDC4"],["Despesas",fmt(despesas),"#FF6B6B"],["Saldo",fmt(saldo),saldo>=0?"#4ECDC4":"#FF6B6B"]].map(([l,v,c])=>(
                <div key={l} style={{...s.card, textAlign:"center"}}>
                  <p style={{fontSize:11, color:"#666", margin:"0 0 6px", textTransform:"uppercase", letterSpacing:1}}>{l}</p>
                  <p style={{fontSize:15, fontWeight:700, margin:0, color:c}}>{v}</p>
                </div>
              ))}
            </div>

            {/* Projeção */}
            <div style={{...s.card, marginBottom:"1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <p style={{fontSize:11, color:"#666", margin:"0 0 4px", textTransform:"uppercase", letterSpacing:1}}>Projeção do mês</p>
                <p style={{fontSize:18, fontWeight:700, margin:0, color:"#FF6B6B"}}>{fmt(projecao)}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{fontSize:11, color:"#666", margin:0}}>Baseado em {diaAtual} dias</p>
                <p style={{fontSize:11, color: projecao > receitas ? "#FF6B6B":"#4ECDC4", margin:"4px 0 0", fontWeight:500}}>{projecao > receitas ? "⚠️ Acima da receita":"✅ Dentro do orçamento"}</p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:"flex", gap:8, marginBottom:"1rem"}}>
              {[["grafico","Gráficos"],["anual","Relatório anual"]].map(([t,l])=>(
                <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px", borderRadius:20, border:"1px solid #ffffff10", cursor:"pointer", fontSize:12, background:tab===t?"#4ECDC4":"transparent", color:tab===t?"#0f0f13":"#888"}}>
                  {l}
                </button>
              ))}
            </div>

            {tab==="grafico" && <>
              {porCat.length > 0 ? (
                <div style={{...s.card, marginBottom:"1.25rem"}}>
                  <p style={{fontSize:13, fontWeight:600, margin:"0 0 1rem", color:"#ccc"}}>Despesas por categoria</p>
                  <div style={{display:"flex", gap:"1.5rem", alignItems:"center"}}>
                    <div style={{position:"relative", width:140, height:140, flexShrink:0}}>
                      <canvas ref={pieRef} />
                      <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}>
                        <p style={{fontSize:10, color:"#666", margin:0}}>Total</p>
                        <p style={{fontSize:13, fontWeight:700, margin:0, color:"#FF6B6B"}}>{fmt(despesas)}</p>
                      </div>
                    </div>
                    <div style={{flex:1}}>
                      {porCat.map(c=>(
                        <div key={c.id} style={{marginBottom:10}}>
                          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
                            <span style={{width:8, height:8, borderRadius:2, background:c.color, flexShrink:0}} />
                            <span style={{fontSize:12, color:"#888", flex:1}}>{c.label}</span>
                            <span style={{fontSize:12, fontWeight:600, color:"#ccc"}}>{fmt(c.total)}</span>
                          </div>
                          <div style={{height:3, background:"#ffffff10", borderRadius:4}}>
                            <div style={{height:3, borderRadius:4, background:c.color, width:((c.total/despesas)*100)+"%", transition:"width .5s ease"}} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : <div style={{...s.card, textAlign:"center", padding:"2rem", marginBottom:"1.25rem"}}><p style={{color:"#555", margin:0}}>Nenhuma despesa lançada neste mês.</p></div>}

              <div style={{...s.card}}>
                <p style={{fontSize:13, fontWeight:600, margin:"0 0 .75rem", color:"#ccc"}}>Últimos 6 meses</p>
                <div style={{display:"flex", gap:16, fontSize:11, color:"#666", marginBottom:10}}>
                  <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"#4ECDC4",marginRight:4}}/>Receitas</span>
                  <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"#FF6B6B",marginRight:4}}/>Despesas</span>
                </div>
                <div style={{height:180}}><canvas ref={barRef} /></div>
              </div>
            </>}
          </div>
        )}

        {view==="lancamento" && (
          <div style={{...s.card, display:"grid", gap:12, animation:"fadeIn .3s ease"}}>
            <p style={{fontSize:15, fontWeight:600, margin:0, color:"#ccc"}}>Novo lançamento</p>
            <div style={{display:"flex", gap:8}}>
              {["despesa","receita"].map(t=>(
                <button key={t} onClick={()=>setForm(f=>({...f,tipo:t}))} style={{flex:1, padding:"10px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background:form.tipo===t?(t==="despesa"?"linear-gradient(135deg,#FF6B6B,#ee5a5a)":"linear-gradient(135deg,#4ECDC4,#45B7D1)"):"#0f0f13", color:form.tipo===t?"#fff":"#555", transition:"all .2s"}}>
                  {t==="despesa"?"💸 Despesa":"💰 Receita"}
                </button>
              ))}
            </div>
            <input placeholder="Descrição" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={s.input} />
            <input placeholder="Valor (R$)" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} type="number" min="0" style={s.input} />
            <select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))} style={s.input}>
              {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={s.input} />
            <button onClick={addTx} disabled={saving} style={{...s.btn("linear-gradient(135deg,#4ECDC4,#45B7D1)","#0f0f13"), opacity:saving?.7:1}}>
              {saving ? "Salvando..." : "Adicionar lançamento"}
            </button>
          </div>
        )}

        {view==="historico" && (
          <div style={{animation:"fadeIn .3s ease"}}>
            <input placeholder="🔍 Buscar por descrição ou categoria..." value={busca} onChange={e=>setBusca(e.target.value)} style={{...s.input, marginBottom:"1rem"}} />
            {txFiltradas.length===0
              ? <div style={{...s.card, textAlign:"center", padding:"2rem"}}><p style={{color:"#555", margin:0}}>Nenhum lançamento encontrado.</p></div>
              : txFiltradas.map(t=>{
                const cat = CATS.find(c=>c.id===t.cat);
                return (
                  <div key={t.id} style={{...s.card, display:"flex", alignItems:"center", gap:12, marginBottom:8, transition:"transform .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.transform="translateX(4px)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
                    <div style={{width:36, height:36, borderRadius:10, background:cat?.color+"20", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                      <span style={{width:10, height:10, borderRadius:3, background:cat?.color}} />
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <p style={{margin:0, fontSize:14, fontWeight:500, color:"#e0e0e0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{t.desc}</p>
                      <p style={{margin:0, fontSize:11, color:"#555"}}>{cat?.label} · {new Date(t.data+"T12:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span style={{fontWeight:700, fontSize:14, color:t.tipo==="receita"?"#4ECDC4":"#FF6B6B", whiteSpace:"nowrap"}}>{t.tipo==="receita"?"+":"-"}{fmt(t.valor)}</span>
                    <button onClick={()=>setConfirmDel(t.id)} style={{background:"#FF6B6B20", border:"none", cursor:"pointer", color:"#FF6B6B", fontSize:16, width:30, height:30, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center"}}>×</button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {confirmDel && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)"}}>
          <div style={{...s.card, maxWidth:300, width:"90%", textAlign:"center", animation:"fadeIn .2s ease"}}>
            <p style={{fontSize:16, margin:"0 0 1.5rem", color:"#e0e0e0"}}>Excluir este lançamento?</p>
            <div style={{display:"flex", gap:8}}>
              <button onClick={()=>setConfirmDel(null)} style={{...s.btn("#ffffff10","#888"), flex:1}}>Cancelar</button>
              <button onClick={()=>delTx(confirmDel)} style={{...s.btn("linear-gradient(135deg,#FF6B6B,#ee5a5a)"), flex:1}}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}