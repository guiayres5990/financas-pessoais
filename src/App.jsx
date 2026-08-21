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

export const CATS = [
  { id: "moradia", label: "Moradia", cor: "var(--cat-moradia)" },
  { id: "alimentacao", label: "Alimentação", cor: "var(--cat-alimentacao)" },
  { id: "transporte", label: "Transporte", cor: "var(--cat-transporte)" },
  { id: "lazer", label: "Lazer", cor: "var(--cat-lazer)" },
  { id: "saude", label: "Saúde", cor: "var(--cat-saude)" },
  { id: "educacao", label: "Educação", cor: "var(--cat-educacao)" },
  { id: "outros", label: "Outros", cor: "var(--cat-outros)" },
];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MES_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
export const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => new Date().toISOString().slice(0, 10);
const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];

const VIEWS = [
  ["dashboard", "Visão geral", "ph ph-chart-donut", "Como o mês está indo até aqui"],
  ["lancar", "Lançar", "ph ph-plus-circle", "Menos de doze segundos"],
  ["historico", "Histórico", "ph ph-list-dashes", "Tudo que você registrou no mês"],
  ["relatorio", "Relatório", "ph ph-file-text", "Escolha o período e exporte em PDF"],
];

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("fp_theme") !== "light");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tela, setTela] = useState("landing");        // landing | auth
  const [authMode, setAuthMode] = useState("login");  // login | cadastro | reset
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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("fp_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false); }), []);
  useEffect(() => { getRedirectResult(auth).catch(() => {}); }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transacoes"), where("uid", "==", user.uid), orderBy("data", "desc"));
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
  const porCat = CATS
    .map(c => ({ ...c, total: txMes.filter(t => t.tipo === "despesa" && t.cat === c.id).reduce((s, t) => s + t.valor, 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const agora = new Date();
  const diasMes = new Date(ano, mes + 1, 0).getDate();
  const diaAtual = (mes === agora.getMonth() && ano === agora.getFullYear()) ? agora.getDate() : diasMes;
  const projecao = diaAtual > 0 ? (despesas / diaAtual) * diasMes : 0;
  const projPct = receitas > 0 ? Math.min(100, Math.round((projecao / receitas) * 100)) : 0;
  const txFiltradas = txMes.filter(tx =>
    busca === "" ||
    tx.desc.toLowerCase().includes(busca.toLowerCase()) ||
    cat(tx.cat).label.toLowerCase().includes(busca.toLowerCase())
  );

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
    const dos = txs.filter(t => {
      const td = new Date(t.data + "T12:00:00");
      return td.getMonth() === m && td.getFullYear() === a;
    });
    return {
      label: MES_CURTO[m],
      r: dos.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0),
      d: dos.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0),
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
    catch { setAuthErr("Erro ao entrar com Google."); setAuthLoading(false); }
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
    const r = txs.map(t => `${t.data},${t.tipo},${cat(t.cat).label},${t.desc},${t.valor}`).join("\n");
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
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        border: "2px solid var(--color-neutral-800)", borderTopColor: "var(--color-accent)",
        animation: "spin 1s linear infinite"
      }} />
    </div>
  );

  /* ── visitante ─────────────────────────────────────── */
  if (!user) {
    if (tela === "landing") return (
      <Landing
        dark={dark}
        onToggleTheme={() => setDark(d => !d)}
        onEntrar={() => { setAuthMode("login"); setTela("auth"); }}
        onCriarConta={(mail) => {
          if (typeof mail === "string" && mail) setEmail(mail);
          setAuthMode("cadastro"); setTela("auth");
        }}
      />
    );

    return (
      <div className="auth">
        <aside className="auth-aside">
          <span className="brand">
            <img src="/marca-capitalhub-accent.png" alt="" />
            Capital Hub
          </span>
          <div>
            <h2 style={{ maxWidth: "18ch", marginBottom: 14 }}>O seu dinheiro, explicado por você mesmo.</h2>
            <p style={{ color: "var(--color-neutral-400)", maxWidth: "38ch" }}>
              Entre para continuar de onde parou. Seus lançamentos sincronizam em qualquer aparelho.
            </p>
          </div>
          <button className="btn btn-ghost" style={{ justifySelf: "start" }} onClick={() => setTela("landing")}>
            <i className="ph ph-arrow-left" /> Voltar ao site
          </button>
        </aside>

        <div className="auth-form">
          <div className="inner">
            {authMode === "reset" ? (
              <>
                <button className="btn btn-ghost" onClick={() => { setAuthMode("login"); setAuthErr(""); setResetSent(false); }}>
                  <i className="ph ph-arrow-left" /> Voltar
                </button>
                <h3 style={{ margin: "14px 0 6px" }}>Recuperar senha</h3>
                <p style={{ fontSize: 14, color: "var(--color-neutral-500)" }}>Enviaremos um link para o seu e-mail.</p>
              </>
            ) : (
              <>
                <h3 style={{ margin: "0 0 6px" }}>{authMode === "login" ? "Entrar na sua conta" : "Criar sua conta"}</h3>
                <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--color-neutral-500)" }}>
                  Grátis, sem cartão, com seus dados sincronizados.
                </p>
                <div className="seg" style={{ marginBottom: 24 }}>
                  {[["login", "Entrar"], ["cadastro", "Criar conta"]].map(([m, l]) => (
                    <button key={m} className="seg-opt" aria-pressed={authMode === m}
                      onClick={() => { setAuthMode(m); setAuthErr(""); setResetSent(false); }}>
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}

            {resetSent ? (
              <div className="proj-note">
                <i className="ph ph-check-circle" style={{ fontSize: 18, color: "var(--color-accent-300)" }} />
                <p>E-mail enviado. Confira sua caixa de entrada.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="field">
                  <label>E-mail</label>
                  <input className="input" type="email" value={email} placeholder="seu@email.com"
                    onChange={e => setEmail(e.target.value)} />
                </div>
                {authMode !== "reset" && (
                  <div className="field">
                    <label>Senha</label>
                    <input className="input" type="password" value={senha} placeholder="ao menos 6 caracteres"
                      onChange={e => setSenha(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAuth()} />
                  </div>
                )}
                {authErr && <p style={{ margin: 0, fontSize: 13, color: "var(--color-negative)" }}>{authErr}</p>}
                <button className="btn btn-primary btn-block" style={{ padding: 11 }} disabled={authLoading} onClick={handleAuth}>
                  {authLoading ? "Aguarde…" : authMode === "login" ? "Entrar" : authMode === "cadastro" ? "Criar minha conta" : "Enviar link"}
                </button>
              </div>
            )}

            {authMode !== "reset" && !resetSent && (
              <>
                <div className="or-row"><div /><span>ou</span><div /></div>
                <button className="btn btn-secondary btn-block" style={{ padding: 11, gap: 10 }} disabled={authLoading} onClick={handleGoogle}>
                  <i className="ph ph-google-logo" style={{ fontSize: 17 }} /> Continuar com Google
                </button>
                {authMode === "login" && (
                  <p style={{ margin: "20px 0 0", textAlign: "center" }}>
                    <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { setAuthMode("reset"); setAuthErr(""); }}>
                      Esqueci minha senha
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

  /* ── app ───────────────────────────────────────────── */
  const vAtual = VIEWS.find(v => v[0] === view) || VIEWS[0];
  const inicial = (user.email || user.displayName || "?").slice(0, 2).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <span className="brand brand-sm">
          <img src="/marca-capitalhub-accent.png" alt="" />
          <span>Capital Hub</span>
        </span>

        <nav className="side-nav">
          {VIEWS.map(([id, label, icon]) => (
            <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}>
              <i className={icon} style={{ fontSize: 17 }} /> {label}
            </button>
          ))}
        </nav>

        <div className="side-foot">
          <button className="btn btn-secondary" style={{ justifyContent: "flex-start", gap: 8 }} onClick={exportCSV}>
            <i className="ph ph-download-simple" style={{ fontSize: 16 }} /> Exportar CSV
          </button>
          <div className="user-chip">
            <span className="avatar">{inicial}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email || user.displayName}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: "var(--color-neutral-600)" }}>Plano gratuito</p>
            </div>
            <button className="btn btn-icon btn-ghost" title="Sair" onClick={() => signOut(auth)}>
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
              <span>{MESES[mes]} {ano}</span>
              <button className="btn btn-icon btn-ghost" onClick={() => mudaMes(1)}><i className="ph ph-caret-right" style={{ fontSize: 14 }} /></button>
            </div>
          )}
          <button className="btn btn-secondary" style={{ gap: 8 }} onClick={() => setPrivado(p => !p)}>
            <i className={privado ? "ph ph-eye-closed" : "ph ph-eye"} style={{ fontSize: 16 }} />
            {privado ? "Mostrar valores" : "Ocultar valores"}
          </button>
          <button className="btn btn-icon btn-secondary" title="Alternar tema" onClick={() => setDark(d => !d)}>
            <i className={dark ? "ph ph-sun" : "ph ph-moon"} style={{ fontSize: 16 }} />
          </button>
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => setView("lancar")}>
            <i className="ph ph-plus" style={{ fontSize: 15 }} /> Novo lançamento
          </button>
        </header>

        <div className="content">
          {view === "dashboard" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div className="kpi-row">
                {[
                  ["Receitas", money(receitas), "var(--color-accent-300)", `${txMes.filter(t => t.tipo === "receita").length} lançamento(s)`],
                  ["Despesas", money(despesas), "var(--color-negative)", `${txMes.filter(t => t.tipo === "despesa").length} lançamento(s)`],
                  ["Saldo", money(saldo), saldo >= 0 ? "var(--color-accent-200)" : "var(--color-negative)", saldo >= 0 ? "sobrando neste mês" : "acima da receita"],
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
                  <p className="card-title">Despesas por categoria</p>
                  {porCat.length === 0 ? (
                    <p className="empty">Nenhuma despesa neste mês.</p>
                  ) : (
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
                            <div className="bar-track">
                              <div style={{ background: c.cor, width: (c.total / despesas) * 100 + "%" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p className="card-title" style={{ margin: 0 }}>Projeção do mês</p>
                  <div>
                    <p style={{ margin: 0, fontSize: 30, fontFamily: "var(--font-heading)", color: "var(--color-negative)" }}>{money(projecao)}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-neutral-500)" }}>
                      No ritmo atual, é isso que você fecha {MESES[mes].toLowerCase()} gastando.
                    </p>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="bar-track" style={{ height: 6, borderRadius: 3 }}>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--color-accent-600)", width: projPct + "%" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-neutral-600)" }}>
                      <span>{projPct}% da receita</span>
                      <span>Receita {money(receitas)}</span>
                    </div>
                  </div>
                  <div className="proj-note" style={{ marginTop: "auto" }}>
                    <i className={projecao > receitas ? "ph ph-warning" : "ph ph-check-circle"}
                      style={{ fontSize: 18, color: "var(--color-accent-300)" }} />
                    <p>
                      {projecao > receitas
                        ? "Projeção acima da receita — hora de segurar os gastos."
                        : `Dentro do orçamento — sobra prevista de ${money(Math.max(0, receitas - projecao))}.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                  <p className="card-title" style={{ margin: 0, marginRight: "auto" }}>Últimos 6 meses</p>
                  <div className="legend">
                    <span><i style={{ background: "var(--color-accent-500)" }} />Receitas</span>
                    <span><i style={{ background: "var(--color-negative-bar)" }} />Despesas</span>
                  </div>
                </div>
                <div className="bars">
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
                  {[["despesa", "Despesa", "ph ph-arrow-down-left"], ["receita", "Receita", "ph ph-arrow-up-right"]].map(([tp, l, ic]) => (
                    <button key={tp} className="seg-opt" aria-pressed={form.tipo === tp}
                      onClick={() => setForm(f => ({ ...f, tipo: tp }))}>
                      <i className={ic} style={{ fontSize: 15 }} /> {l}
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label>Valor</label>
                  <div className="valor-field">
                    <span>R$</span>
                    <input inputMode="decimal" placeholder="0,00" value={form.valor}
                      onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                  </div>
                </div>
                <div className="field">
                  <label>Descrição</label>
                  <input className="input" placeholder="Mercado do bairro" value={form.desc}
                    onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label>Categoria</label>
                    <select className="input" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                      {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Data</label>
                    <input className="input" type="date" value={form.data}
                      onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button className="btn btn-primary" style={{ flex: 1, padding: 11 }} disabled={saving} onClick={addTx}>
                    {saving ? "Salvando…" : "Salvar lançamento"}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: "11px 18px" }} onClick={() => setView("dashboard")}>
                    Cancelar
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--color-neutral-600)" }}>
                Dica: use o mesmo texto para gastos recorrentes — fica mais fácil achar no histórico.
              </p>
            </div>
          )}

          {view === "historico" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div className="search">
                  <i className="ph ph-magnifying-glass" style={{ fontSize: 16, color: "var(--color-neutral-600)" }} />
                  <input placeholder="Buscar por descrição ou categoria" value={busca} onChange={e => setBusca(e.target.value)} />
                </div>
              </div>
              <div className="card" style={{ padding: "8px 12px" }}>
                {txFiltradas.length === 0 ? (
                  <p className="empty">Nenhum lançamento encontrado.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr><th>Descrição</th><th>Categoria</th><th>Data</th><th style={{ textAlign: "right" }}>Valor</th><th /></tr>
                    </thead>
                    <tbody>
                      {txFiltradas.map(tx => (
                        <tr key={tx.id}>
                          <td>{tx.desc}</td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--color-neutral-400)" }}>
                              <span style={{ width: 7, height: 7, borderRadius: 2, background: cat(tx.cat).cor }} />
                              {cat(tx.cat).label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                            {new Date(tx.data + "T12:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className={"num " + (tx.tipo === "receita" ? "pos" : "neg")}>
                            {tx.tipo === "receita" ? "+" : "−"}{money(tx.valor)}
                          </td>
                          <td style={{ textAlign: "right", width: 40 }}>
                            <button className="btn btn-icon btn-ghost" title="Excluir" onClick={() => setConfirmDel(tx)}>
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
                {txMes.length} lançamento(s) em {MESES[mes].toLowerCase()} · {money(despesas)} em despesas
              </p>
            </div>
          )}

          {view === "relatorio" && (
            <Relatorio txs={txs} userEmail={user.email || user.displayName} privado={privado} />
          )}
        </div>
      </main>

      {confirmDel && (
        <div className="dialog-backdrop" onClick={() => setConfirmDel(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: 0 }}>Excluir este lançamento?</h4>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-400)" }}>
              “{confirmDel.desc}”, de {new Date(confirmDel.data + "T12:00:00").toLocaleDateString("pt-BR")}. Isso não pode ser desfeito.
            </p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => delTx(confirmDel.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
