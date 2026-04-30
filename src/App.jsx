import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup
} from "firebase/auth";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from "firebase/firestore";

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
  const [dark, setDark] = useState(() => localStorage.getItem("fp_theme") !== "light");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [txs, setTxs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [mes, setMes] = useState(new Date().getMonth());
  const [ano, setAno] = useState(new Date().getFullYear());
  const [busca, setBusca] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({ tipo: "despesa", valor: "", desc: "", cat: "alimentacao", data: today() });
  const [saving, setSaving] = useState(false);
  const pieRef = useRef(null);
  const barRef = useRef(null);
  const [chartLib, setChartLib] = useState(false);

  const th = dark ? {
    bg: "#0f0f13", card: "#1a1a24", border: "#ffffff10", text: "#f0f0f0",
    sub: "#888", input: "#0f0f13", inputBorder: "#ffffff20",
    accent: "#4ECDC4", accentGrad: "linear-gradient(135deg,#4ECDC4,#45B7D1)",
    danger: "#FF6B6B", muted: "#555", btnSecondary: "#ffffff10", btnSecondaryText: "#aaa"
  } : {
    bg: "#f5f5f7", card: "#ffffff", border: "#e5e5ea", text: "#1a1a1a",
    sub: "#666", input: "#ffffff", inputBorder: "#d1d1d6",
    accent: "#007AFF", accentGrad: "linear-gradient(135deg,#007AFF,#5856D6)",
    danger: "#FF3B30", muted: "#bbb", btnSecondary: "#f0f0f0", btnSecondaryText: "#666"
  };

  useEffect(() => { localStorage.setItem("fp_theme", dark ? "dark" : "light"); }, [dark]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transacoes"), where("uid","==",user.uid), orderBy("data","desc"));
    const unsub = onSnapshot(q, snap => setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!window.Chart) {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      sc.onload = () => setChartLib(true);
      document.head.appendChild(sc);
    } else setChartLib(true);
  }, []);

  const txMes = txs.filter(tx => {
    const d = new Date(tx.data+"T12:00:00");
    return d.getMonth()===mes && d.getFullYear()===ano;
  });
  const receitas = txMes.filter(t=>t.tipo==="receita").reduce((s,t)=>s+t.valor,0);
  const despesas = txMes.filter(t=>t.tipo==="despesa").reduce((s,t)=>s+t.valor,0);
  const saldo = receitas - despesas;
  const porCat = CATS.map(c=>({...c, total: txMes.filter(t=>t.tipo==="despesa"&&t.cat===c.id).reduce((s,t)=>s+t.valor,0)})).filter(c=>c.total>0);
  const hoje = new Date();
  const diasMes = new Date(ano,mes+1,0).getDate();
  const diaAtual = (mes===hoje.getMonth()&&ano===hoje.getFullYear()) ? hoje.getDate() : diasMes;
  const projecao = diaAtual > 0 ? (despesas/diaAtual)*diasMes : 0;
  const txFiltradas = txMes.filter(tx => busca===""||tx.desc.toLowerCase().includes(busca.toLowerCase())||CATS.find(c=>c.id===tx.cat)?.label.toLowerCase().includes(busca.toLowerCase()));

  useEffect(() => {
    if (!chartLib || view !== "dashboard") return;
    setTimeout(() => {
      const gridColor = dark ? "#ffffff15" : "#00000010";
      const tickColor = dark ? "#888" : "#999";
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
            { label:"Receitas", data: ult.map(x=>txs.filter(t=>{const d=new Date(t.data+"T12:00:00");return d.getMonth()===x.m&&d.getFullYear()===x.a&&t.tipo==="receita";}).reduce((s,t)=>s+t.valor,0)), backgroundColor: th.accent, borderRadius: 6 },
            { label:"Despesas", data: ult.map(x=>txs.filter(t=>{const d=new Date(t.data+"T12:00:00");return d.getMonth()===x.m&&d.getFullYear()===x.a&&t.tipo==="despesa";}).reduce((s,t)=>s+t.valor,0)), backgroundColor: th.danger, borderRadius: 6 }
          ]},
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: tickColor }, grid: { display: false } }, y: { ticks: { color: tickColor }, grid: { color: gridColor } } } }
        });
      }
    }, 100);
  }, [chartLib, view, txs, mes, ano, dark]);

  async function handleAuth() {
    setAuthErr(""); setAuthLoading(true);
    try {
      if (authMode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
      } else if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email, senha);
      } else {
        await createUserWithEmailAndPassword(auth, email, senha);
      }
    } catch(e) {
      const msgs = {
        "auth/user-not-found": "E-mail não encontrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/email-already-in-use": "E-mail já cadastrado.",
        "auth/weak-password": "Use ao menos 6 caracteres.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/invalid-credential": "E-mail ou senha incorretos.",
      };
      setAuthErr(msgs[e.code] || "Erro ao autenticar.");
    }
    setAuthLoading(false);
  }

  async function handleGoogle() {
    setAuthErr(""); setAuthLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch(e) {
      setAuthErr("Erro ao entrar com Google. Tente novamente.");
    }
    setAuthLoading(false);
  }

  async function addTx() {
    const v = parseFloat(form.valor.replace(",","."));
    if (!v||v<=0||!form.desc.trim()) return;
    setSaving(true);
    await addDoc(collection(db,"transacoes"), { ...form, valor:v, uid:user.uid, criadoEm:new Date() });
    setForm(f=>({...f, valor:"", desc:""}));
    setSaving(false);
  }

  async function delTx(id) {
    await deleteDoc(doc(db,"transacoes",id));
    setConfirmDel(null);
  }

  function exportCSV() {
    const h = "Data,Tipo,Categoria,Descrição,Valor\n";
    const r = txs.map(t=>`${t.data},${t.tipo},${CATS.find(c=>c.id===t.cat)?.label},${t.desc},${t.valor}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h+r],{type:"text/csv"}));
    a.download = "financas.csv";
    a.click();
  }

  const inp = { width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${th.inputBorder}`, background:th.input, color:th.text, fontSize:14, outline:"none" };
  const card = { background:th.card, borderRadius:16, padding:"1.25rem", border:`1px solid ${th.border}` };
  const btn = (bg, col) => ({ padding:"11px", borderRadius:10, border:"none", background:bg, color:col||"#fff", fontWeight:600, fontSize:14, cursor:"pointer", width:"100%" });

  if (loading) return (
    <div style={{minHeight:"100vh", background:th.bg, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:40,height:40,border:`3px solid ${th.border}`,borderTop:`3px solid ${th.accent}`,borderRadius:"50%",animation:"spin 1s linear infinite"}} />
    </div>
  );

  if (!user) return (
    <div style={{minHeight:"100vh", background:th.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem"}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{...card, width:"100%", maxWidth:400, animation:"fadeIn .4s ease"}}>

        <div style={{display:"flex", justifyContent:"flex-end", marginBottom:"1rem"}}>
          <button onClick={()=>setDark(d=>!d)} style={{background:"none", border:`1px solid ${th.border}`, borderRadius:8, padding:"6px 12px", cursor:"pointer", color:th.sub, fontSize:13}}>
            {dark ? "☀️ Claro" : "🌙 Escuro"}
          </button>
        </div>

        <div style={{textAlign:"center", marginBottom:"1.5rem"}}>
          <div style={{fontSize:40, marginBottom:8}}>💰</div>
          <h1 style={{fontSize:22, fontWeight:700, margin:"0 0 4px", background:th.accentGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>Finanças Pessoais</h1>
          <p style={{color:th.sub, fontSize:13, margin:0}}>Controle seu dinheiro com inteligência</p>
        </div>

        {authMode !== "reset" && (
          <div style={{display:"flex", background:dark?"#0f0f13":"#f0f0f0", borderRadius:10, padding:4, marginBottom:"1.25rem"}}>
            {["login","cadastro"].map(m=>(
              <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");setResetSent(false);}} style={{flex:1, padding:"8px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:500, background:authMode===m?th.accentGrad:"transparent", color:authMode===m?"#fff":th.sub}}>
                {m==="login"?"Entrar":"Cadastrar"}
              </button>
            ))}
          </div>
        )}

        {authMode === "reset" && (
          <div style={{marginBottom:"1rem"}}>
            <button onClick={()=>{setAuthMode("login");setAuthErr("");setResetSent(false);}} style={{background:"none", border:"none", cursor:"pointer", color:th.sub, fontSize:13, padding:0}}>← Voltar</button>
            <p style={{fontSize:15, fontWeight:600, color:th.text, margin:"8px 0 4px"}}>Recuperar senha</p>
            <p style={{fontSize:12, color:th.sub, margin:0}}>Enviaremos um link para seu e-mail.</p>
          </div>
        )}

        {resetSent ? (
          <div style={{textAlign:"center", padding:"1rem", background:th.accent+"20", borderRadius:10}}>
            <p style={{color:th.accent, fontSize:14, margin:0}}>✅ E-mail enviado! Verifique sua caixa de entrada.</p>
          </div>
        ) : (
          <div style={{display:"grid", gap:12}}>
            <input placeholder="E-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
            {authMode !== "reset" && (
              <input placeholder="Senha" type="password" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAuth()} style={inp} />
            )}
            {authErr && <p style={{color:th.danger, fontSize:13, margin:0, textAlign:"center"}}>{authErr}</p>}
            <button onClick={handleAuth} disabled={authLoading} style={btn(th.accentGrad)}>
              {authLoading?"Aguarde...":authMode==="login"?"Entrar":authMode==="cadastro"?"Criar conta":"Enviar link de recuperação"}
            </button>

            {authMode !== "reset" && (
              <>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <div style={{flex:1, height:1, background:th.border}} />
                  <span style={{color:th.sub, fontSize:12}}>ou</span>
                  <div style={{flex:1, height:1, background:th.border}} />
                </div>
                <button onClick={handleGoogle} disabled={authLoading} style={{...btn(dark?"#1a1a24":"#ffffff", th.text), border:`1px solid ${th.border}`, display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continuar com Google
                </button>
                {authMode === "login" && (
                  <button onClick={()=>{setAuthMode("reset");setAuthErr("");}} style={{background:"none", border:"none", cursor:"pointer", color:th.sub, fontSize:12, textDecoration:"underline"}}>
                    Esqueci minha senha
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh", background:th.bg, color:th.text, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>

      <div style={{background:th.card, borderBottom:`1px solid ${th.border}`, padding:"1rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{fontSize:22}}>💰</span>
          <div>
            <h1 style={{fontSize:16, fontWeight:700, margin:0, background:th.accentGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>Finanças Pessoais</h1>
            <p style={{fontSize:11, color:th.sub, margin:0}}>{user.email || user.displayName}</p>
          </div>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button onClick={()=>setDark(d=>!d)} style={{background:"none", border:`1px solid ${th.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", color:th.sub, fontSize:14}}>{dark?"☀️":"🌙"}</button>
          <button onClick={exportCSV} style={{background:th.btnSecondary, border:"none", borderRadius:8, padding:"7px 12px", cursor:"pointer", color:th.btnSecondaryText, fontSize:12, fontWeight:500}}>CSV</button>
          <button onClick={()=>signOut(auth)} style={{background:th.danger+"20", border:"none", borderRadius:8, padding:"7px 12px", cursor:"pointer", color:th.danger, fontSize:12, fontWeight:500}}>Sair</button>
        </div>
      </div>

      <div style={{maxWidth:700, margin:"0 auto", padding:"1.25rem 1rem", animation:"fadeIn .3s ease"}}>
        <div style={{display:"flex", gap:8, marginBottom:"1.25rem", alignItems:"center", flexWrap:"wrap"}}>
          {[["dashboard","📊 Visão geral"],["lancamento","➕ Lançar"],["historico","📋 Histórico"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"8px 16px", borderRadius:20, cursor:"pointer", fontSize:13, fontWeight:500, background:view===v?th.accentGrad:th.card, color:view===v?"#fff":th.sub, border:view===v?"none":`1px solid ${th.border}`}}>
              {l}
            </button>
          ))}
          <div style={{marginLeft:"auto", display:"flex", gap:6}}>
            <select value={mes} onChange={e=>setMes(+e.target.value)} style={{...inp, width:"auto", padding:"6px 10px", fontSize:12}}>
              {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <select value={ano} onChange={e=>setAno(+e.target.value)} style={{...inp, width:"auto", padding:"6px 10px", fontSize:12}}>
              {[2023,2024,2025,2026].map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {view==="dashboard" && (
          <div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:"1.25rem"}}>
              {[["Receitas",fmt(receitas),th.accent],["Despesas",fmt(despesas),th.danger],["Saldo",fmt(saldo),saldo>=0?th.accent:th.danger]].map(([l,v,c])=>(
                <div key={l} style={{...card, textAlign:"center"}}>
                  <p style={{fontSize:11, color:th.sub, margin:"0 0 6px", textTransform:"uppercase", letterSpacing:1}}>{l}</p>
                  <p style={{fontSize:15, fontWeight:700, margin:0, color:c}}>{v}</p>
                </div>
              ))}
            </div>

            <div style={{...card, marginBottom:"1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <p style={{fontSize:11, color:th.sub, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:1}}>Projeção do mês</p>
                <p style={{fontSize:18, fontWeight:700, margin:0, color:th.danger}}>{fmt(projecao)}</p>
              </div>
              <p style={{fontSize:12, color:projecao>receitas?th.danger:th.accent, fontWeight:500, margin:0}}>{projecao>receitas?"⚠️ Acima da receita":"✅ No orçamento"}</p>
            </div>

            {porCat.length > 0 ? (
              <div style={{...card, marginBottom:"1.25rem"}}>
                <p style={{fontSize:13, fontWeight:600, margin:"0 0 1rem", color:th.text}}>Despesas por categoria</p>
                <div style={{display:"flex", gap:"1.5rem", alignItems:"center"}}>
                  <div style={{position:"relative", width:140, height:140, flexShrink:0}}>
                    <canvas ref={pieRef} />
                    <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}>
                      <p style={{fontSize:10, color:th.sub, margin:0}}>Total</p>
                      <p style={{fontSize:12, fontWeight:700, margin:0, color:th.danger}}>{fmt(despesas)}</p>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    {porCat.map(c=>(
                      <div key={c.id} style={{marginBottom:10}}>
                        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
                          <span style={{width:8, height:8, borderRadius:2, background:c.color, flexShrink:0}} />
                          <span style={{fontSize:12, color:th.sub, flex:1}}>{c.label}</span>
                          <span style={{fontSize:12, fontWeight:600, color:th.text}}>{fmt(c.total)}</span>
                        </div>
                        <div style={{height:3, background:th.border, borderRadius:4}}>
                          <div style={{height:3, borderRadius:4, background:c.color, width:((c.total/despesas)*100)+"%"}} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{...card, textAlign:"center", padding:"2rem", marginBottom:"1.25rem"}}>
                <p style={{color:th.muted, margin:0}}>Nenhuma despesa neste mês.</p>
              </div>
            )}

            <div style={card}>
              <p style={{fontSize:13, fontWeight:600, margin:"0 0 .75rem", color:th.text}}>Últimos 6 meses</p>
              <div style={{display:"flex", gap:16, fontSize:11, color:th.sub, marginBottom:10}}>
                <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:th.accent,marginRight:4}}/>Receitas</span>
                <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:th.danger,marginRight:4}}/>Despesas</span>
              </div>
              <div style={{height:180}}><canvas ref={barRef} /></div>
            </div>
          </div>
        )}

        {view==="lancamento" && (
          <div style={{...card, display:"grid", gap:12}}>
            <p style={{fontSize:15, fontWeight:600, margin:0, color:th.text}}>Novo lançamento</p>
            <div style={{display:"flex", gap:8}}>
              {["despesa","receita"].map(tp=>(
                <button key={tp} onClick={()=>setForm(f=>({...f,tipo:tp}))} style={{flex:1, padding:"10px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background:form.tipo===tp?(tp==="despesa"?`linear-gradient(135deg,${th.danger},#ee5a5a)`:th.accentGrad):th.btnSecondary, color:form.tipo===tp?"#fff":th.sub}}>
                  {tp==="despesa"?"💸 Despesa":"💰 Receita"}
                </button>
              ))}
            </div>
            <input placeholder="Descrição" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={inp} />
            <input placeholder="Valor (R$)" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} type="number" min="0" style={inp} />
            <select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))} style={inp}>
              {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={inp} />
            <button onClick={addTx} disabled={saving} style={{...btn(th.accentGrad), opacity:saving?.7:1}}>
              {saving?"Salvando...":"Adicionar lançamento"}
            </button>
          </div>
        )}

        {view==="historico" && (
          <div>
            <input placeholder="🔍 Buscar..." value={busca} onChange={e=>setBusca(e.target.value)} style={{...inp, marginBottom:"1rem"}} />
            {txFiltradas.length===0
              ? <div style={{...card, textAlign:"center", padding:"2rem"}}><p style={{color:th.muted, margin:0}}>Nenhum lançamento encontrado.</p></div>
              : txFiltradas.map(tx=>{
                const cat = CATS.find(c=>c.id===tx.cat);
                return (
                  <div key={tx.id} style={{...card, display:"flex", alignItems:"center", gap:12, marginBottom:8}}>
                    <div style={{width:36, height:36, borderRadius:10, background:cat?.color+"30", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                      <span style={{width:10, height:10, borderRadius:3, background:cat?.color}} />
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <p style={{margin:0, fontSize:14, fontWeight:500, color:th.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{tx.desc}</p>
                      <p style={{margin:0, fontSize:11, color:th.sub}}>{cat?.label} · {new Date(tx.data+"T12:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span style={{fontWeight:700, fontSize:14, color:tx.tipo==="receita"?th.accent:th.danger, whiteSpace:"nowrap"}}>{tx.tipo==="receita"?"+":"-"}{fmt(tx.valor)}</span>
                    <button onClick={()=>setConfirmDel(tx.id)} style={{background:th.danger+"20", border:"none", cursor:"pointer", color:th.danger, fontSize:16, width:30, height:30, borderRadius:8}}>×</button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {confirmDel && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100}}>
          <div style={{...card, maxWidth:300, width:"90%", textAlign:"center"}}>
            <p style={{fontSize:16, margin:"0 0 1.5rem", color:th.text}}>Excluir este lançamento?</p>
            <div style={{display:"flex", gap:8}}>
              <button onClick={()=>setConfirmDel(null)} style={{...btn(th.btnSecondary, th.sub), flex:1}}>Cancelar</button>
              <button onClick={()=>delTx(confirmDel)} style={{...btn(`linear-gradient(135deg,${th.danger},#ee5a5a)`), flex:1}}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}