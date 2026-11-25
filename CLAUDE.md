# FALC — finanças pessoais para jovens/estudantes

App web de finanças pessoais (antigo "Capital Hub"/"Oink"; rebranding para **FALC** em nov/2026).
Dono: Guizera (19, Administração na FGV, São Paulo). Ele está aprendendo: explique de forma clara, simples e passo a passo.

## Estado atual (em produção)

- Site: https://financas-pessoais-gray.vercel.app
- Repo: github.com/guiayres5990/financas-pessoais (deploy automático na Vercel a cada `git push` na `main`)
- Stack: React + Vite, Firebase Auth (e-mail/senha + Google via `signInWithRedirect`), Firestore, jsPDF, Phosphor Icons
- Firebase project: `financas-pessoais-14ce7`
- Coleção `transacoes` (campos incluem `uid`, `data`), com índice composto uid asc + data desc. Regras: cada usuário só acessa seus dados (por uid).

## Identidade visual (FALC)

Não mude nome, cores ou fontes sem o dono pedir. Use os tokens CSS do `theme.css`, nunca cores fixas no JSX.

| Uso | Modo escuro (padrão) | Modo claro (`[data-theme="light"]`) |
|---|---|---|
| Fundo | café `#15100D` | `#F4EEE4` |
| Superfície (cards) | `#201813` | — |
| Texto | creme `#F3ECE2` | `#1F1812` |
| Acento | bege `#D9C7A3` | `#7A6240` |
| Despesas (coral) | texto `#E19A8B`, barras `#BE6B5C` | — |

- Fontes: **Fraunces** nos títulos e **DM Sans** no texto.
- Logo (falcão), em `public/`:
  - `falc-escuro.svg`: logo para o modo claro
  - `falc-icone-creme.svg`: ícone para o modo escuro e favicon
  - `falc-icone-creme-512.png`: usado no PDF (carregado em base64 pelo `Relatorio.jsx`)
  - `falc-bege.svg` e `falc-creme.svg`: variações da marca
- `src/BrandMark.jsx` mostra o logo certo para cada tema (troca via CSS `.logo-dark` / `.logo-light`).
- `public/marca-capitalhub-*.png` são da marca antiga e não são mais usados pelo código.

## Estrutura

- `src/App.jsx`: fluxo landing → login → app; views dashboard / lançar / histórico / relatório. Exporta `CATS_BASE` (moradia, alimentacao, transporte, lazer, saude, educacao, outros) e `fmt`. Seletor de idioma com bandeiras.
- `src/Relatorio.jsx`: PDF por período, com jsPDF desenhando direto.
- `src/i18n.js`: textos em PT / EN / ES (`T`, `LANGS`). **Todo texto novo deve existir nos 3 idiomas.**
- `src/Privacidade.jsx`: Política de Privacidade (LGPD), página pública em `#/privacidade` (ver seção abaixo).
- `src/Landing.jsx`, `src/BrandMark.jsx`, `src/theme.css`, `src/firebase.js`, `vercel.json`.
- Gráficos: donut em CSS conic-gradient e barras em CSS (sem Chart.js).

## Privacidade e LGPD (feito em nov/2026)

- **Política de Privacidade** em `src/Privacidade.jsx`, aberta sem login em `/#/privacidade`. O App.jsx escuta o `hashchange` e mostra a página antes de qualquer outra tela; o "Voltar" limpa o hash e volta para onde a pessoa estava.
  - Responsável (controlador): **Guilherme Falcão Eubank Ayres**. Contato: **falc.empresa@gmail.com**. Os dois ficam em constantes no topo do arquivo (`RESPONSAVEL`, `EMAIL_CONTATO`).
  - O texto das 10 seções fica em `src/i18n.js` (`privSecoes`, com `{nome}` e `{email}` trocados pela página). Prazo de resposta informado: 15 dias. Ao mudar a política, atualize `privAtualizado` nos 3 idiomas.
  - Links para a política: rodapé da Landing, embaixo do formulário de login e na barra lateral do app.
- **Aceite no cadastro:** caixa "Li e concordo com a Política de Privacidade", obrigatória para criar conta por e-mail/senha e para o botão Google na aba "Criar conta".
  - Brecha conhecida: o botão Google na aba "Entrar" pode criar uma conta nova sem o aceite.
- **Excluir minha conta:** botão `btn-danger` na barra lateral, com diálogo em que a pessoa digita a palavra de confirmação (EXCLUIR / DELETE / ELIMINAR, conforme o idioma).
  - Só segue se o último login (`metadata.lastSignInTime`) foi há menos de 5 minutos; senão pede para sair e entrar de novo.
  - Ordem: apaga todos os docs de `transacoes` do uid (em lotes de até 400 com `writeBatch`), depois `deleteUser`, limpa as chaves `fp_*` do localStorage e volta para a Landing. Se apagar os lançamentos falhar, a conta NÃO é apagada.
  - Testar só com conta de teste, nunca na conta principal do dono.

## Descontinuado

- **Simulador de decisão** (trabalhar × bolsa × crédito educativo): removido de propósito no rebranding FALC. Não recriar sem pedido explícito.

## Armadilhas já resolvidas (não repetir)

- NÃO usar html2canvas no PDF: falha com cores `oklch`. Manter jsPDF desenhando direto.
- No PDF, evitar caracteres fora da fonte padrão (ex.: o sinal "−" U+2212 sai quebrado). Use "-" comum.
- Usar `CATS_BASE` (não `CATS`). Não exportar nada de dentro de componente.
- `node_modules/` e `dist/` fora do git (`.gitignore`). Sem isso a Vercel dá "vite: Permission denied".
- Consulta Firestore com `where("uid","==",uid)` + `orderBy("data","desc")` exige o índice composto (já criado).
- Login Google: usar redirect (popup fechava sozinho). Domínio da Vercel está autorizado no Firebase.
- Pasta dentro do OneDrive: o repo tem `git config windows.appendAtomically false` (sem isso o commit falha com "unable to append to .git/logs/HEAD").

## Ambiente do usuário

- Windows, usa **CMD** (PowerShell bloqueia npm). Projeto em `C:\Users\windows\OneDrive\Área de Trabalho\financas-pessoais`.
- Ele prefere arquivos reescritos por inteiro; substituições parciais já quebraram o projeto várias vezes.
- Sempre rodar `npm run build` e conferir `git status` antes de commit/push.

## Próximas tarefas

1. Segurança de dados (o que falta): regras do Firestore mais rígidas (validar campos e tipos, negar o resto) e Firebase App Check. Política de privacidade e exclusão de conta já foram feitas.
2. Possível dimensão de educação financeira para estudantes.

## Como trabalhar

- Antes de mexer, leia os arquivos relevantes; mudanças pequenas e testadas.
- Explique o que fez em linguagem simples, sem jargão desnecessário.
