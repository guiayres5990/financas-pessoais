// Ferramentas da página de Perfil: CPF, telefone, data de nascimento e foto.
// Nada aqui grava no banco; só valida e formata.

export const so = s => String(s || "").replace(/\D/g, "");

// ── CPF ──────────────────────────────────────────────
// 000.000.000-00 conforme a pessoa digita
export function mascaraCpf(valor) {
  const d = so(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

// Confere os dois dígitos verificadores
export function cpfValido(valor) {
  const d = so(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = n => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

// ***.***.***-XX (só os 2 últimos dígitos à mostra)
export const cpfOculto = cpf => "***.***.***-" + so(cpf).slice(-2);

// ── Telefone ─────────────────────────────────────────
// (11) 0000-0000, (11) 90000-0000 ou +55 (11) 90000-0000
export function mascaraTelefone(valor) {
  const d = so(valor).slice(0, 13);
  if (d.length > 11) {
    const pais = d.slice(0, d.length - 11), resto = d.slice(-11);
    return `+${pais} (${resto.slice(0, 2)}) ${resto.slice(2, 7)}-${resto.slice(7)}`;
  }
  if (d.length <= 2) return d.length ? "(" + d : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export const telefoneValido = valor => { const n = so(valor).length; return n >= 10 && n <= 13; };

// ── Data de nascimento (AAAA-MM-DD) ──────────────────
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export function limitesNascimento() {
  const hoje = new Date();
  const min = new Date(hoje.getFullYear() - 120, hoje.getMonth(), hoje.getDate());
  return { min: iso(min), max: iso(hoje) };
}
export function nascimentoValido(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) return false;
  const { min, max } = limitesNascimento();
  return valor >= min && valor <= max; // comparar AAAA-MM-DD como texto funciona
}

// ── Foto ─────────────────────────────────────────────
export const FOTO_TIPOS = ["image/jpeg", "image/png", "image/webp"];
export const FOTO_MAX_ENTRADA = 5 * 1024 * 1024; // 5 MB
export const FOTO_MAX_CARACTERES = 120000;

function carregar(arquivo) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem")); };
    img.src = url;
  });
}

// Recorta o quadrado central, reduz para no máximo 256x256 e exporta JPEG.
// Se passar de 120.000 caracteres, baixa a qualidade e depois o tamanho.
// Lança Error("tipo" | "tamanho" | "imagem" | "grande").
export async function processarFoto(arquivo) {
  if (!arquivo || !FOTO_TIPOS.includes(arquivo.type)) throw new Error("tipo");
  if (arquivo.size > FOTO_MAX_ENTRADA) throw new Error("tamanho");
  const img = await carregar(arquivo);
  const lado = Math.min(img.naturalWidth, img.naturalHeight);
  if (!lado) throw new Error("imagem");
  const sx = (img.naturalWidth - lado) / 2, sy = (img.naturalHeight - lado) / 2;
  for (const tamanho of [256, 192, 128, 96]) {
    const t = Math.min(tamanho, lado);
    const canvas = document.createElement("canvas");
    canvas.width = t; canvas.height = t;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // JPEG não tem transparência
    ctx.fillRect(0, 0, t, t);
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, t, t);
    for (const qualidade of [0.8, 0.7, 0.6, 0.5]) {
      const dataUrl = canvas.toDataURL("image/jpeg", qualidade);
      if (dataUrl.length < FOTO_MAX_CARACTERES) return dataUrl;
    }
  }
  throw new Error("grande");
}
