# FALC — pendências

Conferido no código e no `git log` em 26/11/2026. Onde não há certeza, está escrito "a confirmar".
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

- **Painel de novo lançamento (teste de interface):** substituiu a página Lançar. Falta o dono testar salvar de verdade numa conta de teste (ao salvar: fecha, mostra "Lançamento salvo" e a página atualiza). Se não gostar, para desfazer: `git revert` do commit "Painel de novo lançamento (teste)" (achar com `git log --oneline --grep "Painel de novo"`).

## Próximos

- **Firebase App Check** (proteção extra do banco).
- **Brecha no aceite da Política:** o botão Google na aba "Entrar" pode criar conta nova sem marcar a caixa de aceite.
- **Textos que ainda estão só em português** (deveriam existir em PT/EN):
  - Mensagens de erro do login (`handleAuth` em `src/App.jsx`: "E-mail não encontrado.", "Erro ao autenticar." etc.).
  - `title="Tema"` do botão de tema na barra do app e o "Total" no centro do gráfico de rosca (`src/App.jsx`).
  - Relatório/PDF (`src/Relatorio.jsx`): no PDF "RELATÓRIO FINANCEIRO" e os cabeçalhos da tabela ("DESCRIÇÃO" etc.).

## Ideias futuras

- **Dica 'Dá para gastar por dia'** (saldo restante ÷ dias que faltam) como primeira regra do auxiliar financeiro, tratando o caso de saldo zero ou negativo e renda irregular.
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
| Rodapé da Landing só com o essencial; sombra e elevação nos cartões (`.card-hover`) | `9090169` |
| Arquivos sem uso removidos (`instalar.bat`, `atualizar.bat`, `Relatorio.jsx` da raiz, `src/App.css`) | `d9856f5` |
| Cópia das regras v4 em `firestore.rules`; conferido que os campos do app batem com elas | `d9856f5` |
| App só em português e inglês; gráfico de 6 meses com tooltip, saldo e mês atual | `fbb21e8` |
| Visão geral sem "Projeção do mês"; categorias (60%) e gráfico de 6 meses (40%) na mesma linha | 27/11/2026 |
| Telas vazias: boas-vindas na Visão geral, mês vazio, Histórico vazio, busca sem resultado e Relatório vazio | 28/11/2026 |
| Acabamento: atalhos do Relatório explicados, painel com Salvar primário, login sem frase e compacto, plural certo, contêiner centralizado, títulos de cartão, Histórico | 28/11/2026 |
| Histórico com rodapé só de contagem; ordem data/criadoEm desc em todas as listas; logo leva à Visão geral; foco só no teclado; atalhos do Relatório até a véspera, datas locais e aviso de data invertida | 28/11/2026 |
| Relatório: setas entre ciclos (até o 1º lançamento e até o ciclo de hoje, "em andamento") e dia de pagamento lembrado no navegador | 28/11/2026 |
| Relatório: atalho selecionado, setas, campos e "Período:" sempre com o mesmo intervalo (fonte única `cicloDatas`) | 28/11/2026 |
| Bug do valor: "1.000,50" virava R$ 1,00. Agora `parseValor` lê o valor, mostra a prévia e recusa entradas inválidas (lançamentos antigos gravados errado não foram mexidos: o dono apaga e recria) | `c1b79f1` |
