// Testa a leitura de valores (src/parseValor.js) sem Firebase e sem dependências.
// Uso: npm run test:valor
import { parseValor } from "../src/parseValor.js";

const ERRO = Symbol("erro");
const casos = [
  // português
  ["pt", "1.000,50", 1000.5],
  ["pt", "1000,50", 1000.5],
  ["pt", "1000.50", 1000.5],
  ["pt", "12", 12],
  ["pt", "0,99", 0.99],
  ["pt", "1.000", 1000],
  ["pt", "1.000.000,00", 1000000],
  ["pt", "R$ 25,90", 25.9],
  ["pt", "1000,5", 1000.5],
  ["pt", "1.5", 1.5],
  ["pt", "", ERRO],
  ["pt", "abc", ERRO],
  ["pt", "-5", ERRO],
  ["pt", "0", ERRO],
  ["pt", "1,234", ERRO],
  ["pt", "1000000000", ERRO],
  ["pt", "999.999.999,99", 999999999.99],
  ["pt", "1.00,50", ERRO],
  ["pt", "1000,", ERRO],
  // inglês
  ["en", "1,000.50", 1000.5],
  ["en", "1000.5", 1000.5],
];

let falhas = 0;
for (const [idioma, texto, esperado] of casos) {
  const r = parseValor(texto, idioma);
  const ok = esperado === ERRO ? !r.ok : r.ok && r.valor === esperado;
  if (!ok) falhas++;
  const obtido = r.ok ? r.valor : "erro (" + r.erro + ")";
  const quer = esperado === ERRO ? "erro" : esperado;
  console.log(`${ok ? "OK   " : "FALHA"} [${idioma}] ${JSON.stringify(texto).padEnd(18)} → ${obtido}${ok ? "" : "  (esperado: " + quer + ")"}`);
}
console.log(`\n${casos.length - falhas} de ${casos.length} casos passaram.`);
process.exit(falhas ? 1 : 0);
