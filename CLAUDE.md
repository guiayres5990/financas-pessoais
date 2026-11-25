# FALC — finanças pessoais para jovens/estudantes

App web de finanças pessoais (antigo "Capital Hub"/"Oink"; rebranding para **FALC** em nov/2026).
Dono: Guizera (19, Administração na FGV, São Paulo). Ele está aprendendo: explique de forma clara, simples e passo a passo.

## Regra de dados (vale para tudo)

- NÃO criar, alterar nem apagar dados no Firebase (Firestore ou Authentication) em nenhuma hipótese: nada de lançamentos de teste, subcategorias, apelidos, contas de teste, seeds, migrações ou chamadas ao banco pelo terminal.
- NÃO rodar o app logado na conta real do dono para testar gravações. Teste visual e de código (build, revisão). Para o que grava no banco, escreva o código, rode o build e passe ao dono o passo a passo para ele testar numa conta de teste dele.
- Dados de exemplo nunca vão para o banco (atalhos prontos ficam só no código).
- Não mexer em credenciais/config do Firebase nem fazer deploy das regras do Firestore (as regras de `transacoes`, `subcategorias` e `perfis` já foram publicadas pelo dono).
- Se algo exigir gravar dados para funcionar, PARE e pergunte antes.
- Conferência visual de telas logadas: usar uma config temporária do Vite que troca `./firebase`, `firebase/auth` e `firebase/firestore` por mocks em memória (gravações bloqueadas), e apagar esses arquivos depois. Nunca commitar os mocks.

## Estado atual (em produção)

- Site: https://financas-pessoais-gray.vercel.app
- Repo: github.com/guiayres5990/financas-pessoais (deploy automático na Vercel a cada `git push` na `main`)
- Stack: React + Vite, Firebase Auth (e-mail/senha + Google via `signInWithRedirect`), Firestore, jsPDF, Phosphor Icons
- Firebase project: `financas-pessoais-14ce7`
- Coleções do Firestore (cada usuário só acessa os próprios dados):
  - `transacoes`: `uid`, `tipo`, `valor`, `desc` (obrigatória), `cat`, `data`, `criadoEm` e `sub` (opcional, texto até 40). Índice composto uid asc + data desc.
  - `subcategorias`: `{ uid, cat, nome, criadoEm }`, atalhos criados pelo usuário. Ler só com `where("uid","==",uid)`, SEM `orderBy` (ordenar no cliente).
  - `perfis/{uid}`: `{ apelido (1 a 30 caracteres), atualizadoEm }`.

## Identidade visual (FALC)

Não mude nome, cores ou fontes sem o dono pedir. Use os tokens CSS do `theme.css`, nunca cores fixas no JSX.

| Uso | Modo escuro (padrão) | Modo claro (`[data-theme="light"]`) |
|---|---|---|
| Fundo | café `#15100D` | `#F4EEE4` |
| Superfície (cards) | `#201813` | — |
| Texto | creme `#F3ECE2` | `#1F1812` |
| Acento | bege `#D9C7A3` | `#7A6240` |
| Despesas (coral) | texto `#E19A8B`, barras `#BE6B5C` | — |
| Logo: falcão (`--logo-falcao`) | `#D9C7A3` | `#7A6240` |
| Logo: letras (`--logo-texto`) | `#F3ECE2` | `#1F1812` |

- Fontes: **Fraunces** nos títulos e **DM Sans** no texto.
- **Logo final** (do Recraft): `src/Logo.jsx`, SVG inline com `variant="horizontal"` (falcão + "FALC") ou `variant="simbolo"` (só o falcão). As formas (paths) são as originais e NÃO devem ser redesenhadas; só as cores vêm do CSS (`fill="var(--logo-falcao)"` / `var(--logo-texto)`). Sem moldura em nenhum tema.
  - Tamanhos: barra lateral 30px (`.logo-sidebar`), login 40px (`.logo-login`), Landing e Política 36px (`.logo-landing`). No celular (≤900px) a barra lateral mostra o símbolo.
  - Não colocar texto "FALC" solto ao lado do logo (o nome já faz parte do desenho).
  - Origem: `falc-horizontal.svg` e `falc-simbolo.svg` (gerados do SVG vertical, aprovados pelo dono). Se o logo mudar: `node scripts/gerar-logo.js <pasta com os dois SVGs>` (usa o `sharp`, devDependency).
