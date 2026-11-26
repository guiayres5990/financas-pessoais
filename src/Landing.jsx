import { useState, useEffect, useRef } from "react";
import { LANGS } from "./i18n";
import Logo from "./Logo";

// Cartão de exemplo do hero (valores fictícios, só ilustração)
const CATS_DEMO = [
  { label: { pt: "Moradia", en: "Housing", es: "Vivienda" }, valor: 1500, cor: "var(--cat-moradia)" },
  { label: { pt: "Alimentação", en: "Food", es: "Alimentación" }, valor: 1240, cor: "var(--cat-alimentacao)" },
  { label: { pt: "Transporte", en: "Transport", es: "Transporte" }, valor: 480, cor: "var(--cat-transporte)" },
  { label: { pt: "Lazer", en: "Leisure", es: "Ocio" }, valor: 390.5, cor: "var(--cat-lazer)" },
];
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Blocos "Como funciona" e "Recursos" (só o que o app realmente tem)
const PASSOS = [
  { icone: "ph-plus-circle", t: "passo1T", d: "passo1D" },
  { icone: "ph-chart-donut", t: "passo2T", d: "passo2D" },
  { icone: "ph-file-pdf", t: "passo3T", d: "passo3D" },
];
const RECURSOS = [
  { icone: "ph-lightning", t: "rec1T", d: "rec1D" },
  { icone: "ph-list-dashes", t: "rec2T", d: "rec2D" },
  { icone: "ph-file-pdf", t: "rec3T", d: "rec3D" },
  { icone: "ph-download-simple", t: "rec4T", d: "rec4D" },
  { icone: "ph-circle-half", t: "rec5T", d: "rec5D" },
  { icone: "ph-translate", t: "rec6T", d: "rec6D" },
  { icone: "ph-user-circle", t: "rec7T", d: "rec7D" },
];
// "Seus dados, protegidos": só afirmações que a Política de Privacidade já faz
const LGPD = [
  { icone: "ph-hand-palm", t: "lgpd1" },   // seção 6
  { icone: "ph-trash", t: "lgpd2" },       // seções 7 e 8
  { icone: "ph-credit-card", t: "lgpd3" }, // seção 2
  { icone: "ph-identification-card", t: "lgpd4" }, // seção 2
];

