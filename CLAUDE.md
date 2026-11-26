# FALC — finanças pessoais para jovens e estudantes

App web para jovens e estudantes anotarem gastos e ganhos, verem o mês por categoria e fecharem o mês com relatório (antigo "Capital Hub"; virou **FALC** em nov/2026).
Dono: Guizera (19, Administração na FGV, São Paulo). Ele está aprendendo: explique de forma clara, simples e passo a passo.

- Site: https://financas-pessoais-gray.vercel.app · Repo: github.com/guiayres5990/financas-pessoais (deploy automático na Vercel a cada `git push` na `main`).
- Pasta: `C:\Users\windows\OneDrive\Área de Trabalho\financas-pessoais`. (`C:\projetos\financas-pessoais` é uma cópia antiga: não usar.)

## Stack

- React 18 + Vite 4; Firebase Auth (e-mail/senha + Google por `signInWithRedirect`); Firestore (projeto `financas-pessoais-14ce7`); jsPDF (PDF desenhado direto); Phosphor Icons (regular + bold); Google Fonts.
- Coleções: `transacoes`, `subcategorias`, `perfis/{uid}` (campos e regras em `docs/estado-do-projeto.md`). Cada usuário só acessa os próprios dados.
- Textos em PT / EN / ES em `src/i18n.js`. **Todo texto novo nos 3 idiomas.** Idioma em `fp_lang` (padrão PT), tema em `fp_theme`.

## REGRA DE DADOS (vale para tudo)

- NUNCA criar, alterar nem apagar dados no Firebase (Firestore ou Authentication): nada de lançamentos, atalhos, perfis ou contas de teste, seeds, migrações ou chamadas ao banco pelo terminal.
- NUNCA testar gravações logado na conta real do dono. Teste só visual, build e revisão de código; para o que grava no banco, passe ao dono o passo a passo para ele testar numa conta de teste dele.
- NUNCA publicar regras do Firestore nem mexer em credenciais/config do Firebase (as regras já foram publicadas pelo dono no console).
- Se algo exigir gravar dados para funcionar, PARE e pergunte.
- Para conferir telas logadas: config temporária do Vite trocando `./firebase`, `firebase/auth` e `firebase/firestore` por mocks em memória; apagar no fim e nunca commitar.

## Regras de manutenção deste arquivo

1. Ao terminar qualquer tarefa que mude o projeto (telas, textos da política, coleções do Firestore, regras de segurança, rotas, paleta, dependências, comandos), atualize este CLAUDE.md **no mesmo commit da tarefa**, sem esperar o dono pedir. Se for detalhe, atualize `docs/estado-do-projeto.md`; se resolver ou criar pendência, atualize `docs/pendencias.md`.
2. Atualize só o que mudou, em poucas linhas. Mantenha este arquivo curto (até ~150 linhas) e organizado por tópicos. Remova o que ficou desatualizado em vez de acumular.
3. Registre sempre as decisões do dono (resumo aqui; lista completa em `docs/estado-do-projeto.md`, seção "Decisões do dono").
4. Mantenha a REGRA DE DADOS.
5. No fim de cada tarefa, diga ao dono em uma linha o que foi atualizado aqui.

## Design e marca

- Nome sempre **FALC**, em maiúsculas. Não mudar cores, fontes ou logo sem o dono pedir.
- Paleta café + bege, sempre pelos tokens do `src/theme.css` (nunca cor fixa no JSX):

| Uso | Escuro (padrão) | Claro |
|---|---|---|
| Fundo / superfície | `#15100D` / `#201813` | `#F4EEE4` / `#FBF8F3` |
| Texto | `#F3ECE2` | `#1F1812` |
| Acento | `#D9C7A3` | `#7A6240` |
| Despesas (coral) | `#E19A8B` / barras `#BE6B5C` | `#A5503F` |
| Logo (`--logo-falcao` / `--logo-texto`) | `#D9C7A3` / `#F3ECE2` | `#7A6240` / `#1F1812` |

- Fontes: **Fraunces** nos títulos, **DM Sans** no texto. Fraunces carregada com `opsz, wght, SOFT, WONK`; todos os títulos em Fraunces usam peso 500, `font-optical-sizing: none`, `font-variation-settings: "opsz" 36, "SOFT" 0, "WONK" 0`, sem ligaduras. Não trocar a fonte por conta própria.
- Logo: `src/Logo.jsx` com as formas originais do Recraft (não redesenhar), variantes `horizontal`, `vertical` e `simbolo`. Regerar com `node scripts/gerar-logo.js <pasta com falc-horizontal.svg e falc-simbolo.svg>`.
- Frase de efeito: "Veja seu dinheiro com olhos de falcão." (EN "See your money through a falcon's eyes." · ES "Mira tu dinero con ojos de halcón.").
- Classes: `.btn-cheio` (ação principal), `.btn-grande` (48px), `.btn-voltar`, `.link-destaque` (links da Política, exceto no menu da conta), `.link-alvo` (toque de 44px), `.table-scroll`.
- Responsivo (1440, 768, 375), sem rolagem lateral, alvos de toque de 44px, contraste nos dois temas, foco de teclado visível.

## Decisões do dono (resumo)

- Menores de 18 podem usar o app (menores de 12 com conta criada e acompanhada por um responsável).
- CPF, telefone, nascimento e foto são opcionais. Foto sem Firebase Storage.
- Sem simulador, sem atalhos prontos, sem seletor de idioma na Política, sem destaque no "Legal" do menu, sem nome pessoal na Política.
- Textos da Landing sobre dados só repetem o que a Política afirma.

## Comandos úteis

- O dono usa **CMD** (PowerShell bloqueia npm). Comandos rodam dentro da pasta do projeto.
- `npm run dev` — servidor local para conferir telas.
- `npm run build` — sempre antes de commit/push.
- `git status` → `git add -A` → `git commit -m "..."` → `git push` (a Vercel publica sozinha).
- OneDrive: o repo tem `git config windows.appendAtomically false` (sem isso o commit falha).

## Cuidados que já custaram caro

- PDF: nunca html2canvas (falha com `oklch`); evitar "−" (U+2212) no PDF.
- Usar `CATS_BASE` (não `CATS`); não exportar nada de dentro de componente.
- `node_modules/` e `dist/` fora do git.
- `perfis/{uid}` sempre com `setDoc` sem merge (campo vazio some); `subcategorias` sem `orderBy`.
- Textos com `\` (caminhos Windows): editar por script em arquivo, não pelo terminal.

## Arquivos importantes

- `src/App.jsx` (telas, login, perfil, CSV, exclusão de conta), `src/Landing.jsx`, `src/Privacidade.jsx`, `src/Perfil.jsx` + `src/perfilUtil.js` + `src/Avatar.jsx`, `src/MenuConta.jsx`, `src/Relatorio.jsx`, `src/Logo.jsx`, `src/i18n.js`, `src/theme.css`, `src/firebase.js` (não mexer), `index.html`, `scripts/gerar-logo.js`.

---

Histórico detalhado em docs/estado-do-projeto.md e pendências em docs/pendencias.md. Leia só quando precisar.
