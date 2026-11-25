import { useState } from "react";
import { LANGS } from "./i18n";
import Logo from "./Logo";

const CATS_DEMO = [
  { label: { pt: "Moradia", en: "Housing", es: "Vivienda" }, valor: 1500, cor: "var(--cat-moradia)" },
  { label: { pt: "Alimentação", en: "Food", es: "Alimentación" }, valor: 1240, cor: "var(--cat-alimentacao)" },
  { label: { pt: "Transporte", en: "Transport", es: "Transporte" }, valor: 480, cor: "var(--cat-transporte)" },
  { label: { pt: "Lazer", en: "Leisure", es: "Ocio" }, valor: 390.5, cor: "var(--cat-lazer)" },
];
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function LangPicker({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const atual = LANGS.find(l => l.code === lang);
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

export default function Landing({ onEntrar, onCriarConta, dark, onToggleTheme, lang, setLang, t }) {
  const [email, setEmail] = useState("");
  const total = CATS_DEMO.reduce((s, c) => s + c.valor, 0);

  return (
    <div>
      <nav className="nav-bar">
        <span className="brand">
          <Logo variant="horizontal" className="logo-landing" />
        </span>
        <div className="nav-links">
          <a href="#recursos">Recursos</a>
          <a href="#relatorio">{t.relatorio}</a>
          <LangPicker lang={lang} setLang={setLang} />
          <button className="btn btn-icon btn-secondary" onClick={onToggleTheme} title="Alternar tema">
            <i className={dark ? "ph ph-sun" : "ph ph-moon"} style={{ fontSize: 18 }} />
          </button>
          <button className="btn btn-secondary" onClick={onEntrar}>{t.entrar}</button>
          <button className="btn btn-primary" onClick={onCriarConta}>{t.criarContaGratis}</button>
        </div>
      </nav>

      <section className="hero">
        <div>
          <span className="tag tag-outline">Grátis · sem cartão</span>
          <h1>{t.heroTitle}</h1>
          <p className="lede">{t.heroLede}</p>
          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-lg" onClick={onCriarConta}>{t.comecarAgora}</button>
            <button className="btn btn-secondary btn-lg" onClick={onEntrar}>{t.jaTemConta}</button>
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: "var(--color-neutral-600)" }}>{t.dadosSeguros}</p>
        </div>

        <div className="card-lg" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
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
                  <span className="name">{c.label[lang]}</span>
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

      <section className="stat-band">
        <div className="inner">
          <div><p className="big">12s</p><p>{t.stat1}</p></div>
          <div><p className="big">7</p><p>{t.stat2}</p></div>
          <div><p className="big">1 {lang === "pt" ? "clique" : lang === "en" ? "click" : "clic"}</p><p>{t.stat3}</p></div>
        </div>
      </section>

      <section className="section" id="recursos">
        <h2 style={{ maxWidth: "24ch" }}>{t.tresTelasTitulo}</h2>
        <p style={{ maxWidth: "52ch", color: "var(--color-neutral-400)" }}>{t.tresTelasSub}</p>
        <div className="feature-grid">
          <div className="card">
            <i className="ph ph-plus-circle" />
            <h5>{t.feat1Title}</h5>
            <p>{t.feat1Desc}</p>
          </div>
          <div className="card">
            <i className="ph ph-chart-donut" />
            <h5>{t.feat2Title}</h5>
            <p>{t.feat2Desc}</p>
          </div>
          <div className="card">
            <i className="ph ph-file-pdf" />
            <h5>{t.feat3Title}</h5>
            <p>{t.feat3Desc}</p>
          </div>
        </div>
      </section>

      <section className="section" id="relatorio" style={{ paddingTop: 48 }}>
        <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
          <p className="kicker">{lang === "pt" ? "Fechamento do mês" : lang === "en" ? "Month closing" : "Cierre del mes"}</p>
          <h3 style={{ margin: 0 }}>
            {lang === "pt" ? "Do dia 5 ao dia 5, se for assim que sua vida funciona." :
             lang === "en" ? "From the 5th to the 5th, if that's how your life works." :
             "Del día 5 al día 5, si así funciona tu vida."}
          </h3>
          <p style={{ margin: 0, color: "var(--color-neutral-400)" }}>
            {lang === "pt" ? "Períodos personalizados para acompanhar o ciclo do salário, não o calendário." :
             lang === "en" ? "Custom periods to track your salary cycle, not the calendar." :
             "Períodos personalizados para seguir el ciclo del salario, no el calendario."}
          </p>
        </div>
      </section>

      <section className="cta" id="preco">
        <div className="box">
          <div style={{ flex: 1, minWidth: 260 }}>
            <h3 style={{ margin: "0 0 8px" }}>{t.ctaTitle}</h3>
            <p style={{ margin: 0, color: "var(--color-neutral-400)" }}>{t.ctaDesc}</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input className="input" placeholder={t.emailPlaceholder} value={email}
              onChange={e => setEmail(e.target.value)} style={{ width: 240 }} />
            <button className="btn btn-primary btn-lg" onClick={() => onCriarConta(email)}>{t.criarConta}</button>
          </div>
        </div>
        <p style={{ margin: "32px 0 0", fontSize: 12, color: "var(--color-neutral-700)" }}>
          {t.footer} · <a href="#/privacidade" style={{ color: "var(--color-neutral-500)" }}>{t.privLink}</a>
        </p>
      </section>
    </div>
  );
}