- Ícones em `public/`:
  - `falc-icone.svg`: favicon / ícone do app (quadrado arredondado café `#15100D` + falcão bege `#D9C7A3`).
  - `apple-touch-icon.png`: 180x180, mesmo desenho com fundo quadrado cheio (o iPhone arredonda).
  - `falc-simbolo-bege-512.png`: falcão bege, fundo transparente, usado no cabeçalho escuro do PDF (24mm, comprimido com `"FAST"`).

## Estrutura

- `src/App.jsx`: fluxo landing → login → app; views dashboard / lançar / histórico / relatório. Exporta `CATS_BASE` (moradia, alimentacao, transporte, lazer, saude, educacao, outros) e `fmt`. Seletor de idioma com bandeiras.
- `src/MenuConta.jsx`: chip da conta no rodapé da barra lateral + menu (ver abaixo).
- `src/subcategorias.js`: `ATALHOS` prontos por categoria (só no código) e `MAX_SUB = 40`.
- `src/Relatorio.jsx`: PDF por período, com jsPDF desenhando direto.
- `src/i18n.js`: textos em PT / EN / ES (`T`, `LANGS`). **Todo texto novo deve existir nos 3 idiomas.** Os nomes dos atalhos prontos ficam em `T[lang].atalhos`.
- `src/Privacidade.jsx`: Política de Privacidade (LGPD), página pública em `#/privacidade`.
- `src/Logo.jsx`, `src/Landing.jsx`, `src/theme.css`, `src/firebase.js`, `vercel.json`, `scripts/gerar-logo.js`.
- Gráficos: donut em CSS conic-gradient e barras em CSS (sem Chart.js).

## Apelido e menu da conta

- **Apelido** em `perfis/{uid}`. No primeiro acesso (documento não existe), abre o diálogo obrigatório "Como você quer ser chamado?", já preenchido com o primeiro nome (displayName, ou o e-mail antes do @ cortado no primeiro ponto/número, com inicial maiúscula). Nos acessos seguintes o apelido vem do banco (vale em qualquer aparelho).
- **Rodapé da barra lateral**: só o chip (avatar com a inicial do apelido, apelido e "Plano gratuito"). Ao clicar abre o menu acima do chip (268px, `var(--color-surface)`, borda 16px, `var(--shadow-lg)`), que fecha com Esc, clique fora ou ao escolher um item.
  - Itens: cabeçalho (avatar 40px, apelido, e-mail cortado com reticências) → Perfil (editar apelido) → Exportar CSV → Legal (submenu: Política de Privacidade e Excluir minha conta, em coral) → Sair. Sem "Aparência" e sem "Cobrança".
  - No celular (≤900px) o chip vira só o avatar e o menu abre para baixo, alinhado à direita, com `position: fixed`.

## Subcategorias

- Na tela Lançar, abaixo de categoria/data, há uma fileira de chips com os atalhos da categoria (prontos + do usuário) e "+ Novo".
- Tocar num atalho guarda em `sub` e preenche a descrição (se ela estiver vazia ou ainda for o atalho anterior). Se a descrição ficar vazia ao salvar, usa o nome do atalho.
- "+ Novo" salva em `subcategorias`. Atalhos do usuário têm × para excluir (com confirmação); os prontos não.
- O Histórico mostra o atalho como etiqueta ao lado da descrição. CSV e PDF têm a coluna "Subcategoria".

## Privacidade e LGPD (feito em nov/2026)

