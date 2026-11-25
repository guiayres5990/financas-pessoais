import { useState, useEffect, useRef } from "react";

// Chip da conta no rodapé da barra lateral + menu (popover) com Perfil, Exportar CSV,
// Legal (submenu: Política de Privacidade e Excluir minha conta) e Sair.
// Fecha com Esc, clique fora ou ao escolher um item.
export default function MenuConta({ apelido, email, t, onPerfil, onExportar, onPrivacidade, onExcluir, onSair }) {
  const [aberto, setAberto] = useState(false);
  const [painel, setPainel] = useState("principal"); // "principal" | "legal"
  const [topoCelular, setTopoCelular] = useState(0);
  const caixa = useRef(null);
  const chip = useRef(null);
  const inicial = (apelido || email || "?").trim().charAt(0).toUpperCase();

  function abrirFechar() {
    if (!aberto && chip.current) setTopoCelular(chip.current.getBoundingClientRect().bottom + 8);
    setPainel("principal");
    setAberto(a => !a);
  }
  function escolher(acao) { setAberto(false); setPainel("principal"); acao(); }

  useEffect(() => {
    if (!aberto) return;
    const fora = e => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
    const tecla = e => { if (e.key === "Escape") { setAberto(false); chip.current?.focus(); } };
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const Item = ({ icone, texto, onClick, perigo, seta }) => (
    <button type="button" role="menuitem" className={"conta-item" + (perigo ? " conta-item-perigo" : "")} onClick={onClick}>
      <i className={"ph " + icone} />
      <span>{texto}</span>
      {seta && <i className="ph ph-caret-right conta-seta" />}
    </button>
  );

  return (
    <div className="conta" ref={caixa}>
      <button ref={chip} type="button" className="conta-chip" aria-haspopup="menu" aria-expanded={aberto}
        aria-label={t.menuConta} onClick={abrirFechar}>
        <span className="avatar">{inicial}</span>
        <span className="conta-chip-txt">
          <span className="conta-chip-nome">{apelido}</span>
          <span className="conta-chip-plano">{t.planoGratuito}</span>
        </span>
        <i className="ph ph-caret-up-down conta-chip-icone" />
      </button>

      {aberto && (
        <div className="conta-menu" role="menu" style={{ "--menu-top": topoCelular + "px" }}>
          {painel === "principal" ? (
            <>
              <div className="conta-cab">
                <span className="avatar avatar-lg">{inicial}</span>
                <div style={{ minWidth: 0 }}>
                  <p className="conta-cab-nome">{apelido}</p>
                  <p className="conta-cab-email" title={email}>{email}</p>
                </div>
              </div>
              <div className="conta-div" />
              <Item icone="ph-user-circle" texto={t.menuPerfil} onClick={() => escolher(onPerfil)} />
              <Item icone="ph-download-simple" texto={t.exportarCSV} onClick={() => escolher(onExportar)} />
              <Item icone="ph-scales" texto={t.menuLegal} seta onClick={() => setPainel("legal")} />
              <div className="conta-div" />
              <Item icone="ph-sign-out" texto={t.sair} onClick={() => escolher(onSair)} />
            </>
          ) : (
            <>
              <button type="button" className="conta-item conta-voltar" onClick={() => setPainel("principal")}>
                <i className="ph ph-caret-left" />
                <span>{t.menuLegal}</span>
              </button>
              <div className="conta-div" />
              <Item icone="ph-shield-check" texto={t.privLink} onClick={() => escolher(onPrivacidade)} />
              <Item icone="ph-trash" texto={t.excluirConta} perigo onClick={() => escolher(onExcluir)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
