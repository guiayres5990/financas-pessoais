import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider,
  signInWithRedirect, getRedirectResult
} from "firebase/auth";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from "firebase/firestore";
import Relatorio from "./Relatorio";
import Landing from "./Landing";
import { T, LANGS } from "./i18n";

export const CATS_BASE = [
  { id: "moradia",     cor: "var(--cat-moradia)" },
  { id: "alimentacao", cor: "var(--cat-alimentacao)" },
  { id: "transporte",  cor: "var(--cat-transporte)" },
  { id: "lazer",       cor: "var(--cat-lazer)" },
  { id: "saude",       cor: "var(--cat-saude)" },
  { id: "educacao",    cor: "var(--cat-educacao)" },
  { id: "outros",      cor: "var(--cat-outros)" },
];

const MESES = {
  pt: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  es: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
};
const MES_CURTO = {
  pt: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  es: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
};

export const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => new Date().toISOString().slice(0, 10);

function LangPicker({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const atual = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-secondary" style={{ gap: 6, fontSize: 13 }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 16 }}>{atual.flag}</span>
        <span>{atual.label}</span>
        <i className="ph ph-caret-down" style={{ fontSize: 12 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
          background: "var(--color-surface)", border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-md)", overflow: "hidden", minWidth: 150,
          boxShadow: "var(--shadow-md)"
        }}>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 14px", border: "none",
              background: l.code === lang ? "var(--color-accent-900)" : "transparent",
              color: l.code === lang ? "var(--color-accent-200)" : "var(--color-text)",
              cursor: "pointer", fontSize: 14, fontFamily: "inherit", textAlign: "left"
            }}>
              <span style={{ fontSize: 18 }}>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [lang, setLangState] = useState(() => localStorage.getItem("fp_lang") || "pt");
  const [dark, setDark] = useState(() => localStorage.getItem("fp_theme") !== "light");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tela, setTela] = useState("landing");
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
  const [privado, setPrivado] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({ tipo: "despesa", valor: "", desc: "", cat: "alimentacao", data: hoje() });
  const [saving, setSaving] = useState(false);

  // traduções e categorias derivadas do idioma
  const tr = T[lang] || T["pt"];
  const CATS = CATS_BASE.map(c => ({ ...c, label: tr[c.id] || c.id }));
  const getCat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];

  const VIEWS = !tr ? [] : [
    ["dashboard", tr.dashboard, "ph ph-chart-donut",  tr.dashDesc],
    ["lancar",    tr.lancar,    "ph ph-plus-circle",   tr.lancarDesc],
    ["historico", tr.historico, "ph ph-list-dashes",   tr.historicoDesc],
    ["relatorio", tr.relatorio, "ph ph-file-text",     tr.relatorioDesc],
  ];

  function setLang(code) {
    setLangState(code);
    localStorage.setItem("fp_lang", code);
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("fp_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false); }), []);
  useEffect(() => { getRedirectResult(auth).catch(() => {}); }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transacoes"), where("uid","==",user.uid), orderBy("data","desc"));
    return onSnapshot(q, snap => setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const money = v => (privado ? "R$ ••••" : fmt(v));

  const txMes = txs.filter(tx => {
    const d = new Date(tx.data + "T12:00:00");
    return d.getMonth() === mes && d.getFullYear() === ano;
  });
  const receitas = txMes.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
  const despesas = txMes.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
  const saldo = receitas - despesas;
  const porCat = CATS.map(c => ({ ...c, total: txMes.filter(tx => tx.tipo === "despesa" && tx.cat === c.id).reduce((s, tx) => s + tx.valor, 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const agora = new Date();
  const diasMes = new Date(ano, mes + 1, 0).getDate();
  const diaAtual = (mes === agora.getMonth() && ano === agora.getFullYear()) ? agora.getDate() : diasMes;
  const projecao = diaAtual > 0 ? (despesas / diaAtual) * diasMes : 0;
  const projPct = receitas > 0 ? Math.min(100, Math.round((projecao / receitas) * 100)) : 0;
  const txFiltradas = txMes.filter(tx => busca === "" || tx.desc.toLowerCase().includes(busca.toLowerCase()) || getCat(tx.cat).label.toLowerCase().includes(busca.toLowerCase()));

  const donut = (() => {
    if (!porCat.length) return "conic-gradient(var(--color-neutral-900) 0 100%)";
    let acc = 0;
    const stops = porCat.map(c => {
      const de = (acc / despesas) * 100;
      acc += c.total;
      return `${c.cor} ${de.toFixed(2)}% ${((acc / despesas) * 100).toFixed(2)}%`;
    });
    return `conic-gradient(from -90deg, ${stops.join(", ")})`;
  })();

  const ultimos6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ano, mes - 5 + i, 1);
    const m = d.getMonth(), a = d.getFullYear();
    const dos = txs.filter(tx => { const td = new Date(tx.data + "T12:00:00"); return td.getMonth() === m && td.getFullYear() === a; });
    return {
      label: MES_CURTO[lang][m],
      r: dos.filter(tx => tx.tipo === "receita").reduce((s, tx) => s + tx.valor, 0),
      d: dos.filter(tx => tx.tipo === "despesa").reduce((s, tx) => s + tx.valor, 0),
    };
  });
  const maxBar = Math.max(1, ...ultimos6.map(m => Math.max(m.r, m.d)));

  async function handleAuth() {
    setAuthErr(""); setAuthLoading(true);
    try {
      if (authMode === "reset") { await sendPasswordResetEmail(auth, email); setResetSent(true); }
      else if (authMode === "login") await signInWithEmailAndPassword(auth, email, senha);
      else await createUserWithEmailAndPassword(auth, email, senha);
    } catch (e) {
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
    try { await signInWithRedirect(auth, new GoogleAuthProvider()); }
    catch { setAuthErr(tr.erroGoogle); setAuthLoading(false); }
  }

  async function addTx() {
    const v = parseFloat(String(form.valor).replace(",", "."));
    if (!v || v <= 0 || !form.desc.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "transacoes"), { ...form, valor: v, uid: user.uid, criadoEm: new Date() });
    setForm(f => ({ ...f, valor: "", desc: "" }));
    setSaving(false);
    setView("historico");
  }

  async function delTx(id) { await deleteDoc(doc(db, "transacoes", id)); setConfirmDel(null); }

  function exportCSV() {
    const h = "Data,Tipo,Categoria,Descrição,Valor\n";
    const r = txs.map(tx => `${tx.data},${tx.tipo},${getCat(tx.cat).label},${tx.desc},${tx.valor}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h + r], { type: "text/csv" }));
    a.download = "capital-hub.csv";
    a.click();
  }

  function mudaMes(delta) {
    const d = new Date(ano, mes + delta, 1);
    setMes(d.getMonth()); setAno(d.getFullYear());
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid var(--color-neutral-800)", borderTopColor: "var(--color-accent)", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!user) {
    if (tela === "landing") return (
      <Landing dark={dark} lang={lang} setLang={setLang} t={tr}
        onToggleTheme={() => setDark(d => !d)}
        onEntrar={() => { setAuthMode("login"); setTela("auth"); }}
        onCriarConta={(mail) => { if (typeof mail === "string" && mail) setEmail(mail); setAuthMode("cadastro"); setTela("auth"); }}
      />
    );

    return (
      <div className="auth">
        <aside className="auth-aside">
          <span className="brand"><img src="/marca-capitalhub-accent.png" alt="" />Capital Hub</span>
          <div>
            <h2 style={{ maxWidth: "18ch", marginBottom: 14 }}>{tr.tagline}</h2>
          </div>
          <button className="btn btn-ghost" style={{ justifySelf: "start" }} onClick={() => setTela("landing")}>
            <i className="ph ph-arrow-left" /> {tr.voltar}
          </button>
        </aside>

        <div className="auth-form">
          <div className="inner">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <LangPicker lang={lang} setLang={setLang} />
            </div>

            {authMode === "reset" ? (
              <>
                <button className="btn btn-ghost" onClick={() => { setAuthMode("login"); setAuthErr(""); setResetSent(false); }}>
                  <i className="ph ph-arrow-left" /> {tr.voltar}
                </button>
                <h3 style={{ margin: "14px 0 6px" }}>{tr.recuperarSenha}</h3>
                <p style={{ fontSize: 14, color: "var(--color-neutral-500)" }}>{tr.recuperarDesc}</p>
              </>
            ) : (
              <>
                <h3 style={{ margin: "0 0 6px" }}>{authMode === "login" ? tr.entrar : tr.criarConta}</h3>
                <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--color-neutral-500)" }}>{tr.tagline}</p>
                <div className="seg" style={{ marginBottom: 24 }}>
                  {[["login", tr.entrar], ["cadastro", tr.criarConta]].map(([m, l]) => (
                    <button key={m} className="seg-opt" aria-pressed={authMode === m}
                      onClick={() => { setAuthMode(m); setAuthErr(""); setResetSent(false); }}>{l}</button>
                  ))}
                </div>
              </>
            )}

            {resetSent ? (
              <div className="proj-note">
                <i className="ph ph-check-circle" style={{ fontSize: 18, color: "var(--color-accent-300)" }} />
                <p>{tr.emailEnviado}</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="field">
                  <label>E-mail</label>
                  <input className="input" type="email" value={email} placeholder={tr.emailPlaceholder} onChange={e => setEmail(e.target.value)} />
                </div>
                {authMode !== "reset" && (
                  <div className="field">
                    <label>{tr.senhaPlaceholder}</label>
                    <input className="input" type="password" value={senha} placeholder={tr.senhaPlaceholder} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} />
                  </div>
                )}
                {authErr && <p style={{ margin: 0, fontSize: 13, color: "var(--color-negative)" }}>{authErr}</p>}
                <button className="btn btn-primary btn-block" style={{ padding: 11 }} disabled={authLoading} onClick={handleAuth}>
                  {authLoading ? tr.aguarde : authMode === "login" ? tr.entrar : authMode === "cadastro" ? tr.criarMinhaConta : tr.enviarLink}
                </button>
              </div>
            )}

            {authMode !== "reset" && !resetSent && (
              <>
                <div className="or-row"><div /><span>ou</span><div /></div>
                <button className="btn btn-secondary btn-block" style={{ padding: 11, gap: 10 }} disabled={authLoading} onClick={handleGoogle}>
                  <i className="ph ph-google-logo" style={{ fontSize: 17 }} /> {tr.continuarGoogle}
                </button>
                {authMode === "login" && (
                  <p style={{ margin: "20px 0 0", textAlign: "center" }}>
                    <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { setAuthMode("reset"); setAuthErr(""); }}>
                      {tr.esqueciSenha}
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const vAtual = VIEWS.find(v => v[0] === view) || VIEWS[0];
  const inicial = (user.email || user.displayName || "?").slice(0, 2).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <span className="brand brand-sm"><img src="/marca-capitalhub-accent.png" alt="" /><span>Capital Hub</span></span>
        <nav className="side-nav">
          {VIEWS.map(([id, label, icon]) => (
            <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}>
              <i className={icon} style={{ fontSize: 17 }} /> {label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="btn btn-secondary" style={{ justifyContent: "flex-start", gap: 8 }} onClick={exportCSV}>
            <i className="ph ph-download-simple" style={{ fontSize: 16 }} /> {tr.exportarCSV}
          </button>
          <div className="user-chip">
            <span className="avatar">{inicial}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email || user.displayName}</p>
              <p style={{ margin: 0, fontSize: 10, color: "var(--color-neutral-600)" }}>{tr.planoGratuito}</p>
            </div>
            <button className="btn btn-icon btn-ghost" title={tr.sair} onClick={() => signOut(auth)}>
              <i className="ph ph-sign-out" style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <header className="topbar">
          <div style={{ marginRight: "auto" }}>
            <h4 style={{ margin: 0 }}>{vAtual[1]}</h4>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-neutral-600)" }}>{vAtual[3]}</p>
          </div>
          {view !== "relatorio" && (
            <div className="month-picker">
              <button className="btn btn-icon btn-ghost" onClick={() => mudaMes(-1)}><i className="ph ph-caret-left" style={{ fontSize: 14 }} /></button>
              <span>{MESES[lang][mes]} {ano}</span>
              <button className="btn btn-icon btn-ghost" onClick={() => mudaMes(1)}><i className="ph ph-caret-right" style={{ fontSize: 14 }} /></button>
            </div>
          )}
          <button className="btn btn-secondary" style={{ gap: 8 }} onClick={() => setPrivado(p => !p)}>
            <i className={privado ? "ph ph-eye-closed" : "ph ph-eye"} style={{ fontSize: 16 }} />
            {privado ? tr.mostrarValores : tr.ocultarValores}
          </button>
          <LangPicker lang={lang} setLang={setLang} />
          <button className="btn btn-icon btn-secondary" title="Tema" onClick={() => setDark(d => !d)}>
            <i className={dark ? "ph ph-sun" : "ph ph-moon"} style={{ fontSize: 16 }} />
          </button>
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => setView("lancar")}>
            <i className="ph ph-plus" style={{ fontSize: 15 }} /> {tr.novoLancamentoBtn}
          </button>
        </header>

        <div className="content">
          {view === "dashboard" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div className="kpi-row">
                {[
                  [tr.receitas, money(receitas), "var(--color-accent-300)", `${txMes.filter(tx => tx.tipo === "receita").length} ${tr.lancamentos}`],
                  [tr.despesas, money(despesas), "var(--color-negative)", `${txMes.filter(tx => tx.tipo === "despesa").length} ${tr.lancamentos}`],
                  [tr.saldo, money(saldo), saldo >= 0 ? "var(--color-accent-200)" : "var(--color-negative)", saldo >= 0 ? tr.sobrandoMes : tr.acimaReceita],
                ].map(([l, v, cor, nota]) => (
                  <div key={l} className="kpi">
                    <div className="line" style={{ background: `linear-gradient(to right, transparent, ${cor} 28px, ${cor} calc(100% - 28px), transparent)` }} />
                    <p className="kicker">{l}</p>
                    <p className="value" style={{ color: cor }}>{v}</p>
                    <p className="note">{nota}</p>
                  </div>
                ))}
              </div>

              <div className="dash-row">
                <div className="card">
                  <p className="card-title">{tr.despesasPorCategoria}</p>
                  {porCat.length === 0 ? <p className="empty">{tr.nenhuma}</p> : (
                    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                      <div className="donut-wrap">
                        <div className="donut" style={{ background: donut }} />
                        <div className="donut-hole">
                          <div>
                            <p className="kicker" style={{ fontSize: 10 }}>Total</p>
                            <p style={{ margin: "2px 0 0", fontSize: 14, fontFamily: "var(--font-heading)" }}>{money(despesas)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="cat-list">
                        {porCat.map(c => (
                          <div key={c.id} className="cat-row">
                            <div className="cat-head">
                              <span className="dot" style={{ background: c.cor }} />
                              <span className="name">{c.label}</span>
                              <span className="pct">{Math.round((c.total / despesas) * 100)}%</span>
                              <span className="val">{money(c.total)}</span>
                            </div>
                            <div className="bar-track"><div style={{ background: c.cor, width: (c.total / despesas) * 100 + "%" }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p className="card-title" style={{ margin: 0 }}>{tr.projecao}</p>
                  <div>
                    <p style={{ margin: 0, fontSize: 30, fontFamily: "var(--font-heading)", color: "var(--color-negative)" }}>{money(projecao)}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-neutral-500)" }}>{tr.ritmoAtual}</p>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="bar-track" style={{ height: 6, borderRadius: 3 }}>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--color-accent-600)", width: projPct + "%" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-neutral-600)" }}>
                      <span>{projPct}{tr.pctReceita}</span>
                      <span>{tr.receita2} {money(receitas)}</span>
                    </div>
                  </div>
                  <div className="proj-note" style={{ marginTop: "auto" }}>
                    <i className={projecao > receitas ? "ph ph-warning" : "ph ph-check-circle"} style={{ fontSize: 18, color: "var(--color-accent-300)" }} />
                    <p>{projecao > receitas ? tr.projecaoAcima : `${tr.sobraprevista} ${money(Math.max(0, receitas - projecao))}.`}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                  <p className="card-title" style={{ margin: 0, marginRight: "auto" }}>{tr.ultimos6}</p>
                  <div className="legend">
                    <span><i style={{ background: "var(--color-accent-500)" }} />{tr.receitas}</span>
                    <span><i style={{ background: "var(--color-negative-bar)" }} />{tr.despesas}</span>
                  </div>
                </div>
                <div className="bars" style={{ overflow: "hidden" }}>
                  {ultimos6.map((m, i) => (
                    <div className="col" key={i}>
                      <div className="pair">
                        <div style={{ background: "var(--color-accent-500)", height: (m.r / maxBar) * 100 + "%" }} />
                        <div style={{ background: "var(--color-negative-bar)", height: (m.d / maxBar) * 100 + "%" }} />
                      </div>
                      <span className="label">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === "lancar" && (
            <div style={{ maxWidth: 520, display: "grid", gap: 18 }}>
              <div className="card" style={{ display: "grid", gap: 16, padding: 24 }}>
                <div className="seg">
                  {[["despesa", tr.despesa, "ph ph-arrow-down-left"], ["receita", tr.receita, "ph ph-arrow-up-right"]].map(([tp, l, ic]) => (
                    <button key={tp} className="seg-opt" aria-pressed={form.tipo === tp} onClick={() => setForm(f => ({ ...f, tipo: tp }))}>
                      <i className={ic} style={{ fontSize: 15 }} /> {l}
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label>{tr.valor}</label>
                  <div className="valor-field">
                    <span>R$</span>
                    <input inputMode="decimal" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                  </div>
                </div>
                <div className="field">
                  <label>{tr.descricao}</label>
                  <input className="input" placeholder={tr.descPlaceholder} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label>{tr.categoria}</label>
                    <select className="input" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                      {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>{tr.data}</label>
                    <input className="input" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button className="btn btn-primary" style={{ flex: 1, padding: 11 }} disabled={saving} onClick={addTx}>
                    {saving ? tr.salvando : tr.salvar}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: "11px 18px" }} onClick={() => setView("dashboard")}>{tr.cancelar}</button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--color-neutral-600)" }}>{tr.dicaLancamento}</p>
            </div>
          )}

          {view === "historico" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div className="search">
                  <i className="ph ph-magnifying-glass" style={{ fontSize: 16, color: "var(--color-neutral-600)" }} />
                  <input placeholder={tr.buscar} value={busca} onChange={e => setBusca(e.target.value)} />
                </div>
              </div>
              <div className="card" style={{ padding: "8px 12px" }}>
                {txFiltradas.length === 0 ? <p className="empty">{tr.nenhumLanc}</p> : (
                  <table className="table">
                    <thead>
                      <tr><th>{tr.descricao}</th><th>{tr.categoria}</th><th>{tr.data}</th><th style={{ textAlign: "right" }}>{tr.valor}</th><th /></tr>
                    </thead>
                    <tbody>
                      {txFiltradas.map(tx => (
                        <tr key={tx.id}>
                          <td>{tx.desc}</td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--color-neutral-400)" }}>
                              <span style={{ width: 7, height: 7, borderRadius: 2, background: getCat(tx.cat).cor }} />
                              {getCat(tx.cat).label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>{new Date(tx.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                          <td className={"num " + (tx.tipo === "receita" ? "pos" : "neg")}>{tx.tipo === "receita" ? "+" : "−"}{money(tx.valor)}</td>
                          <td style={{ textAlign: "right", width: 40 }}>
                            <button className="btn btn-icon btn-ghost" title={tr.excluir} onClick={() => setConfirmDel(tx)}>
                              <i className="ph ph-trash" style={{ fontSize: 15 }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--color-neutral-600)" }}>
                {txMes.length} {tr.lancamentos} · {money(despesas)} {tr.despesas.toLowerCase()}
              </p>
            </div>
          )}

          {view === "relatorio" && (
            <Relatorio txs={txs} userEmail={user.email || user.displayName} privado={privado} t={tr} />
          )}
        </div>
      </main>

      {confirmDel && (
        <div className="dialog-backdrop" onClick={() => setConfirmDel(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: 0 }}>{tr.excluirTitulo}</h4>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-400)" }}>
              "{confirmDel.desc}", de {new Date(confirmDel.data + "T12:00:00").toLocaleDateString("pt-BR")}. {tr.excluirAviso}
            </p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>{tr.cancelar}</button>
              <button className="btn btn-danger" onClick={() => delTx(confirmDel.id)}>{tr.excluir}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}