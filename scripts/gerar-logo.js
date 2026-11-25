// Gera src/Logo.jsx e os ícones do site a partir dos SVGs APROVADOS
// (falc-horizontal.svg e falc-simbolo.svg). Formas intactas; só as cores viram variáveis CSS.
// Uso (na pasta do projeto): node scripts/gerar-logo.js <pasta com falc-horizontal.svg e falc-simbolo.svg>
// Só é preciso rodar de novo se o logo mudar. Precisa do sharp (devDependency).
const fs = require("fs");
const path = require("path");
const sharp = require(path.join(process.cwd(), "node_modules", "sharp"));

const pasta = process.argv[2];
const H = fs.readFileSync(path.join(pasta, "falc-horizontal.svg"), "utf8");
const S = fs.readFileSync(path.join(pasta, "falc-simbolo.svg"), "utf8");

const vbH = H.match(/viewBox="([^"]+)"/)[1];
const vbS = S.match(/viewBox="([^"]+)"/)[1];
const translate = H.match(/<g transform="translate\(([^)]+)\)">/)[1];
const pathsDe = (txt, cor) => [...txt.matchAll(/<path fill="([^"]+)" d="([^"]+)"\/>/g)]
  .filter(m => m[1].toUpperCase() === cor).map(m => m[2]);
const falcao = pathsDe(H, "#92836A");
const letras = pathsDe(H, "#322B22");
const falcaoS = pathsDe(S, "#92836A");
if (falcao.length !== 3 || letras.length !== 4 || falcaoS.join() !== falcao.join()) throw new Error("paths inesperados");

const lista = arr => "[\n" + arr.map(d => `  "${d}",`).join("\n") + "\n]";
const jsx = `// Logo final do FALC, gerado a partir dos SVGs aprovados (falc-horizontal.svg e falc-simbolo.svg).
// As formas (paths) são as originais do Recraft; só as cores vêm do CSS:
//   --logo-falcao (falcão) e --logo-texto (letras), definidas em theme.css.
// variant="horizontal": falcão + "FALC" ao lado.  variant="simbolo": só o falcão.

const FALCAO = ${lista(falcao)};

const LETRAS = ${lista(letras)};

const VIEWBOX = {
  horizontal: "${vbH}",
  simbolo: "${vbS}",
};

export default function Logo({ variant = "horizontal", className = "" }) {
  const horizontal = variant !== "simbolo";
  return (
    <svg
      className={("logo " + className).trim()}
      viewBox={horizontal ? VIEWBOX.horizontal : VIEWBOX.simbolo}
      role="img"
      aria-label="FALC"
      xmlns="http://www.w3.org/2000/svg"
    >
      {FALCAO.map((d, i) => <path key={"f" + i} fill="var(--logo-falcao)" d={d} />)}
      {horizontal && (
        <g transform="translate(${translate})">
          {LETRAS.map((d, i) => <path key={"l" + i} fill="var(--logo-texto)" d={d} />)}
        </g>
      )}
    </svg>
  );
}
`;
fs.writeFileSync(path.join("src", "Logo.jsx"), jsx);

// Caixa do falcão = viewBox do símbolo aprovado (já inclui a folga de 2)
const [bx, by, bw, bh] = vbS.split(" ").map(Number);
const r = n => Math.round(n * 1000) / 1000;
function simboloNoQuadrado(lado, fracao, cor) {
  const s = (lado * fracao) / Math.max(bw, bh);
  const tx = (lado - bw * s) / 2, ty = (lado - bh * s) / 2;
  return `<g transform="translate(${r(tx)} ${r(ty)}) scale(${r(s)}) translate(${r(-bx)} ${r(-by)})">` +
    falcao.map(d => `<path fill="${cor}" d="${d}"/>`).join("") + `</g>`;
}
const L = 512;
// favicon / ícone do app: quadrado arredondado (rx 22%) café + falcão bege ocupando ~68%
fs.writeFileSync(path.join("public", "falc-icone.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}"><rect width="${L}" height="${L}" rx="${r(L * 0.22)}" fill="#15100D"/>${simboloNoQuadrado(L, 0.68, "#D9C7A3")}</svg>\n`);
// apple-touch-icon: o iPhone arredonda sozinho, então o fundo é quadrado cheio
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}"><rect width="${L}" height="${L}" fill="#15100D"/>${simboloNoQuadrado(L, 0.68, "#D9C7A3")}</svg>`;
// PDF: falcão bege em fundo transparente, 512px
const bege = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}">${simboloNoQuadrado(L, 0.96, "#D9C7A3")}</svg>`;

(async () => {
  await sharp(Buffer.from(apple), { density: 300 }).resize(180, 180).png().toFile(path.join("public", "apple-touch-icon.png"));
  await sharp(Buffer.from(bege), { density: 300 }).resize(512, 512).png().toFile(path.join("public", "falc-simbolo-bege-512.png"));
  console.log({ vbH, vbS, translate });
})();
