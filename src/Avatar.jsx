// Avatar redondo: mostra a foto (data URL do perfil) ou a inicial do apelido.
export default function Avatar({ nome, foto, tamanho = "" }) {
  const classe = "avatar" + (tamanho ? " avatar-" + tamanho : "");
  if (foto) return <img className={classe + " avatar-foto"} src={foto} alt="" />;
  return <span className={classe}>{(nome || "?").trim().charAt(0).toUpperCase()}</span>;
}
