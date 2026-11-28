import Logo from "./Logo";

// Telas vazias do app (sem lançamentos). Só interface: não leem nem gravam nada no banco.

// Cartão de boas-vindas da Visão geral, para a conta que ainda não tem nenhum lançamento.
export function BoasVindas({ apelido, t, onNovo }) {
  const titulo = apelido ? t.boasVindasTitulo.replace("{nome}", apelido) : t.boasVindasTituloSemNome;
  const passos = [
    { icone: "ph-pencil-simple-line", t: t.passoAnoteT, d: t.passoAnoteD },
    { icone: "ph-tag", t: t.passoClassT, d: t.passoClassD },
    { icone: "ph-chart-pie-slice", t: t.passoAcompT, d: t.passoAcompD },
  ];
  return (
    <section className="boas-vindas" aria-labelledby="boas-vindas-titulo">
      <span className="boas-vindas-falcao" aria-hidden="true"><Logo variant="simbolo" /></span>
      <h2 id="boas-vindas-titulo" className="boas-vindas-titulo">{titulo}</h2>
      <p className="boas-vindas-texto">{t.boasVindasTexto}</p>
      <button type="button" className="btn btn-cheio vazio-btn" onClick={onNovo}>
        <i className="ph ph-plus" aria-hidden="true" /> {t.primeiroLancamentoBtn}
      </button>
      <ol className="boas-vindas-passos">
        {passos.map((p, i) => (
          <li key={p.t}>
            <span className="boas-vindas-icone" aria-hidden="true"><i className={"ph " + p.icone} /></span>
            <div>
              <p className="boas-vindas-passo-t"><span aria-hidden="true">{i + 1} · </span>{p.t}</p>
              <p className="boas-vindas-passo-d">{p.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Mensagem de vazio dentro de um cartão: falcão opcional, título opcional, texto e botão opcional.
export function Vazio({ titulo, texto, falcao = false, botao, onBotao, id }) {
  return (
    <div className="vazio" id={id}>
      {falcao && <span className="vazio-falcao" aria-hidden="true"><Logo variant="simbolo" /></span>}
      {titulo && <p className="vazio-titulo">{titulo}</p>}
      <p className="vazio-texto">{texto}</p>
      {botao && (
        <button type="button" className="btn btn-secondary vazio-btn" onClick={onBotao}>
          <i className="ph ph-plus" aria-hidden="true" /> {botao}
        </button>
      )}
    </div>
  );
}