- **Política de Privacidade** em `src/Privacidade.jsx`, aberta sem login em `/#/privacidade`. O App.jsx escuta o `hashchange` e mostra a página antes de qualquer outra tela; o "Voltar" limpa o hash e volta para onde a pessoa estava.
  - Responsável (controlador): **Guilherme Falcão Eubank Ayres**. Contato: **falc.empresa@gmail.com**. Os dois ficam em constantes no topo do arquivo (`RESPONSAVEL`, `EMAIL_CONTATO`).
  - O texto das 10 seções fica em `src/i18n.js` (`privSecoes`, com `{nome}` e `{email}` trocados pela página). Prazo de resposta informado: 15 dias. Ao mudar a política, atualize `privAtualizado` nos 3 idiomas.
  - Links para a política: rodapé da Landing, embaixo do formulário de login e no menu da conta (Legal).
- **Aceite no cadastro:** caixa "Li e concordo com a Política de Privacidade", obrigatória para criar conta por e-mail/senha e para o botão Google na aba "Criar conta".
  - Brecha conhecida: o botão Google na aba "Entrar" pode criar uma conta nova sem o aceite.
- **Excluir minha conta** (menu da conta → Legal): diálogo em que a pessoa digita a palavra de confirmação (EXCLUIR / DELETE / ELIMINAR, conforme o idioma).
  - Só segue se o último login (`metadata.lastSignInTime`) foi há menos de 5 minutos; senão pede para sair e entrar de novo.
  - Ordem: apaga os docs de `transacoes` e `subcategorias` do uid e o `perfis/{uid}` (se existir), em lotes de até 400 com `writeBatch`; depois `deleteUser`, limpa as chaves `fp_*` do localStorage e volta para a Landing. Se apagar os dados falhar, a conta NÃO é apagada.
  - Testar só com conta de teste, nunca na conta principal do dono.

## Descontinuado

- **Simulador de decisão** (trabalhar × bolsa × crédito educativo): removido de propósito no rebranding FALC. Não recriar sem pedido explícito.

## Armadilhas já resolvidas (não repetir)

- NÃO usar html2canvas no PDF: falha com cores `oklch`. Manter jsPDF desenhando direto.
- No PDF, evitar caracteres fora da fonte padrão (ex.: o sinal "−" U+2212 sai quebrado). Use "-" comum.
- Usar `CATS_BASE` (não `CATS`). Não exportar nada de dentro de componente.
- `node_modules/` e `dist/` fora do git (`.gitignore`). Sem isso a Vercel dá "vite: Permission denied".
- Consulta Firestore com `where("uid","==",uid)` + `orderBy("data","desc")` exige o índice composto (já criado). Para `subcategorias`, não usar `orderBy`.
- Login Google: usar redirect (popup fechava sozinho). Domínio da Vercel está autorizado no Firebase.
- Pasta dentro do OneDrive: o repo tem `git config windows.appendAtomically false` (sem isso o commit falha com "unable to append to .git/logs/HEAD").
- Layout no celular: grids e flex com campos/tabelas precisam de `minmax(0, 1fr)` / `min-width: 0`; tabelas largas ficam dentro de `.table-scroll` (rolam dentro do card, sem empurrar a página).
- `C:\projetos\financas-pessoais` é uma cópia antiga e parada do projeto; não usar.

## Ambiente do usuário

- Windows, usa **CMD** (PowerShell bloqueia npm). Projeto em `C:\Users\windows\OneDrive\Área de Trabalho\financas-pessoais`.
- Ele prefere arquivos reescritos por inteiro; substituições parciais já quebraram o projeto várias vezes.
- Sempre rodar `npm run build` e conferir `git status` antes de commit/push.

## Próximas tarefas

1. Firebase App Check (as regras do Firestore já foram publicadas pelo dono).
2. Possível dimensão de educação financeira para estudantes.

## Como trabalhar

- Antes de mexer, leia os arquivos relevantes; mudanças pequenas e testadas.
- Explique o que fez em linguagem simples, sem jargão desnecessário.
