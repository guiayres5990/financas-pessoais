# Falc — finanças pessoais para jovens/estudantes

App web de finanças pessoais (antigo "Capital Hub"/"Oink"; rebranding para **Falc** em nov/2026).
Dono: Guizera (19, Administração na FGV, São Paulo). Ele está aprendendo: explique de forma clara, simples e passo a passo.

## Estado atual (em produção)

- Site: https://financas-pessoais-gray.vercel.app
- Repo: github.com/guiayres5990/financas-pessoais (deploy automático na Vercel a cada `git push` na `main`)
- Stack: React + Vite, Firebase Auth (e-mail/senha + Google via `signInWithRedirect`), Firestore, jsPDF, Phosphor Icons
- Firebase project: `financas-pessoais-14ce7`
- Coleção `transacoes` (campos incluem `uid`, `data`), com índice composto uid asc + data desc. Regras: cada usuário só acessa seus dados (por uid).

## Identidade visual (Falc)

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
- `src/Landing.jsx`, `src/BrandMark.jsx`, `src/theme.css`, `src/firebase.js`, `vercel.json`.
- Gráficos: donut em CSS conic-gradient e barras em CSS (sem Chart.js).

## Descontinuado

- **Simulador de decisão** (trabalhar × bolsa × crédito educativo): removido de propósito no rebranding Falc. Não recriar sem pedido explícito.

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

1. Governança e segurança de dados: regras do Firestore mais rígidas (validar campos e tipos, negar o resto), Firebase App Check, política de privacidade (LGPD) e exclusão de conta/dados pelo próprio usuário.
2. Possível dimensão de educação financeira para estudantes.

## Como trabalhar

- Antes de mexer, leia os arquivos relevantes; mudanças pequenas e testadas.
- Explique o que fez em linguagem simples, sem jargão desnecessário.
