// Cálculos do simulador de financiamento dos estudos.
// Fica num arquivo separado para ser usado tanto na tela (Simulador.jsx)
// quanto no PDF (Relatorio.jsx) com exatamente a mesma conta.

export const SIM_PADRAO = {
  mensalidade: "",
  salario: "",
  bolsaPct: "50",
  parcela: "",
  meses: "48",
  rendaBase: "",   // vazio = usar a média dos lançamentos
  gastosBase: "",  // vazio = usar a média dos lançamentos
};

// Aceita "1500", "1500,50" e "1.500,50"
export function num(s) {
  let t = String(s ?? "").trim();
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const v = parseFloat(t);
  return isFinite(v) && v > 0 ? v : 0;
}

// Média mensal de receitas e de gastos (sem a categoria Educação, porque a
// mensalidade entra separada no simulador) nos 3 meses mais recentes com lançamentos.
export function baseDosLancamentos(txs) {
  const porMes = {};
  txs.forEach(tx => {
    if (!tx.data) return;
    const chave = tx.data.slice(0, 7); // "2026-11"
    if (!porMes[chave]) porMes[chave] = { r: 0, d: 0 };
    if (tx.tipo === "receita") porMes[chave].r += tx.valor;
    else if (tx.tipo === "despesa" && tx.cat !== "educacao") porMes[chave].d += tx.valor;
  });
  const meses = Object.keys(porMes).sort().reverse().slice(0, 3);
  if (!meses.length) return { renda: 0, gastos: 0, nMeses: 0 };
  const soma = meses.reduce((acc, m) => ({ r: acc.r + porMes[m].r, d: acc.d + porMes[m].d }), { r: 0, d: 0 });
  return { renda: soma.r / meses.length, gastos: soma.d / meses.length, nMeses: meses.length };
}

function cenario(id, entra, sai, extra = {}) {
  const sobra = entra - sai;
  const pct = entra > 0 ? Math.round((sai / entra) * 100) : (sai > 0 ? 999 : 0);
  const status = sobra < 0 ? "estoura" : sobra >= entra * 0.1 ? "folga" : "apertado";
  return { id, entra, sai, sobra, pct, status, ...extra };
}

export function calcularSimulacao(sim, txs) {
  const auto = baseDosLancamentos(txs);
  const renda = String(sim.rendaBase).trim() !== "" ? num(sim.rendaBase) : auto.renda;
  const gastos = String(sim.gastosBase).trim() !== "" ? num(sim.gastosBase) : auto.gastos;
  const mensalidade = num(sim.mensalidade);
  const salario = num(sim.salario);
  const bolsa = Math.min(100, num(sim.bolsaPct)) / 100;
  const parcela = num(sim.parcela);
  const meses = Math.round(num(sim.meses));

  const cenarios = [
    cenario("trabalhar", renda + salario, gastos + mensalidade),
    cenario("bolsa", renda, gastos + mensalidade * (1 - bolsa)),
    cenario("credito", renda, gastos + parcela, {
      divida: Math.max(0, mensalidade - parcela) * meses,
    }),
  ];
  const melhor = cenarios.reduce((a, b) => (b.sobra > a.sobra ? b : a));

  return {
    valido: mensalidade > 0,
    auto, renda, gastos, mensalidade, salario, bolsa, parcela, meses,
    cenarios, melhor,
  };
}
