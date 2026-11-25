import { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";

// Chip da conta no rodapé da barra lateral + menu (popover) com Perfil, Exportar CSV,
// Legal (abre a Política de Privacidade) e Sair. Excluir a conta fica na página de Perfil.
// Fecha com Esc, clique fora ou ao escolher um item.
export default function MenuConta({ apelido, foto, email, t, onPerfil, onExportar, onPrivacidade, onSair }) {
  const [aberto, setAberto] = useState(false);
  const [topoCelular, setTopoCelular] = useState(0);
  const caixa = useRef(null);
  const chip = useRef(null);

  function abrirFechar() {
    if (!aberto && chip.current) setTopoCelular(chip.current.getBoundingClientRect().bottom + 8);
    setAberto(a => !a);
  }
  function escolher(acao) { setAberto(false); acao(); }

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

  const Item = ({ icone, texto, onClick, destaque }) => (
    <button type="button" role="menuitem" className="conta-item" onClick={onClick}>
      <i className={"ph " + icone} />
      <span className={destaque ? "link-destaque" : undefined}>{texto}</span>
    </button>
  );

  return (
    <div className="conta" ref={caixa}>
      <button ref={chip} type="button" className="conta-chip" aria-haspopup="menu" aria-expanded={aberto}
        aria-label={t.menuConta} onClick={abrirFechar}>
        <Avatar nome={apelido || email} foto={foto} />
        <span className="conta-chip-txt">
          <span className="conta-chip-nome">{apelido}</span>
          <span className="conta-chip-plano">{t.planoGratuito}</span>
        </span>
        <i className="ph ph-caret-up-down conta-chip-icone" />
      </button>

      {aberto && (
        <div className="conta-menu" role="menu" style={{ "--menu-top": topoCelular + "px" }}>
          <div className="conta-cab">
            <Avatar nome={apelido || email} foto={foto} tamanho="lg" />
            <div style={{ minWidth: 0 }}>
              <p className="conta-cab-nome">{apelido}</p>
              <p className="conta-cab-email" title={email}>{email}</p>
            </div>
          </div>
          <div className="conta-div" />
          <Item icone="ph-user-circle" texto={t.menuPerfil} onClick={() => escolher(onPerfil)} />
          <Item icone="ph-download-simple" texto={t.exportarCSV} onClick={() => escolher(onExportar)} />
          <Item icone="ph-scales" texto={t.menuLegal} destaque onClick={() => escolher(onPrivacidade)} />
          <div className="conta-div" />
          <Item icone="ph-sign-out" texto={t.sair} onClick={() => escolher(onSair)} />
        </div>
      )}
    </div>
  );
}
