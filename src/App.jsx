import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider,
  signInWithRedirect, getRedirectResult, deleteUser
} from "firebase/auth";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDocs, getDoc, writeBatch, setDoc, serverTimestamp } from "firebase/firestore";
import Relatorio from "./Relatorio";
import Landing from "./Landing";
import Privacidade from "./Privacidade";
import Logo from "./Logo";
import MenuConta from "./MenuConta";
import Perfil from "./Perfil";
import PageHeader from "./PageHeader";
import PainelLancamento from "./PainelLancamento";
import { MAX_SUB } from "./subcategorias";
import { parseValor } from "./parseValor";
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
  const [form, setForm] = useState({ tipo: "despesa", valor: "", desc: "", cat: "alimentacao", sub: "", data: hoje() });
  // subcategorias criadas pelo usuário (coleção "subcategorias")
  const [subsUser, setSubsUser] = useState([]);
  const [dialogSub, setDialogSub] = useState(false);
  const [subTxt, setSubTxt] = useState("");
  const [subErr, setSubErr] = useState("");
  const [salvandoSub, setSalvandoSub] = useState(false);
  const [lancErr, setLancErr] = useState("");
  const [valorErr, setValorErr] = useState(""); // erro do campo valor ao tentar salvar vazio
  const [classErr, setClassErr] = useState(false); // tentou salvar sem atalho e sem detalhe
  // Painel "Novo lançamento" (substitui a antiga página Lançar)
  const [painel, setPainel] = useState(false);
  const [aviso, setAviso] = useState(""); // confirmação curta, ex.: "Lançamento salvo"
  const gatilhoRef = useRef(null);       // botão que abriu o painel (recebe o foco de volta)
  const botaoNovoRef = useRef(null);     // "Novo lançamento" do topo (desktop)
  const fabRef = useRef(null);           // botão flutuante "+" (celular)
  const fecharPainelRef = useRef(null);  // fecha com animação (usado pelo Cancelar)
  const painelFoiAberto = useRef(false);
  const avisoTimer = useRef(null);
  // o erro some assim que a pessoa escolhe um atalho ou digita um detalhe
  useEffect(() => { if (form.sub || form.desc.trim()) setClassErr(false); }, [form.sub, form.desc]);
  const [saving, setSaving] = useState(false);
  const [rota, setRota] = useState(() => window.location.hash);
  const [aceitePriv, setAceitePriv] = useState(false);
  const [delConta, setDelConta] = useState(false);
  const [delTxt, setDelTxt] = useState("");
  const [delErr, setDelErr] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const excluindoRef = useRef(false);
  // perfil (perfis/{uid}): { apelido, cpf?, nascimento?, telefone?, foto? }; null = não existe / carregando
  const [perfil, setPerfil] = useState(null);
  const [dialogApelido, setDialogApelido] = useState(null); // null | "novo" (primeiro acesso)
  const [apelidoTxt, setApelidoTxt] = useState("");
  const [apelidoErr, setApelidoErr] = useState("");
  const [salvandoApelido, setSalvandoApelido] = useState(false);

  // traduções e categorias derivadas do idioma
  const tr = T[lang] || T["pt"];
  const CATS = CATS_BASE.map(c => ({ ...c, label: tr[c.id] || c.id }));
  const getCat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];

  const VIEWS = !tr ? [] : [
    ["dashboard", tr.dashboard, "ph ph-chart-donut",  tr.dashDesc],
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


  // Página pública da Política de Privacidade em #/privacidade
  useEffect(() => {
    const aoMudar = () => setRota(window.location.hash);
    window.addEventListener("hashchange", aoMudar);
    return () => window.removeEventListener("hashchange", aoMudar);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [rota]);

  // Rota antiga da página Lançar (#/lancar): vai para a Visão geral e abre o painel (depois do login)
  useEffect(() => {
    if (rota !== "#/lancar" || !user) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setRota("");
    setView("dashboard");
    gatilhoRef.current = null;
    setPainel(true);
  }, [rota, user]);

  // Ao fechar o painel, o foco volta para o botão que o abriu (ou para o "Novo lançamento" visível)
  useEffect(() => {
    if (painel) { painelFoiAberto.current = true; return; }
    if (!painelFoiAberto.current) return;
    painelFoiAberto.current = false;
    const visivel = el => el && el.isConnected && el.getClientRects().length > 0; // (offsetParent é nulo no "+" fixo)
    const alvo = [gatilhoRef.current, botaoNovoRef.current, fabRef.current].find(visivel);
    alvo && alvo.focus();
  }, [painel]);
  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  function fecharPrivacidade() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setRota("");
  }

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false); }), []);
  useEffect(() => { getRedirectResult(auth).catch(() => {}); }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transacoes"), where("uid","==",user.uid), orderBy("data","desc"));
    return onSnapshot(q, snap => setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  // Atalhos criados pelo usuário: só where(uid), sem orderBy (ordena aqui no cliente)
  useEffect(() => {
    if (!user) { setSubsUser([]); return; }
    const q = query(collection(db, "subcategorias"), where("uid", "==", user.uid));
    return onSnapshot(q,
      snap => setSubsUser(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"))),
      () => setSubsUser([]));
  }, [user]);

  // Apelido salvo em perfis/{uid}. Se ainda não existir, pede no primeiro acesso.
  useEffect(() => {
    if (!user) { setPerfil(null); setDialogApelido(null); return; }
    return onSnapshot(doc(db, "perfis", user.uid), snap => {
      if (excluindoRef.current) return;
      const dados = snap.exists() ? snap.data() : null;
      if (dados && String(dados.apelido || "").trim()) { setPerfil(dados); return; }
      setPerfil(null);
      setApelidoTxt(primeiroNome(user)); setApelidoErr(""); setDialogApelido("novo");
    }, () => setPerfil(null));
  }, [user]);

  const money = v => (privado ? "R$ ••••" : fmt(v));

  // Campo valor: leitura ao vivo (prévia ou erro abaixo do campo)
  const msgValor = e => ({ casas: tr.valorCasas, maximo: tr.valorMaximo, zero: tr.lancFaltaValor, negativo: tr.lancFaltaValor, vazio: tr.lancFaltaValor }[e] || tr.valorInvalido);
  const valorLido = parseValor(form.valor, lang);
  const valorDigitado = String(form.valor).trim() !== "";
  const valorMsgErro = valorDigitado ? (valorLido.ok ? "" : msgValor(valorLido.erro)) : valorErr;

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
  const txFiltradas = txMes.filter(tx => busca === "" || tx.desc.toLowerCase().includes(busca.toLowerCase()) || getCat(tx.cat).label.toLowerCase().includes(busca.toLowerCase()) || (tx.sub || "").toLowerCase().includes(busca.toLowerCase()));

  // Atalhos da categoria escolhida: prontos (código) + criados pelo usuário (banco)
  // Atalhos da categoria escolhida: só os criados pelo próprio usuário (coleção "subcategorias")
  const atalhosCat = subsUser.filter(s => s.cat === form.cat).map(s => ({ nome: s.nome, id: s.id }));
  // Etiqueta do atalho só quando ela acrescenta algo à descrição
  const mostraSub = tx => tx.sub && tx.sub.trim().toLowerCase() !== String(tx.desc || "").trim().toLowerCase();

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
    if (authMode === "cadastro" && !aceitePriv) { setAuthErr(tr.privPrecisaAceitar); return; }
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
    if (authMode === "cadastro" && !aceitePriv) { setAuthErr(tr.privPrecisaAceitar); return; }
    setAuthErr(""); setAuthLoading(true);
    try { await signInWithRedirect(auth, new GoogleAuthProvider()); }
    catch { setAuthErr(tr.erroGoogle); setAuthLoading(false); }
  }

  async function addTx() {
    const lido = parseValor(form.valor, lang); // nunca grava se a leitura der erro
    const sub = form.sub.trim().slice(0, MAX_SUB);
    const desc = form.desc.trim() || sub; // detalhe vazio: grava o nome do atalho (o banco exige desc)
    // mesma regra de antes (valor válido + atalho OU detalhe); agora os dois avisos aparecem juntos
    if (!lido.ok) setValorErr(msgValor(lido.erro));
    if (!desc) setClassErr(true);
    if (!lido.ok || !desc) return;
    const v = lido.valor;
    setSaving(true); setLancErr("");
    const novo = { tipo: form.tipo, valor: v, desc, cat: form.cat, data: form.data, uid: user.uid, criadoEm: new Date() };
    if (sub) novo.sub = sub; // campo opcional
    try {
      await addDoc(collection(db, "transacoes"), novo);
      setForm(f => ({ ...f, valor: "", desc: "", sub: "" }));
      // salvou: fecha o painel e confirma; a página atual se atualiza sozinha (onSnapshot)
      setPainel(false);
      mostrarAviso(tr.lancamentoSalvo);
    } catch {
      setLancErr(tr.erroSalvar);
    }
    setSaving(false);
  }

  function abrirPainel(e) {
    gatilhoRef.current = (e && e.currentTarget) || null;
    setPainel(true);
  }
  // Cancelar / Descartar / fundo / Esc: limpa o que foi digitado e fecha
  function aoFecharPainel() {
    setForm(f => ({ ...f, valor: "", desc: "", sub: "" }));
    setValorErr(""); setClassErr(false); setLancErr("");
    setPainel(false);
  }
  function mostrarAviso(texto) {
    setAviso(texto);
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(""), 3000);
  }

  // Tocar num atalho só marca "sub" (não mexe na descrição). Tocar de novo desmarca.
  function escolherAtalho(nome) {
    setLancErr("");
    setForm(f => ({ ...f, sub: f.sub === nome ? "" : nome }));
  }

  function mudarCategoria(cat) {
    setForm(f => ({ ...f, cat, sub: "" }));
  }

  async function salvarAtalho() {
    const nome = subTxt.trim();
    if (nome.length < 1 || nome.length > MAX_SUB) { setSubErr(tr.novoAtalhoErro); return; }
    const existente = atalhosCat.find(a => a.nome.toLowerCase() === nome.toLowerCase());
    if (existente) { setForm(f => ({ ...f, sub: existente.nome })); setDialogSub(false); return; }
    setSalvandoSub(true); setSubErr("");
    try {
      await addDoc(collection(db, "subcategorias"), { uid: user.uid, cat: form.cat, nome, criadoEm: serverTimestamp() });
      setForm(f => ({ ...f, sub: nome }));
      setDialogSub(false);
    } catch {
      setSubErr(tr.erroSalvar);
    }
    setSalvandoSub(false);
  }

  async function excluirAtalho(a) {
    if (!window.confirm(tr.excluirAtalhoConfirma)) return;
    try {
      await deleteDoc(doc(db, "subcategorias", a.id));
      if (form.sub === a.nome) setForm(f => ({ ...f, sub: "" }));
    } catch {
      window.alert(tr.erroSalvar);
    }
  }

  async function delTx(id) { await deleteDoc(doc(db, "transacoes", id)); setConfirmDel(null); }

  // Primeiro nome: do nome da conta (Google) ou do e-mail antes do @, com inicial maiúscula
  function primeiroNome(u) {
    if (!u) return "";
    let base = (u.displayName || "").trim().split(/\s+/)[0];
    if (!base) {
      const local = (u.email || "").split("@")[0];
      base = local.split(/[^\p{L}]+/u).find(Boolean) || local; // "joao.silva99" → "joao"
    }
    return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 30);
  }

  // Grava perfis/{uid} com setDoc SEM merge: objeto completo com apelido + atualizadoEm
  // e SÓ os campos opcionais preenchidos (campo vazio some do documento).
  async function salvarPerfil(dados) {
    const obj = { apelido: String(dados.apelido || "").trim(), atualizadoEm: new Date() };
    for (const campo of ["cpf", "nascimento", "telefone", "foto"]) {
      if (dados[campo]) obj[campo] = dados[campo];
    }
    await setDoc(doc(db, "perfis", user.uid), obj);
    setPerfil(obj);
  }

  // Primeiro acesso: diálogo "Como você quer ser chamado?"
  async function salvarApelido() {
    const nome = apelidoTxt.trim();
    if (nome.length < 1 || nome.length > 30) { setApelidoErr(tr.apelidoErro); return; }
    setSalvandoApelido(true); setApelidoErr("");
    try {
      await salvarPerfil({ ...(perfil || {}), apelido: nome });
      setDialogApelido(null);
    } catch {
      setApelidoErr(tr.erroSalvar);
    }
    setSalvandoApelido(false);
  }

  // Exclusão de conta (LGPD): primeiro apaga os dados (lançamentos, subcategorias
  // e perfil), depois a conta. Se apagar os dados falhar, a conta NÃO é apagada.
  async function excluirMinhaConta() {
    const u = auth.currentUser;
    if (!u || excluindo) return;
    setDelErr("");

    // O Firebase só deixa excluir a conta se o login foi recente (5 minutos)
    const ultimoLogin = Date.parse(u.metadata.lastSignInTime || "");
    if (!ultimoLogin || Date.now() - ultimoLogin > 5 * 60 * 1000) {
      setDelErr(tr.excluirContaRelogin);
      return;
    }

    setExcluindo(true);
    excluindoRef.current = true;
    try {
      const [lanc, subs, perfil] = await Promise.all([
        getDocs(query(collection(db, "transacoes"), where("uid", "==", u.uid))),
        getDocs(query(collection(db, "subcategorias"), where("uid", "==", u.uid))),
        getDoc(doc(db, "perfis", u.uid)),
      ]);
      const refs = [...lanc.docs.map(d => d.ref), ...subs.docs.map(d => d.ref)];
      if (perfil.exists()) refs.push(perfil.ref);
      for (let i = 0; i < refs.length; i += 400) {
        const lote = writeBatch(db);
        refs.slice(i, i + 400).forEach(ref => lote.delete(ref));
        await lote.commit();
      }
    } catch {
      setDelErr(tr.excluirContaErroDados);
      setExcluindo(false);
      excluindoRef.current = false;
      return;
    }

    try {
      await deleteUser(u);
    } catch {
      setDelErr(tr.excluirContaErroConta);
      setExcluindo(false);
      excluindoRef.current = false;
      return;
    }

    excluindoRef.current = false;
    Object.keys(localStorage).filter(k => k.startsWith("fp_")).forEach(k => localStorage.removeItem(k));
    setExcluindo(false);
    setDelConta(false);
    setTxs([]);
    setView("dashboard");
    setEmail(""); setSenha(""); setAceitePriv(false);
    setTela("landing");
  }

  // CSV pensado para o Excel em português: BOM UTF-8 (acentos certos), ponto e vírgula
  // como separador, textos entre aspas, vírgula decimal e data dd/mm/aaaa em PT.
  function exportCSV() {
    const pt = lang === "pt";
    const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const data = iso => (pt && iso ? iso.split("-").reverse().join("/") : iso || "");
    const valor = v => { const n = (Number(v) || 0).toFixed(2); return pt ? n.replace(".", ",") : n; };
    const cab = [tr.data, tr.tipoLabel, tr.categoria, tr.subcategoria, tr.descricao, tr.valor].map(q).join(";");
    const linhas = [...txs].sort((a, b) => String(a.data).localeCompare(String(b.data))).map(tx => [
      data(tx.data),
      q(tx.tipo === "receita" ? tr.receita : tr.despesa),
      q(getCat(tx.cat).label),
      q(tx.sub || ""),
      q(tx.desc),
      valor(tx.valor),
    ].join(";"));
    const conteudo = "﻿" + [cab, ...linhas].join("\r\n") + "\r\n";
    const d = new Date();
    const hojeLocal = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    a.download = "falc-lancamentos-" + hojeLocal + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function mudaMes(delta) {
    const d = new Date(ano, mes + delta, 1);
    setMes(d.getMonth()); setAno(d.getFullYear());
  }

  if (rota === "#/privacidade") return (
    <Privacidade t={tr} onVoltar={fecharPrivacidade} />
  );

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
        {/* topo: "Voltar" forte à esquerda e idioma à direita */}
        <div className="auth-topbar">
          <button type="button" className="btn btn-voltar" onClick={() => setTela("landing")}>
            <i className="ph-bold ph-arrow-left" aria-hidden="true" /> {tr.voltar}
          </button>
          <LangPicker lang={lang} setLang={setLang} />
        </div>

        {/* esquerda: falcão vertical + frase de efeito */}
        <aside className="auth-aside">
          <div className="auth-marca">
            <Logo variant="vertical" className="logo-auth" />
            <p className="auth-frase">{tr.fraseEfeito}</p>
          </div>
        </aside>

        {/* direita: formulário */}
        <main className="auth-form">
          <div className="auth-cartao card-hover card-hover-fixo">
            {authMode === "reset" ? (
              <>
                <button type="button" className="btn btn-ghost auth-link" onClick={() => { setAuthMode("login"); setAuthErr(""); setResetSent(false); }}>
                  <i className="ph ph-arrow-left" /> {tr.voltar}
                </button>
                <h3 style={{ margin: "14px 0 6px" }}>{tr.recuperarSenha}</h3>
                <p className="auth-sub">{tr.recuperarDesc}</p>
              </>
            ) : (
              <>
                <h3 style={{ margin: "0 0 6px" }}>{authMode === "login" ? tr.entrar : tr.criarConta}</h3>
                <p className="auth-sub">{tr.tagline}</p>
                <div className="seg" style={{ marginBottom: 24 }}>
                  {[["login", tr.entrar], ["cadastro", tr.criarConta]].map(([m, l]) => (
                    <button type="button" key={m} className="seg-opt" aria-pressed={authMode === m}
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
              <div style={{ display: "grid", gap: 16 }}>
                <div className="field">
                  <label htmlFor="auth-email">{tr.emailLabel}</label>
                  <input id="auth-email" className="input" type="email" autoComplete="email" value={email} placeholder={tr.emailPlaceholder} onChange={e => setEmail(e.target.value)} />
                </div>
                {authMode !== "reset" && (
                  <div className="field">
                    <label htmlFor="auth-senha">{tr.senhaLabel}</label>
                    <input id="auth-senha" className="input" type="password" autoComplete={authMode === "cadastro" ? "new-password" : "current-password"}
                      value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} />
                    {authMode === "cadastro" && <p className="auth-ajuda">{tr.senhaDica}</p>}
                  </div>
                )}
                {authMode === "cadastro" && (
                  <label className="auth-aceite">
                    <input type="checkbox" checked={aceitePriv} onChange={e => { setAceitePriv(e.target.checked); setAuthErr(""); }} />
                    <span>{tr.privAceito} <a href="#/privacidade" className="link-destaque">{tr.privLink}</a>. {tr.privAceitoMenor}</span>
                  </label>
                )}
                {authErr && <p className="auth-erro" role="alert">{authErr}</p>}
                <button type="button" className="btn btn-cheio btn-block btn-grande" disabled={authLoading} onClick={handleAuth}>
                  {authLoading ? tr.aguarde : authMode === "login" ? tr.entrar : authMode === "cadastro" ? tr.criarMinhaConta : tr.enviarLink}
                </button>
              </div>
            )}

            {authMode !== "reset" && !resetSent && (
              <>
                <div className="or-row"><div /><span>{tr.ou}</span><div /></div>
                <button type="button" className="btn btn-secondary btn-block btn-grande" style={{ gap: 10 }} disabled={authLoading} onClick={handleGoogle}>
                  <i className="ph ph-google-logo" style={{ fontSize: 18 }} /> {tr.continuarGoogle}
                </button>
                {authMode === "login" && (
                  <p style={{ margin: "16px 0 0", textAlign: "center" }}>
                    <button type="button" className="btn btn-ghost auth-link" onClick={() => { setAuthMode("reset"); setAuthErr(""); }}>
                      {tr.esqueciSenha}
                    </button>
                  </p>
                )}
              </>
            )}

            <p className="auth-politica">
              <a href="#/privacidade" className="link-destaque link-alvo">{tr.privLink}</a>
            </p>
          </div>
        </main>
      </div>
    );
  }

  const apelido = (perfil && perfil.apelido) || primeiroNome(user);
  const VIEW_PERFIL = ["perfil", tr.menuPerfil, "ph ph-user-circle", tr.perfilPaginaDesc];
  const vAtual = view === "perfil" ? VIEW_PERFIL : (VIEWS.find(v => v[0] === view) || VIEWS[0]);

  return (
    <div className="shell">
      {/* com o painel aberto, a página atrás fica inerte (sem foco nem clique) */}
      <aside className="sidebar" inert={painel ? "" : undefined}>
        <span className="brand"><Logo variant="horizontal" className="logo-sidebar logo-sidebar-h" /><Logo variant="simbolo" className="logo-sidebar logo-sidebar-s" /></span>
        <nav className="side-nav">
          {VIEWS.map(([id, label, icon]) => (
            <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}>
              <i className={icon} style={{ fontSize: 17 }} /> {label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <MenuConta
            apelido={apelido}
            foto={perfil && perfil.foto}
            email={user.email || user.displayName || ""}
            t={tr}
            onPerfil={() => setView("perfil")}
            onExportar={exportCSV}
            onPrivacidade={() => { window.location.hash = "#/privacidade"; }}
            onSair={() => signOut(auth)}
          />
        </div>
      </aside>

      <main style={{ minWidth: 0 }} inert={painel ? "" : undefined}>
        {/* barra do topo: só os controles globais (iguais em todas as páginas, para não mudar de altura) */}
        <div className="topbar">
          <button className="btn btn-secondary" style={{ gap: 8 }} onClick={() => setPrivado(p => !p)}>
            <i className={privado ? "ph ph-eye-closed" : "ph ph-eye"} style={{ fontSize: 16 }} />
            {privado ? tr.mostrarValores : tr.ocultarValores}
          </button>
          <LangPicker lang={lang} setLang={setLang} />
          <button className="btn btn-icon btn-secondary" title="Tema" onClick={() => setDark(d => !d)}>
            <i className={dark ? "ph ph-sun" : "ph ph-moon"} style={{ fontSize: 16 }} />
          </button>
          <button ref={botaoNovoRef} className="btn btn-primary topbar-novo" style={{ gap: 8 }} onClick={abrirPainel}
            aria-haspopup="dialog" aria-expanded={painel}>
            <i className="ph ph-plus" style={{ fontSize: 15 }} /> {tr.novoLancamentoBtn}
          </button>
        </div>

        <div className="content">
          <PageHeader titulo={vAtual[1]} subtitulo={vAtual[3]}>
            {view !== "relatorio" && view !== "perfil" && (
              <div className="month-picker">
                <button className="btn btn-icon btn-ghost" onClick={() => mudaMes(-1)}><i className="ph ph-caret-left" style={{ fontSize: 14 }} /></button>
                <span>{MESES[lang][mes]} {ano}</span>
                <button className="btn btn-icon btn-ghost" onClick={() => mudaMes(1)}><i className="ph ph-caret-right" style={{ fontSize: 14 }} /></button>
              </div>
            )}
          </PageHeader>
          {view === "dashboard" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div className="kpi-row">
                {[
                  [tr.receitas, money(receitas), "var(--color-accent-300)", `${txMes.filter(tx => tx.tipo === "receita").length} ${tr.lancamentos}`],
                  [tr.despesas, money(despesas), "var(--color-negative)", `${txMes.filter(tx => tx.tipo === "despesa").length} ${tr.lancamentos}`],
                  [tr.saldo, money(saldo), saldo >= 0 ? "var(--color-accent-200)" : "var(--color-negative)", saldo >= 0 ? tr.sobrandoMes : tr.acimaReceita],
                ].map(([l, v, cor, nota]) => (
                  <div key={l} className="kpi card-hover card-hover-fixo">
                    <div className="line" style={{ background: `linear-gradient(to right, transparent, ${cor} 28px, ${cor} calc(100% - 28px), transparent)` }} />
                    <p className="kicker">{l}</p>
                    <p className="value" style={{ color: cor }}>{v}</p>
                    <p className="note">{nota}</p>
                  </div>
                ))}
              </div>

              <div className="dash-row">
                <div className="card card-hover card-hover-fixo">
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

                <div className="card card-hover card-hover-fixo" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

          {view === "historico" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div className="search">
                  <i className="ph ph-magnifying-glass" style={{ fontSize: 16, color: "var(--color-neutral-600)" }} />
                  <input placeholder={tr.buscar} value={busca} onChange={e => setBusca(e.target.value)} />
                </div>
              </div>
              <div className="card table-scroll" style={{ padding: "8px 12px" }}>
                {txFiltradas.length === 0 ? <p className="empty">{tr.nenhumLanc}</p> : (
                  <table className="table">
                    <thead>
                      <tr><th>{tr.descricao}</th><th>{tr.categoria}</th><th>{tr.data}</th><th style={{ textAlign: "right" }}>{tr.valor}</th><th /></tr>
                    </thead>
                    <tbody>
                      {txFiltradas.map(tx => (
                        <tr key={tx.id}>
                          <td>
                            {tx.desc}
                            {mostraSub(tx) && <span className="tag sub-tag">{tx.sub}</span>}
                          </td>
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

          {view === "perfil" && (
            <Perfil
              email={user.email || ""}
              perfil={perfil}
              apelidoPadrao={apelido}
              t={tr}
              onSalvar={salvarPerfil}
              onExcluir={() => { setDelConta(true); setDelTxt(""); setDelErr(""); }}
            />
          )}

          {view === "relatorio" && (
            <Relatorio txs={txs} userEmail={user.email || user.displayName} privado={privado} t={tr} />
          )}
        </div>
      </main>

      {/* Painel "Novo lançamento": mesmo formulário e mesma lógica da antiga página Lançar */}
      {painel && (
        <PainelLancamento
          titulo={tr.painelLancTitulo}
          sujo={!!(String(form.valor).trim() || form.desc.trim() || form.sub)}
          bloqueado={dialogSub}
          onFechar={aoFecharPainel}
          fecharRef={fecharPainelRef}
          focoInicialId="lanc-valor"
          t={tr}
        >
          <div className="painel-form">
            <div className="seg">
              {[["despesa", tr.despesa, "ph ph-arrow-down-left"], ["receita", tr.receita, "ph ph-arrow-up-right"]].map(([tp, l, ic]) => (
                <button key={tp} className="seg-opt" aria-pressed={form.tipo === tp} onClick={() => setForm(f => ({ ...f, tipo: tp }))}>
                  <i className={ic} style={{ fontSize: 15 }} /> {l}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="lanc-valor">{tr.valor}</label>
              <div className="valor-field" data-erro={!!valorMsgErro}>
                <span>R$</span>
                <input id="lanc-valor" type="text" inputMode="decimal" autoComplete="off" placeholder={lang === "en" ? "0.00" : "0,00"}
                  value={form.valor} aria-invalid={!!valorMsgErro} aria-describedby="lanc-valor-msg"
                  onChange={e => { setValorErr(""); setForm(f => ({ ...f, valor: e.target.value })); }} />
              </div>
              <p id="lanc-valor-msg" className={"valor-msg" + (valorMsgErro ? " valor-msg-erro" : "")} aria-live="polite">
                {valorMsgErro || (valorDigitado && valorLido.ok ? `${tr.valorPrevia} ${fmt(valorLido.valor)}` : "")}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>{tr.categoria}</label>
                <select className="input" value={form.cat} onChange={e => mudarCategoria(e.target.value)}>
                  {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>{tr.data}</label>
                <input className="input" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            {/* Classificação: obrigatório escolher um atalho OU escrever um detalhe.
                A dica fica neutra; só vira erro (coral) depois de tentar salvar sem nenhum dos dois. */}
            <fieldset className="lanc-classe" aria-describedby="lanc-classe-dica">
              <legend className="lanc-classe-titulo">{tr.classeTitulo}</legend>
              <p id="lanc-classe-dica" className={"lanc-classe-dica" + (classErr ? " lanc-classe-erro" : "")} aria-live="polite">
                {classErr && <i className="ph ph-warning-circle" aria-hidden="true" />}{tr.classeDica}
              </p>
              <span id="lanc-atalho-rotulo" className="lanc-classe-rotulo">{tr.atalhosLabel}</span>
              <div className="chips" role="group" aria-labelledby="lanc-atalho-rotulo">
                {atalhosCat.map(a => (
                  <span key={a.id} className="chip-grupo" data-ativo={form.sub === a.nome}>
                    <button type="button" className="chip" aria-pressed={form.sub === a.nome} onClick={() => escolherAtalho(a.nome)}>{a.nome}</button>
                    <button type="button" className="chip-x" title={tr.excluirAtalho} aria-label={tr.excluirAtalho + ": " + a.nome} onClick={() => excluirAtalho(a)}>
                      <i className="ph ph-x" />
                    </button>
                  </span>
                ))}
                {/* sem atalhos na categoria: botão em destaque convidando a criar o primeiro (não é obrigatório) */}
                <button type="button" className={"chip chip-novo" + (atalhosCat.length === 0 ? " chip-primeiro" : "")}
                  onClick={() => { setSubTxt(""); setSubErr(""); setDialogSub(true); }}>
                  <i className="ph ph-plus" /> {atalhosCat.length === 0 ? tr.primeiroAtalho : tr.novoAtalho}
                </button>
              </div>
              <div className="lanc-classe-ou" aria-hidden="true"><div /><span>{tr.ou}</span><div /></div>
              <label htmlFor="lanc-detalhe" className="lanc-classe-rotulo">{tr.detalheLabel}</label>
              <input id="lanc-detalhe" className="input" placeholder={tr.detalheExemplo} value={form.desc} maxLength={120}
                aria-invalid={classErr} aria-describedby="lanc-classe-dica"
                onChange={e => { setLancErr(""); setForm(f => ({ ...f, desc: e.target.value })); }} />
            </fieldset>
            {lancErr && <p style={{ margin: 0, fontSize: 13, color: "var(--color-negative)" }}>{lancErr}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1, padding: 11 }} disabled={saving} onClick={addTx}>
                {saving ? tr.salvando : tr.salvar}
              </button>
              <button type="button" className="btn btn-secondary" style={{ padding: "11px 18px" }} onClick={() => fecharPainelRef.current && fecharPainelRef.current()}>{tr.cancelar}</button>
            </div>
          </div>
        </PainelLancamento>
      )}

      {/* celular: botão flutuante "+" no lugar do "Novo lançamento" do topo */}
      {!painel && (
        <button ref={fabRef} type="button" className="fab-novo" onClick={abrirPainel}
          aria-label={tr.novoLancamentoBtn} title={tr.novoLancamentoBtn} aria-haspopup="dialog">
          <i className="ph ph-plus" aria-hidden="true" />
        </button>
      )}

      {/* confirmação curta depois de salvar */}
      <div className="aviso-flutuante" role="status" aria-live="polite" data-visivel={!!aviso}>
        {aviso && <><i className="ph ph-check-circle" aria-hidden="true" /> {aviso}</>}
      </div>

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

      {dialogApelido && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: 0 }}>{tr.apelidoTitulo}</h4>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-400)" }}>
              {tr.apelidoDesc}
            </p>
            <div className="field">
              <label>{tr.apelidoLabel}</label>
              <input className="input" value={apelidoTxt} maxLength={30} autoFocus required disabled={salvandoApelido}
                onChange={e => { setApelidoTxt(e.target.value); setApelidoErr(""); }}
                onKeyDown={e => e.key === "Enter" && salvarApelido()} />
            </div>
            {apelidoErr && <p style={{ margin: 0, fontSize: 13, color: "var(--color-negative)" }}>{apelidoErr}</p>}
            <div className="dialog-actions">
              <button className="btn btn-primary" disabled={salvandoApelido || !apelidoTxt.trim()} onClick={salvarApelido}>
                {salvandoApelido ? tr.salvando : tr.continuar}
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogSub && (
        <div className="dialog-backdrop" onClick={() => !salvandoSub && setDialogSub(false)}>
          <div className="dialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: 0 }}>{tr.novoAtalhoTitulo} {getCat(form.cat).label}</h4>
            <div className="field">
              <label>{tr.novoAtalhoLabel}</label>
              <input className="input" value={subTxt} maxLength={MAX_SUB} autoFocus disabled={salvandoSub}
                onChange={e => { setSubTxt(e.target.value); setSubErr(""); }}
                onKeyDown={e => e.key === "Enter" && salvarAtalho()} />
            </div>
            {subErr && <p style={{ margin: 0, fontSize: 13, color: "var(--color-negative)" }}>{subErr}</p>}
            <div className="dialog-actions">
              <button className="btn btn-secondary" disabled={salvandoSub} onClick={() => setDialogSub(false)}>{tr.cancelar}</button>
              <button className="btn btn-primary" disabled={salvandoSub || !subTxt.trim()} onClick={salvarAtalho}>
                {salvandoSub ? tr.salvando : tr.salvarApelido}
              </button>
            </div>
          </div>
        </div>
      )}

      {delConta && (
        <div className="dialog-backdrop" onClick={() => !excluindo && setDelConta(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: 0 }}>{tr.excluirContaTitulo}</h4>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-neutral-400)" }}>{tr.excluirContaAviso}</p>
            <div className="field">
              <label>{tr.excluirContaDigite} <strong style={{ color: "var(--color-negative)" }}>{tr.excluirContaPalavra}</strong></label>
              <input className="input" value={delTxt} autoFocus disabled={excluindo}
                onChange={e => { setDelTxt(e.target.value); setDelErr(""); }} />
            </div>
            {delErr && <p style={{ margin: 0, fontSize: 13, color: "var(--color-negative)" }}>{delErr}</p>}
            <div className="dialog-actions">
              <button className="btn btn-secondary" disabled={excluindo} onClick={() => setDelConta(false)}>{tr.cancelar}</button>
              <button className="btn btn-danger" disabled={excluindo || delTxt.trim().toUpperCase() !== tr.excluirContaPalavra}
                onClick={excluirMinhaConta}>
                {excluindo ? tr.excluindoConta : tr.excluirContaBotao}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}