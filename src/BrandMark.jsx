// Logo do FALC: no tema escuro usa o ícone creme arredondado; no claro, o logo escuro.
// A troca é feita por CSS (.logo-dark / .logo-light em theme.css).
export default function BrandMark() {
  return (
    <>
      <img className="logo-dark" src="/falc-icone-creme.svg" alt="" />
      <img className="logo-light" src="/falc-escuro.svg" alt="" />
    </>
  );
}
