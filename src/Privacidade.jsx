import Logo from "./Logo";

// Contato de privacidade (LGPD). O responsável (controlador) é o próprio projeto FALC.
// Se EMAIL_CONTATO ficar vazio, a página mostra "e-mail de contato em breve".
const EMAIL_CONTATO = "falc.empresa@gmail.com";

// Troca {email} pelo endereço real, como link clicável.
function Item({ texto, t }) {
  if (!texto.includes("{email}")) return <li>{texto}</li>;
  const [antes, depois] = texto.split("{email}");
  return (
    <li>
      {antes}
      {EMAIL_CONTATO
        ? <a href={"mailto:" + EMAIL_CONTATO}>{EMAIL_CONTATO}</a>
        : <em>{t.privEmailEmBreve}</em>}
      {depois}
    </li>
  );
}

export default function Privacidade({ t, onVoltar, topo }) {
  const voltar = (
    <button className="btn btn-secondary" style={{ gap: 8 }} onClick={onVoltar}>
      <i className="ph ph-arrow-left" style={{ fontSize: 15 }} /> {t.voltar}
    </button>
  );

  return (
    <div>
      <nav className="nav-bar">
        <span className="brand"><Logo variant="horizontal" className="logo-landing" /></span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {topo}
          {voltar}
        </div>
      </nav>

      <main className="section" style={{ maxWidth: 780, paddingTop: 32, display: "grid", gap: 14 }}>
        <p className="kicker">LGPD</p>
        <h2 style={{ margin: 0 }}>{t.privTitulo}</h2>
        <p style={{ margin: 0, color: "var(--color-neutral-400)" }}>{t.privIntro}</p>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-neutral-500)" }}>{t.privAtualizado}</p>

        {(t.privSecoes || []).map(s => (
          <section key={s.titulo} className="card" style={{ display: "grid", gap: 8 }}>
            <h5 style={{ margin: 0 }}>{s.titulo}</h5>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 14, color: "var(--color-neutral-300)" }}>
              {s.itens.map(i => <Item key={i} texto={i} t={t} />)}
            </ul>
          </section>
        ))}

        <p style={{ margin: "24px 0 0", fontSize: 12, color: "var(--color-neutral-600)" }}>{t.footer}</p>
      </main>
    </div>
  );
}
