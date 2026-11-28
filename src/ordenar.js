// Ordem única das listas de lançamentos (Histórico, Relatório, PDF e CSV):
// data decrescente (mais recente primeiro) e, na mesma data, criadoEm decrescente.
// Só ordena na tela/arquivo; não muda nada no banco.

// criadoEm pode chegar como Timestamp do Firestore (toMillis), Date, { seconds } ou texto
const emMs = v => {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  return Date.parse(v) || 0;
};

export const maisRecentePrimeiro = (a, b) =>
  String(b.data || "").localeCompare(String(a.data || "")) || emMs(b.criadoEm) - emMs(a.criadoEm);

export const ordenarLancamentos = lista => [...lista].sort(maisRecentePrimeiro);

// Data de hoje (ou de uma Date) no fuso do aparelho, no formato AAAA-MM-DD.
// (toISOString usa UTC e, no Brasil depois das 21h, já daria o dia seguinte)
export const isoLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
