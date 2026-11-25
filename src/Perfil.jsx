import { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";
import {
  so, mascaraCpf, cpfValido, cpfOculto, mascaraTelefone, telefoneValido,
  limitesNascimento, nascimentoValido, processarFoto,
} from "./perfilUtil";

// Página de Perfil: cards "Conta", "Dados opcionais" e "Zona de perigo".
// Quem grava no banco é o App (onSalvar recebe o perfil COMPLETO e faz setDoc sem merge).
export default function Perfil({ email, perfil, apelidoPadrao, t, onSalvar, onExcluir }) {
  const salvo = perfil || {};
  const base = {
    apelido: salvo.apelido || apelidoPadrao,
    cpf: salvo.cpf, nascimento: salvo.nascimento, telefone: salvo.telefone, foto: salvo.foto,
  };

  // ── card Conta ──
  const [apelidoTxt, setApelidoTxt] = useState(base.apelido);
  const [msgConta, setMsgConta] = useState(null); // { ok: bool, texto }
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [msgFoto, setMsgFoto] = useState(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [menuAvatar, setMenuAvatar] = useState(false);
  const arquivoRef = useRef(null);
  const avatarRef = useRef(null);
  const avatarBotaoRef = useRef(null);

  // Mini menu do avatar fecha com Esc ou clique fora
  useEffect(() => {
    if (!menuAvatar) return;
    const fora = e => { if (avatarRef.current && !avatarRef.current.contains(e.target)) setMenuAvatar(false); };
    const tecla = e => { if (e.key === "Escape") { setMenuAvatar(false); avatarBotaoRef.current?.focus(); } };
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [menuAvatar]);

  // O aviso de sucesso some sozinho depois de alguns segundos
  useEffect(() => {
    if (!msgFoto || !msgFoto.ok) return;
    const id = setTimeout(() => setMsgFoto(null), 3000);
    return () => clearTimeout(id);
  }, [msgFoto]);

  function cliqueAvatar() {
    if (processandoFoto) return;
    setMsgFoto(null);
    if (base.foto) setMenuAvatar(m => !m);       // com foto: abre o mini menu
    else arquivoRef.current && arquivoRef.current.click(); // sem foto: seletor direto
  }
  function mudarAvatar() {
    setMenuAvatar(false);
    arquivoRef.current && arquivoRef.current.click();
  }

  // ── card Dados opcionais ──
  const [cpfEditando, setCpfEditando] = useState(!salvo.cpf);
  const [cpfTxt, setCpfTxt] = useState("");
  const [nascTxt, setNascTxt] = useState(salvo.nascimento || "");
  const [telTxt, setTelTxt] = useState(mascaraTelefone(salvo.telefone || ""));
  const [erros, setErros] = useState({});
  const [msgOpc, setMsgOpc] = useState(null);
  const [salvandoOpc, setSalvandoOpc] = useState(false);
  const { min: nascMin, max: nascMax } = limitesNascimento();

  // Quando o perfil muda no banco (depois de salvar), os campos acompanham
  useEffect(() => { setApelidoTxt(base.apelido); }, [salvo.apelido]); // eslint-disable-line
  useEffect(() => {
    setCpfEditando(!salvo.cpf); setCpfTxt("");
    setNascTxt(salvo.nascimento || "");
    setTelTxt(mascaraTelefone(salvo.telefone || ""));
  }, [salvo.cpf, salvo.nascimento, salvo.telefone]);

  async function salvarConta() {
    const nome = apelidoTxt.trim();
    if (nome.length < 1 || nome.length > 30) { setMsgConta({ ok: false, texto: t.apelidoErro }); return; }
    setSalvandoConta(true); setMsgConta(null);
    try { await onSalvar({ ...base, apelido: nome }); setMsgConta({ ok: true, texto: t.salvo }); }
    catch { setMsgConta({ ok: false, texto: t.erroSalvar }); }
    setSalvandoConta(false);
  }

  async function trocarFoto(e) {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setProcessandoFoto(true); setMsgFoto(null);
    try {
      const foto = await processarFoto(arquivo);
      await onSalvar({ ...base, foto });
      setMsgFoto({ ok: true, texto: t.fotoSalva });
    } catch (err) {
      const chave = { tipo: "fotoErroTipo", tamanho: "fotoErroTamanho", imagem: "fotoErroProcessar", grande: "fotoErroProcessar" }[err.message];
      setMsgFoto({ ok: false, texto: chave ? t[chave] : t.erroSalvar });
    }
    setProcessandoFoto(false);
  }

  // Remove o campo foto (setDoc sem merge, sem "foto", mantendo os outros campos)
  async function removerFoto() {
    setMenuAvatar(false);
    setProcessandoFoto(true); setMsgFoto(null);
    try { await onSalvar({ ...base, foto: undefined }); setMsgFoto({ ok: true, texto: t.fotoRemovida }); }
    catch { setMsgFoto({ ok: false, texto: t.erroSalvar }); }
    setProcessandoFoto(false);
    avatarBotaoRef.current?.focus();
  }

  async function salvarOpcionais() {
    const novos = {};
    const e = {};
    // CPF: se não estiver editando, mantém o salvo; vazio = remove
    if (cpfEditando) {
      const d = so(cpfTxt);
      if (d && !cpfValido(d)) e.cpf = t.cpfInvalido; else novos.cpf = d || undefined;
    } else novos.cpf = salvo.cpf;
    if (nascTxt && !nascimentoValido(nascTxt)) e.nasc = t.nascimentoInvalido; else novos.nascimento = nascTxt || undefined;
    const tel = so(telTxt);
    if (tel && !telefoneValido(tel)) e.tel = t.telefoneInvalido; else novos.telefone = tel || undefined;
    setErros(e); setMsgOpc(null);
    if (Object.keys(e).length) return;
    setSalvandoOpc(true);
    try { await onSalvar({ ...base, ...novos }); setMsgOpc({ ok: true, texto: t.salvo }); }
    catch { setMsgOpc({ ok: false, texto: t.erroSalvar }); }
    setSalvandoOpc(false);
  }

  const Msg = ({ m }) => m ? <p className={m.ok ? "perfil-msg-ok" : "perfil-msg-erro"}>{m.texto}</p> : null;
  const Erro = ({ texto }) => texto ? <p className="perfil-msg-erro">{texto}</p> : null;

  return (
    <div className="perfil-pagina">
      {/* ── Conta ── */}
      <section className="perfil-card">
        <h3 className="perfil-titulo">{t.contaTitulo}</h3>
        <div className="perfil-conta">
          <div className="perfil-campos">
            <div className="field">
              <label>{t.emailCadastrado}</label>
              <input className="input" value={email} readOnly disabled />
            </div>
            <div className="field">
              <label>{t.nomeExibicao}</label>
              <div className="perfil-linha">
                <input className="input" value={apelidoTxt} maxLength={30} disabled={salvandoConta}
                  onChange={ev => { setApelidoTxt(ev.target.value); setMsgConta(null); }}
                  onKeyDown={ev => ev.key === "Enter" && salvarConta()} />
                <button className="btn btn-primary" disabled={salvandoConta || !apelidoTxt.trim() || apelidoTxt.trim() === base.apelido}
                  onClick={salvarConta}>
                  {salvandoConta ? t.salvando : t.salvarApelido}
                </button>
              </div>
            </div>
            <Msg m={msgConta} />
          </div>
          <div className="perfil-avatar">
            <div className="avatar-ancora" ref={avatarRef}>
              <button ref={avatarBotaoRef} type="button" className="avatar-botao"
                aria-label={base.foto ? t.avatarOpcoes : t.avatarEscolher}
                aria-haspopup={base.foto ? "menu" : undefined}
                aria-expanded={base.foto ? menuAvatar : undefined}
                aria-busy={processandoFoto}
                data-carregando={processandoFoto}
                onClick={cliqueAvatar}>
                <Avatar nome={base.apelido} foto={base.foto} tamanho="xl" />
                <span className="avatar-sobre" aria-hidden="true">
                  <i className={"ph " + (processandoFoto ? "ph-spinner-gap avatar-girando" : base.foto ? "ph-pencil-simple" : "ph-camera")} />
                </span>
              </button>
              {menuAvatar && base.foto && (
                <div className="avatar-menu" role="menu">
                  <button type="button" role="menuitem" className="conta-item" onClick={mudarAvatar}>
                    <i className="ph ph-image" /> <span>{t.avatarMudar}</span>
                  </button>
                  <button type="button" role="menuitem" className="conta-item avatar-menu-perigo" onClick={removerFoto}>
                    <i className="ph ph-trash" /> <span>{t.avatarRemover}</span>
                  </button>
                </div>
              )}
            </div>
            <input ref={arquivoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={trocarFoto} />
            <p className="avatar-dica" role="status" aria-live="polite">
              {processandoFoto ? t.salvando : msgFoto ? <span className={msgFoto.ok ? "perfil-msg-ok" : "perfil-msg-erro"}>{msgFoto.texto}</span> : null}
            </p>
          </div>
        </div>
      </section>

      {/* ── Dados opcionais ── */}
      <section className="perfil-card">
        <h3 className="perfil-titulo">{t.opcionaisTitulo}</h3>
        <p className="perfil-aviso">
          {t.opcionaisAviso} <a href="#/privacidade">{t.privLink}</a>.
        </p>
        <div className="perfil-grid">
          <div className="field">
            <label>{t.cpfLabel}</label>
            {cpfEditando ? (
              <input className="input" inputMode="numeric" placeholder="000.000.000-00" value={cpfTxt} disabled={salvandoOpc}
                onChange={ev => { setCpfTxt(mascaraCpf(ev.target.value)); setErros(x => ({ ...x, cpf: null })); setMsgOpc(null); }} />
            ) : (
              <div className="perfil-linha">
                <input className="input" value={cpfOculto(salvo.cpf)} readOnly disabled />
                <button className="btn btn-secondary" onClick={() => { setCpfEditando(true); setCpfTxt(""); }}>{t.alterar}</button>
              </div>
            )}
            <Erro texto={erros.cpf} />
          </div>
          <div className="field">
            <label>{t.nascimentoLabel}</label>
            <input className="input" type="date" min={nascMin} max={nascMax} value={nascTxt} disabled={salvandoOpc}
              onChange={ev => { setNascTxt(ev.target.value); setErros(x => ({ ...x, nasc: null })); setMsgOpc(null); }} />
            <Erro texto={erros.nasc} />
          </div>
          <div className="field">
            <label>{t.telefoneLabel}</label>
            <input className="input" inputMode="tel" placeholder="(11) 90000-0000" value={telTxt} disabled={salvandoOpc}
              onChange={ev => { setTelTxt(mascaraTelefone(ev.target.value)); setErros(x => ({ ...x, tel: null })); setMsgOpc(null); }} />
            <Erro texto={erros.tel} />
          </div>
        </div>
        <div className="perfil-acoes">
          <Msg m={msgOpc} />
          <button className="btn btn-primary" disabled={salvandoOpc} onClick={salvarOpcionais}>
            {salvandoOpc ? t.salvando : t.salvarDados}
          </button>
        </div>
      </section>

      {/* ── Zona de perigo ── */}
      <section className="perfil-card perfil-perigo">
        <h3 className="perfil-titulo">{t.perigoTitulo}</h3>
        <p className="perfil-aviso">{t.perigoTexto}</p>
        <div>
          <button className="btn btn-danger" onClick={onExcluir}>
            <i className="ph ph-trash" /> {t.excluirConta}
          </button>
        </div>
      </section>
    </div>
  );
}
