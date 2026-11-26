# FALC — pendências

Conferido no código e no `git log` em 26/11/2026 (commit `c294d85`). Onde não há certeza, está escrito "a confirmar".
Sempre respeitar a REGRA DE DADOS do `CLAUDE.md` (nada de gravar no Firebase).

---

## Em andamento

- **Testes manuais na conta de teste do dono** (o código está no ar; quem testa é o dono, numa conta de teste — nunca na principal). A confirmar se já foram feitos:
  - Primeiro acesso (diálogo do apelido) e troca do nome de exibição no Perfil.
  - Foto de perfil: trocar e remover (deve aparecer no chip e no menu da conta).
  - Dados opcionais: salvar CPF/nascimento/telefone e apagar um deles (o campo deve sumir de `perfis/{uid}`).
  - Atalhos: criar, usar no lançamento e excluir.
  - CSV abrindo certo no Excel (colunas separadas, acentos).
  - Exclusão de conta: apagar lançamentos, atalhos e perfil, e depois a conta.
- **Regras do Firestore x campos do app:** a confirmar se as regras publicadas aceitam exatamente os campos gravados (`perfis`: `apelido`, `atualizadoEm`, `cpf`, `nascimento`, `telefone`, `foto`; `transacoes` com `sub` opcional; `subcategorias` com `criadoEm` via `serverTimestamp`). Se aparecer "Não foi possível salvar", o dono manda o print.

## Próximos

- **Firebase App Check** (proteção extra do banco).
- **Brecha no aceite da Política:** o botão Google na aba "Entrar" pode criar conta nova sem marcar a caixa de aceite.
- **Textos que ainda estão só em português** (deveriam existir em PT/EN/ES):
  - Mensagens de erro do login (`handleAuth` em `src/App.jsx`: "E-mail não encontrado.", "Erro ao autenticar." etc.).
  - `title="Tema"` do botão de tema na barra do app e o "Total" no centro do gráfico de rosca (`src/App.jsx`).
  - Relatório/PDF (`src/Relatorio.jsx`): "Dia N → N", "lanç.", "Nenhum lançamento no período.", e no PDF "RELATÓRIO FINANCEIRO" e os cabeçalhos da tabela ("DESCRIÇÃO" etc.).
- **Limpeza de arquivos sem uso:** `Relatorio.jsx` na raiz (versão antiga), `atualizar.bat`, `instalar.bat` (apaga arquivos de `src/` se executado) e `src/App.css` (não é importado). Remover só com o OK do dono.
- **Guardar uma cópia das regras do Firestore no repositório** (ex.: `firestore.rules`), só como documentação — sem publicar pelo terminal. Hoje elas só existem no console do Firebase.

## Ideias futuras

- **Auxiliar financeiro:** primeiro com regras no próprio app (dicas a partir dos lançamentos); depois, IA opcional.
- **Vídeo tutorial na Landing.**
- **Renomear o projeto na Vercel e no GitHub** (hoje `financas-pessoais`) para FALC.
- **Domínio próprio.**
- **Revisão de advogado:** registro da marca FALC e a parte da LGPD sobre crianças e adolescentes.
- **Dimensão de educação financeira para estudantes.**

---

## Já prontos (conferidos no código e no git log)

| Item | Commit |
|---|---|
| Landing em blocos e login em 2 colunas com falcão vertical e a frase "Veja seu dinheiro com olhos de falcão." | `071da5d` |
| Menu da conta sem destaque no item "Legal" | `8254e44` |
| Cabeçalho da Política sem seletor de idioma e com "Voltar" maior | `65baaaf` |
| Letra dos títulos (Fraunces com opsz fixo e WONK desligado) | `c294d85` |
| Novo subtítulo e nova linha abaixo dos botões do hero; etiqueta "Grátis · sem cartão" removida | `c294d85` |
