import { fmt } from "./App";
import { calcularSimulacao } from "./simulacao";

const ICONES = {
  trabalhar: "ph ph-briefcase",
  bolsa: "ph ph-graduation-cap",
  credito: "ph ph-bank",
};

const COR_STATUS = {
  folga: "var(--color-accent-300)",
  apertado: "var(--color-accent-100)",
  estoura: "var(--color-negative)",
};

function Campo({ label, value, onChange, prefixo = "R$", placeholder = "0,00" }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="valor-field">
        <span>{prefixo}</span>
        <input inputMode="decimal" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export default function Simulador({ txs, sim, setSim, privado, t }) {
  const m = v => (privado ? "R$ ••••" : fmt(v));
  const set = campo => valor => setSim(s => ({ ...s, [campo]: valor }));
  const r = calcularSimulacao(sim, txs);

  const nomes = { trabalhar: t.simTrabalhar, bolsa: t.simBolsaNome, credito: t.simCredito };
  const avisos = { trabalhar: t.simAvisoTrabalhar, bolsa: t.simAvisoBolsa, credito: t.simAvisoCredito };
  const statusTxt = { folga: t.simFolga, apertado: t.simApertado, estoura: t.simEstoura };
  const algumCabe = r.cenarios.some(c => c.sobra >= 0);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 980 }}>
      <div className="proj-note">
        <i className="ph ph-lightbulb" style={{ fontSize: 20, color: "var(--color-accent-300)", flex: "none" }} />
        <p style={{ fontSize: 13 }}>{t.simIntro}</p>
      </div>

      <div className="dash-row">
        {/* Passo 1: o que o estudante informa */}
        <div className="card" style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <p className="card-title" style={{ margin: 0 }}>1. {t.simSeusNumeros}</p>
          <Campo label={t.simMensalidade} value={sim.mensalidade} onChange={set("mensalidade")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo label={t.simSalario} value={sim.salario} onChange={set("salario")} />
            <Campo label={t.simBolsa} value={sim.bolsaPct} onChange={set("bolsaPct")} prefixo="%" placeholder="50" />
            <Campo label={t.simParcela} value={sim.parcela} onChange={set("parcela")} />
            <Campo label={t.simMeses} value={sim.meses} onChange={set("meses")} prefixo="#" placeholder="48" />
          </div>
        </div>

        {/* Passo 2: a base que vem dos lançamentos reais */}
        <div className="card" style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <p className="card-title" style={{ margin: 0 }}>2. {t.simBase}</p>
          <Campo label={t.simRendaBase} value={sim.rendaBase} onChange={set("rendaBase")}
            placeholder={r.auto.nMeses ? r.auto.renda.toFixed(2).replace(".", ",") : "0,00"} />
          <Campo label={t.simGastosBase} value={sim.gastosBase} onChange={set("gastosBase")}
            placeholder={r.auto.nMeses ? r.auto.gastos.toFixed(2).replace(".", ",") : "0,00"} />
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-neutral-500)" }}>
            {r.auto.nMeses
              ? `${t.simBaseAutoA} ${r.auto.nMeses} ${t.simBaseAutoB}`
              : t.simSemBase}
          </p>
          {(sim.rendaBase !== "" || sim.gastosBase !== "") && (
            <button className="btn btn-ghost" style={{ justifySelf: "start", fontSize: 12, gap: 6 }}
              onClick={() => setSim(s => ({ ...s, rendaBase: "", gastosBase: "" }))}>
              <i className="ph ph-arrow-counter-clockwise" /> {t.simUsarLancamentos}
            </button>
          )}
        </div>
      </div>

      {/* Passo 3: resultado */}
      <p className="card-title" style={{ margin: "8px 0 0" }}>3. {t.simCenarios}</p>

      {!r.valido ? (
        <div className="card"><p className="empty">{t.simPreencha}</p></div>
      ) : (
        <>
          <div className="kpi-row">
            {r.cenarios.map(c => {
              const cor = COR_STATUS[c.status];
              const melhor = c.id === r.melhor.id && c.sobra >= 0;
              return (
                <div key={c.id} className="kpi" style={{ display: "grid", gap: 10, alignContent: "start", outline: melhor ? "1px solid var(--color-accent)" : "none" }}>
                  <div className="line" style={{ background: `linear-gradient(to right, transparent, ${cor} 28px, ${cor} calc(100% - 28px), transparent)`, marginBottom: 6 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className={ICONES[c.id]} style={{ fontSize: 20, color: "var(--color-accent-300)" }} />
                    <p className="kicker" style={{ margin: 0, marginRight: "auto" }}>{nomes[c.id]}</p>
                    {melhor && <span className="tag tag-accent">★</span>}
                  </div>
                  <div>
                    <p className="value" style={{ color: cor, margin: 0 }}>{m(Math.abs(c.sobra))}</p>
                    <p className="note" style={{ margin: "2px 0 0" }}>{c.sobra >= 0 ? t.simSobra : t.simFalta}</p>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="bar-track" style={{ height: 6, borderRadius: 3 }}>
                      <div style={{ height: 6, borderRadius: 3, background: cor, width: Math.min(100, c.pct) + "%" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-neutral-500)" }}>
                      <span>{c.pct > 999 ? "999+" : c.pct}% {t.simComprometido}</span>
                      <span style={{ color: cor }}>{statusTxt[c.status]}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-neutral-400)" }}>
                    <span>{t.simEntra} {m(c.entra)}</span>
                    <span>{t.simSai} {m(c.sai)}</span>
                  </div>
                  {c.id === "credito" && (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--color-neutral-400)" }}>
                      {t.simDivida}: <strong style={{ color: "var(--color-negative)" }}>{m(c.divida)}</strong>
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-neutral-500)" }}>{avisos[c.id]}</p>
                </div>
              );
            })}
          </div>

          <div className="proj-note">
            <i className={algumCabe ? "ph ph-check-circle" : "ph ph-warning"} style={{ fontSize: 18, color: "var(--color-accent-300)", flex: "none" }} />
            <p>
              {algumCabe
                ? `${t.simMelhor} ${nomes[r.melhor.id]} (${m(r.melhor.sobra)}).`
                : t.simNenhumCabe}
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-neutral-600)" }}>{t.simLembrete}</p>
        </>
      )}
    </div>
  );
}
