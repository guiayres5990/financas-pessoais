import { useState } from "react";

const CATS_DEMO = [
  { label: "Moradia", valor: 1500, cor: "var(--cat-moradia)" },
  { label: "Alimentação", valor: 1240, cor: "var(--cat-alimentacao)" },
  { label: "Transporte", valor: 480, cor: "var(--cat-transporte)" },
  { label: "Lazer", valor: 390.5, cor: "var(--cat-lazer)" },
];
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Landing({ onEntrar, onCriarConta, dark, onToggleTheme }) {
  const [email, setEmail] = useState("");
  const total = CATS_DEMO.reduce((s, c) => s + c.valor, 0);

  return (
    <div>
      <nav className="nav-bar">
        <span className="brand">
          <img src="/marca-capitalhub-accent.png" alt="" />
          Capital Hub
        </span>
        <div className="nav-links">
          <a href="#recursos">Recursos</a>
          <a href="#relatorio">Relatórios</a>
          <a href="#preco">Preço</a>
          <button className="btn btn-icon btn-secondary" onClick={onToggleTheme} title="Alternar tema">
            <i className={dark ? "ph ph-sun" : "ph ph-moon"} style={{ fontSize: 16 }} />
          </button>
          <button className="btn btn-secondary" onClick={onEntrar}>Entrar</button>
          <button className="btn btn-primary" onClick={onCriarConta}>Criar conta grátis</button>
        </div>
      </nav>

      <section className="hero">
        <div>
          <span className="tag tag-outline">Grátis · sem cartão</span>
          <h1>Cada real com um destino.</h1>
          <p className="lede">
            Anote um gasto em doze segundos, veja o mês inteiro numa tela só e feche o mês
            com um relatório que dá orgulho de mostrar.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-lg" onClick={onCriarConta}>Começar agora</button>
            <button className="btn btn-secondary btn-lg" onClick={onEntrar}>Já tenho conta</button>
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: "var(--color-neutral-600)" }}>
            Seus dados ficam na sua conta. Exporte em CSV ou PDF quando quiser.
          </p>
        </div>

        <div className="card-lg" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div>
              <p className="kicker">Saldo do mês</p>
              <p style={{ margin: "4px 0 0", fontSize: 30, fontFamily: "var(--font-heading)", color: "var(--color-accent-300)" }}>
                {fmt(2212.5)}
              </p>
            </div>
            <span className="tag tag-accent">no orçamento</span>
          </div>
          <hr className="rule" />
          <div style={{ display: "grid", gap: 11 }}>
            {CATS_DEMO.map(c => (
              <div key={c.label} className="cat-row">
                <div className="cat-head">
                  <span className="dot" style={{ background: c.cor }} />
                  <span className="name">{c.label}</span>
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
          <div>
            <p className="big">12s</p>
            <p>para registrar um gasto — valor, categoria, pronto.</p>
          </div>
          <div>
            <p className="big">7</p>
            <p>categorias do dia a dia, sem planilha para configurar.</p>
          </div>
          <div>
            <p className="big">1 clique</p>
            <p>e o mês vira um relatório em PDF pronto para enviar.</p>
          </div>
        </div>
      </section>

      <section className="section" id="recursos">
        <h2 style={{ maxWidth: "24ch" }}>Três telas. Nada além do necessário.</h2>
        <p style={{ maxWidth: "52ch", color: "var(--color-neutral-400)" }}>
          Feito para quem desistiu de planilhas: entra, lança, entende. O resto o app calcula.
        </p>
        <div className="feature-grid">
          <div className="card">
            <i className="ph ph-plus-circle" />
            <h5>Lançar sem preguiça</h5>
            <p>Despesa ou receita, valor, categoria e data. O formulário caber numa mão é a única meta.</p>
          </div>
          <div className="card">
            <i className="ph ph-chart-donut" />
            <h5>O mês antes de acabar</h5>
            <p>Projeção de gastos no ritmo atual, comparada com a sua receita — o aviso chega antes do estrago.</p>
          </div>
          <div className="card">
            <i className="ph ph-file-pdf" />
            <h5>Relatório de gente grande</h5>
            <p>Escolha o período, gere o PDF com resumo, categorias e cada lançamento listado.</p>
          </div>
        </div>
      </section>

      <section className="section" id="relatorio" style={{ paddingTop: 48 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, maxWidth: 620 }}>
          <p className="kicker">Fechamento do mês</p>
          <h3 style={{ margin: 0 }}>Do dia 5 ao dia 5, se for assim que sua vida funciona.</h3>
          <p style={{ margin: 0, color: "var(--color-neutral-400)" }}>
            Períodos personalizados para acompanhar o ciclo do salário, não o calendário.
            O PDF sai com o mesmo visual do app.
          </p>
        </div>
      </section>

      <section className="cta" id="preco">
        <div className="box">
          <div style={{ flex: 1, minWidth: 260 }}>
            <h3 style={{ margin: "0 0 8px" }}>Comece hoje, com o gasto do café.</h3>
            <p style={{ margin: 0, color: "var(--color-neutral-400)" }}>
              Conta gratuita, sem cartão. Leva menos de um minuto.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: 240 }}
            />
            <button className="btn btn-primary btn-lg" onClick={() => onCriarConta(email)}>Criar conta</button>
          </div>
        </div>
        <p style={{ margin: "32px 0 0", fontSize: 12, color: "var(--color-neutral-700)" }}>
          Capital Hub · feito no Brasil · privacidade primeiro
        </p>
      </section>
    </div>
  );
}
