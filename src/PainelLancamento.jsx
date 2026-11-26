import { useEffect, useRef, useState } from "react";

// Painel de "Novo lançamento": lateral à direita no desktop, tela cheia subindo de baixo no celular.
// Só cuida da "casca" (fundo, foco preso, Esc, aviso de descartar, animação); o formulário vem em children.
// - sujo: a pessoa já preencheu algo → fundo/Esc/✕ perguntam "Descartar o lançamento?" antes de fechar.
// - bloqueado: outro diálogo aberto por cima (ex.: novo atalho) → Esc não fecha o painel.
// - onFechar: chamado depois da animação de saída (200ms; imediato com prefers-reduced-motion).
// - fecharRef: recebe a função de fechar, para o botão Cancelar do formulário (fecha sem perguntar).
const FOCAVEIS = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const semMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function PainelLancamento({ titulo, sujo, bloqueado, onFechar, fecharRef, focoInicialId, t, children }) {
  const painelRef = useRef(null);
  const continuarRef = useRef(null);
  const [saindo, setSaindo] = useState(false);
  const [perguntar, setPerguntar] = useState(false);

  function fechar() {
    if (saindo) return;
    setSaindo(true);
    setTimeout(onFechar, semMovimento() ? 0 : 200);
  }
  // fundo, Esc e ✕: com algo preenchido, pergunta antes
  function pedirFechar() {
    if (sujo) setPerguntar(true); else fechar();
  }
  if (fecharRef) fecharRef.current = fechar;

  // foco inicial no campo de valor; trava a rolagem da página atrás
  useEffect(() => {
    const alvo = (focoInicialId && document.getElementById(focoInicialId)) || painelRef.current;
    alvo && alvo.focus();
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, []);

  // aviso aberto: foco em "Continuar"; aviso fechado (Continuar/Esc): foco volta para o formulário
  const perguntou = useRef(false);
  useEffect(() => {
    if (perguntar) { perguntou.current = true; continuarRef.current && continuarRef.current.focus(); return; }
    if (!perguntou.current) return;
    perguntou.current = false;
    const alvo = (focoInicialId && document.getElementById(focoInicialId)) || painelRef.current;
    alvo && alvo.focus();
  }, [perguntar]);
  useEffect(() => { if (!sujo) setPerguntar(false); }, [sujo]);

  useEffect(() => {
    const tecla = e => {
      if (e.key !== "Escape" || bloqueado) return;
      e.preventDefault();
      if (perguntar) setPerguntar(false); else pedirFechar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  });

  // foco preso: Tab e Shift+Tab giram só dentro do painel
  function prenderFoco(e) {
    if (e.key !== "Tab") return;
    const itens = [...painelRef.current.querySelectorAll(FOCAVEIS)].filter(el => el.getClientRects().length > 0);
    if (!itens.length) return;
    const primeiro = itens[0], ultimo = itens[itens.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }

  return (
    <div className="painel-camada" data-saindo={saindo}>
      <div className="painel-fundo" onClick={() => !bloqueado && pedirFechar()} />
      <div ref={painelRef} className="painel" role="dialog" aria-modal="true" aria-labelledby="painel-titulo"
        tabIndex={-1} onKeyDown={prenderFoco}>
        <div className="painel-topo">
          <h2 id="painel-titulo" className="painel-titulo">{titulo}</h2>
          <button type="button" className="btn btn-icon btn-ghost painel-x" aria-label={t.fecharPainel} title={t.fecharPainel} onClick={pedirFechar}>
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>
        {perguntar && (
          <div className="painel-descartar" role="alertdialog" aria-labelledby="painel-descartar-txt">
            <p id="painel-descartar-txt">{t.descartarPergunta}</p>
            <div className="painel-descartar-acoes">
              <button type="button" className="btn btn-danger" onClick={fechar}>{t.descartar}</button>
              <button type="button" ref={continuarRef} className="btn btn-secondary" onClick={() => setPerguntar(false)}>{t.continuar}</button>
            </div>
          </div>
        )}
        <div className="painel-corpo">{children}</div>
      </div>
    </div>
  );
}
