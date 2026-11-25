// Atalhos prontos de subcategoria (ficam só no código, nunca no banco).
// Cada id tem tradução em i18n.js → T[lang].atalhos[id].
// Os atalhos criados pelo usuário ficam na coleção "subcategorias" do Firestore.
export const ATALHOS = {
  alimentacao: ["mercado", "restaurante", "delivery", "padaria"],
  transporte:  ["uber", "combustivel", "metro", "estacionamento"],
  moradia:     ["aluguel", "condominio", "luz", "internet"],
  lazer:       ["streaming", "cinema", "bar", "jogos"],
  saude:       ["farmacia", "consulta", "academia"],
  educacao:    ["mensalidade", "livros", "cursos"],
  outros:      [],
};

export const MAX_SUB = 40;