function LangPicker({ lang, setLang, paraCima = false }) {
  const [open, setOpen] = useState(false);
  const caixa = useRef(null);
  const atual = LANGS.find(l => l.code === lang) || LANGS[0];
  useEffect(() => {
    if (!open) return;
    const fora = e => { if (caixa.current && !caixa.current.contains(e.target)) setOpen(false); };
    const tecla = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", tecla); };
  }, [open]);
  return (
    <div ref={caixa} style={{ position: "relative" }}>
      <button type="button" className="btn btn-secondary lp-toque" style={{ gap: 6 }} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 16 }}>{atual.flag}</span>
        <span>{atual.label}</span>
        <i className={paraCima ? "ph ph-caret-up" : "ph ph-caret-down"} style={{ fontSize: 12 }} />
      </button>
      {open && (
        <div className="lp-idiomas" style={paraCima ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }}>
          {LANGS.map(l => (
            <button type="button" key={l.code} aria-pressed={l.code === lang} onClick={() => { setLang(l.code); setOpen(false); }}>
              <span style={{ fontSize: 18 }}>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Rola até um bloco sem mudar o endereço (o app usa o "#" para a Política)
function rolarPara(id) {
  return e => {
    e.preventDefault();
    const alvo = document.getElementById(id);
    if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

export default function Landing({ onEntrar, onCriarConta, dark, onToggleTheme, lang, setLang, t }) {
  const total = CATS_DEMO.reduce((s, c) => s + c.valor, 0);
  const botaoTema = (
    <button type="button" className="btn btn-icon btn-secondary lp-toque-icone" onClick={onToggleTheme}
      title={t.alternarTema} aria-label={t.alternarTema}>
      <i className={dark ? "ph ph-sun" : "ph ph-moon"} style={{ fontSize: 18 }} />
    </button>
  );

  return (
    <div className="lp">
      {/* Cabeçalho */}
      <nav className="nav-bar">
        <span className="brand">
          <Logo variant="horizontal" className="logo-landing" />
        </span>
        <div className="nav-links">
          <a href="#recursos" onClick={rolarPara("recursos")}>{t.navRecursos}</a>
          <a href="#como-funciona" onClick={rolarPara("como-funciona")}>{t.relatorio}</a>
          <LangPicker lang={lang} setLang={setLang} />
          {botaoTema}
          <button type="button" className="btn btn-secondary lp-toque" onClick={onEntrar}>{t.entrar}</button>
          <button type="button" className="btn btn-primary lp-toque" onClick={() => onCriarConta()}>{t.criarContaGratis}</button>
        </div>
      </nav>

      {/* a) Hero */}
      <section className="hero">
        <div>
          <span className="tag tag-outline">{t.tagGratis}</span>
          <h1>{t.fraseEfeito}</h1>
          <p className="lede">{t.heroLede}</p>
          <div className="lp-botoes">
            <button type="button" className="btn btn-cheio btn-lg lp-toque" onClick={() => onCriarConta()}>{t.comecarAgora}</button>
            <button type="button" className="btn btn-secondary btn-lg lp-toque" onClick={onEntrar}>{t.jaTemConta}</button>
          </div>
          <p className="lp-nota">{t.dadosSeguros}</p>
        </div>

        <div className="card-lg" style={{ display: "grid", gap: 16 }} aria-hidden="true">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p className="kicker">{t.saldoMes}</p>
              <p style={{ margin: "4px 0 0", fontSize: 30, fontFamily: "var(--font-heading)", color: "var(--color-accent-300)" }}>
                {fmt(2212.5)}
              </p>
            </div>
            <span className="tag tag-accent">{t.noOrcamento}</span>
          </div>
          <hr className="rule" />
          <div style={{ display: "grid", gap: 11 }}>
            {CATS_DEMO.map(c => (
              <div key={c.label.pt} className="cat-row">
                <div className="cat-head">
                  <span className="dot" style={{ background: c.cor }} />
                  <span className="name">{c.label[lang] || c.label.pt}</span>
                  <span className="val">{fmt(c.valor)}</span>
                </div>
                <div className="bar-track">
                  <div style={{ background: c.cor, width: (c.valor / total) * 100 + "%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* b) Como funciona */}
      <section className="lp-bloco" id="como-funciona" aria-labelledby="lp-como">
        <p className="kicker">{t.comoFunciona}</p>
        <h2 id="lp-como" className="lp-titulo">{t.heroTitle}</h2>
        <ol className="lp-passos">
          {PASSOS.map((p, i) => (
            <li key={p.t} className="lp-passo">
              <div className="lp-passo-topo">
                <span className="lp-num" aria-hidden="true">{i + 1}</span>
                <i className={"ph " + p.icone + " lp-icone"} aria-hidden="true" />
              </div>
              <h3>{t[p.t]}</h3>
              <p>{t[p.d]}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* c) Recursos */}
      <section className="lp-bloco" id="recursos" aria-labelledby="lp-recursos">
        <p className="kicker">{t.recursosTitulo}</p>
        <h2 id="lp-recursos" className="lp-titulo">{t.recursosSub}</h2>
        <ul className="lp-recursos">
          {RECURSOS.map(r => (
            <li key={r.t} className="lp-recurso">
              <span className="lp-recurso-icone" aria-hidden="true"><i className={"ph " + r.icone} /></span>
              <div>
                <h3>{t[r.t]}</h3>
                <p>{t[r.d]}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* d) Seus dados, protegidos (LGPD) */}
      <section className="lp-bloco" id="dados" aria-labelledby="lp-dados">
        <div className="lp-lgpd">
          <div>
            <p className="kicker">LGPD</p>
            <h2 id="lp-dados" className="lp-titulo">{t.lgpdTitulo}</h2>
            <p className="lp-sub">{t.lgpdSub}</p>
          </div>
          <div>
            <ul className="lp-lgpd-lista">
              {LGPD.map(item => (
                <li key={item.t}>
                  <i className={"ph " + item.icone} aria-hidden="true" />
                  <span>{t[item.t]}</span>
                </li>
              ))}
            </ul>
            <p className="lp-lgpd-link">
              {t.lgpdLeia} <a href="#/privacidade" className="link-destaque">{t.privLink}</a>.
            </p>
          </div>
        </div>
      </section>

      {/* e) Chamada final */}
      <section className="lp-bloco lp-cta">
        <Logo variant="vertical" className="logo-cta" />
        <h2 className="lp-cta-frase">{t.fraseEfeito}</h2>
        <button type="button" className="btn btn-cheio btn-lg lp-toque" onClick={() => onCriarConta()}>{t.comecarAgora}</button>
      </section>

      {/* f) Rodapé */}
      <footer className="lp-rodape">
        <div className="lp-rodape-inner">
          <Logo variant="horizontal" className="logo-rodape" />
          <a href="#/privacidade" className="link-destaque link-alvo">{t.privLink}</a>
          <div className="lp-rodape-acoes">
            <LangPicker lang={lang} setLang={setLang} paraCima />
            {botaoTema}
          </div>
        </div>
        <p className="lp-rodape-nota">{t.footer}</p>
      </footer>
    </div>
  );
}
