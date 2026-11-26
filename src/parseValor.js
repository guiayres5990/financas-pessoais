// Leitura do valor digitado em qualquer campo de dinheiro. Função pura: não grava nada.
// Retorna { ok: true, valor } (número com até 2 casas) ou { ok: false, erro }, com
// erro = "vazio" | "invalido" | "negativo" | "zero" | "casas" | "maximo".
//
// Regras:
// - Ignora espaços, "R$" e "$".
// - Português: ponto = milhar, vírgula = decimal. Inglês: o inverso.
// - Com os dois separadores, o ÚLTIMO é o decimal (em qualquer idioma).
// - Com um só tipo de separador:
//   · se for o decimal do idioma, é decimal (aparecendo mais de uma vez, é erro);
//   · se for o de milhar do idioma, é ambíguo: 1 ou 2 dígitos depois = decimal ("1.5" → 1,5);
//     grupos de exatamente 3 dígitos = milhar ("1.000" → 1000); qualquer outra coisa = erro.
// - Mais de 2 casas decimais, zero, negativo, letras e acima de 999.999.999,99 são recusados.

export const VALOR_MAXIMO = 999999999.99;

const erro = e => ({ ok: false, erro: e });
const esc = c => (c === "." ? "\\." : c);

export function parseValor(texto, idioma = "pt") {
  const s = String(texto ?? "").replace(/\s+/g, "").replace(/R\$/gi, "").replace(/\$/g, "");
  if (!s) return erro("vazio");
  if (s.includes("-")) return erro("negativo");
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return erro("invalido");

  const decIdioma = idioma === "en" ? "." : ",";
  const temPonto = s.includes("."), temVirgula = s.includes(",");
  let inteiro = s, decimais = "", temDecimal = false, milhar = null;

  if (temPonto && temVirgula) {
    const pos = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const dec = s[pos];
    inteiro = s.slice(0, pos);
    decimais = s.slice(pos + 1);
    temDecimal = true;
    milhar = dec === "," ? "." : ",";
    if (inteiro.includes(dec)) return erro("invalido"); // decimal repetido ou fora de ordem
  } else if (temPonto || temVirgula) {
    const sep = temPonto ? "." : ",";
    const partes = s.split(sep);
    if (sep === decIdioma) {
      if (partes.length > 2) return erro("invalido");
      [inteiro, decimais] = partes;
      temDecimal = true;
    } else if (partes.length === 2 && partes[1].length >= 1 && partes[1].length <= 2) {
      [inteiro, decimais] = partes; // "1.5" / "1000.50" em português: decimal
      temDecimal = true;
    } else {
      milhar = sep; // "1.000" / "1.000.000": milhar (grupos conferidos abaixo)
    }
  }

  if (temDecimal) {
    if (!/^\d+$/.test(decimais)) return erro("invalido"); // "1000," ou ",": falta o decimal
    if (decimais.length > 2) return erro("casas");
  }
  if (milhar) {
    if (!new RegExp("^\\d{1,3}(" + esc(milhar) + "\\d{3})+$").test(inteiro)) return erro("invalido");
    inteiro = inteiro.split(milhar).join("");
  }
  if (!/^\d*$/.test(inteiro) || (!inteiro && !temDecimal)) return erro("invalido");

  const centavos = Number(inteiro || "0") * 100 + Number(decimais.padEnd(2, "0") || "0");
  const valor = Math.round(centavos) / 100;
  if (valor === 0) return erro("zero");
  if (valor > VALOR_MAXIMO) return erro("maximo");
  return { ok: true, valor };
}
