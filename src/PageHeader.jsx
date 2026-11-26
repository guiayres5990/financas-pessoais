// Cabeçalho das páginas do app (Visão geral, Lançar, Histórico, Relatório e Perfil).
// Fica dentro de .content, na mesma borda esquerda dos cartões e na mesma altura em todas as páginas.
// children (opcional): ações da página à direita do título (ex.: seletor de mês).
export default function PageHeader({ titulo, subtitulo, children }) {
  return (
    <header className="page-header">
      <div className="page-header-texto">
        <h1 className="page-header-titulo">{titulo}</h1>
        {subtitulo && <p className="page-header-sub">{subtitulo}</p>}
      </div>
      {children && <div className="page-header-acoes">{children}</div>}
    </header>
  );
}
