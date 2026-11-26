# FALC — finanças pessoais para jovens e estudantes

App web de finanças pessoais (antigo "Capital Hub"/"Oink"; rebranding para **FALC** em nov/2026).
Dono: Guizera (19, Administração na FGV, São Paulo). Ele está aprendendo: explique de forma clara, simples e passo a passo.

## Regras de manutenção deste arquivo

1. Ao terminar qualquer tarefa que mude o projeto (telas, textos da política, coleções do Firestore, regras de segurança, rotas, paleta, dependências, comandos), atualize este CLAUDE.md **no mesmo commit da tarefa**, sem esperar o dono pedir.
2. Atualize só o que mudou, em poucas linhas. Mantenha o arquivo curto e organizado por tópicos (estrutura, dados e Firestore, design e marca, LGPD, regras de trabalho). Remova o que ficou desatualizado em vez de acumular.
3. Registre sempre as decisões do dono na seção "Decisões do dono".
4. Mantenha a REGRA DE DADOS (abaixo).
5. No fim de cada tarefa, diga ao dono em uma linha o que foi atualizado aqui.

## Regra de dados (vale para tudo)

- NUNCA criar, alterar nem apagar dados no Firebase (Firestore ou Authentication): nada de lançamentos, atalhos, perfis ou contas de teste, seeds, migrações ou chamadas ao banco pelo terminal.
- NUNCA testar gravações logado na conta real do dono. Teste só visual, build e revisão de código; para o que grava no banco, passe ao dono o passo a passo para testar numa conta de teste dele.
- NUNCA publicar regras do Firestore nem mexer em credenciais/config do Firebase. As regras de `transacoes`, `subcategorias` e `perfis` já foram publicadas pelo dono.
- Se algo exigir gravar dados para funcionar, PARE e pergunte.
- Telas logadas na conferência visual: config temporária do Vite trocando `./firebase`, `firebase/auth` e `firebase/firestore` por mocks em memória; apagar os mocks no fim e nunca commitá-los.

## Decisões do dono

- Nome sempre **FALC**, em maiúsculas. Paleta café + bege; fontes Fraunces + DM Sans; logo final do Recraft sem redesenhar formas.
- Frase de efeito (Landing e login): PT "Veja seu dinheiro com olhos de falcão." · EN "See your money through a falcon's eyes." · ES "Mira tu dinero con ojos de halcón."
- Textos da Landing sobre dados só podem repetir o que a Política já afirma (não citar "SQL"; o banco é Firestore).
- Menores de 18 anos podem usar o app. Menores de 12: conta criada e acompanhada por um responsável, que consente. De 12 a 17: recomendamos que um responsável saiba e acompanhe.
- CPF, data de nascimento, telefone e foto são **opcionais** e só aparecem no perfil. Para menores de 18, o Perfil recomenda não preencher CPF e telefone sem um responsável.
- O responsável (controlador) na Política é o próprio FALC; nenhum nome pessoal na política nem no código. Contato: falc.empresa@gmail.com.
- Simulador de decisão (trabalhar × bolsa × crédito) **removido** de propósito; não recriar sem pedido.
- Atalhos (subcategorias) só os criados pelo usuário; nada de atalhos prontos no código.
- Foto de perfil sem Firebase Storage (data URL no Firestore).
- Menu da conta sem "Aparência", "Cobrança" ou "Excluir"; avatar sem "Mudar decoração de avatar". Exclusão de conta só no Perfil.

## Estrutura do projeto

- Site: https://financas-pessoais-gray.vercel.app · Repo: github.com/guiayres5990/financas-pessoais (deploy automático na Vercel a cada `git push` na `main`).
- Stack: React + Vite, Firebase Auth (e-mail/senha + Google via `signInWithRedirect`), Firestore (projeto `financas-pessoais-14ce7`), jsPDF, Phosphor Icons (pesos regular e bold, via unpkg no `index.html`).
- `src/App.jsx`: rotas/telas (landing → login → app; views dashboard, lançar, histórico, relatório e perfil), tela de login/cadastro, gravação do perfil (`salvarPerfil`), CSV e exclusão de conta. Exporta `CATS_BASE` e `fmt`.
- `src/Landing.jsx`: página inicial em blocos (ver "Telas e comportamentos"); listas `PASSOS`, `RECURSOS` e `LGPD` no topo do arquivo.
- `src/Perfil.jsx` (+ `perfilUtil.js`: CPF, máscaras, data, `processarFoto`; `Avatar.jsx`), `src/MenuConta.jsx`, `src/Relatorio.jsx` (PDF com jsPDF), `src/Privacidade.jsx`, `src/Logo.jsx`, `src/subcategorias.js` (`MAX_SUB = 40`), `src/i18n.js`, `src/theme.css`, `scripts/gerar-logo.js`.
- `src/i18n.js`: textos em PT / EN / ES. **Todo texto novo deve existir nos 3 idiomas.** Idioma salvo em `fp_lang` (padrão PT); tema em `fp_theme`.
- Gráficos em CSS (donut conic-gradient e barras), sem Chart.js.

## Dados e Firestore

Cada usuário só acessa os próprios dados (por `uid`).
- `transacoes`: `uid`, `tipo`, `valor`, `desc` (obrigatória), `cat`, `data`, `criadoEm` e `sub` (opcional, até 40). Índice composto uid asc + data desc.
- `subcategorias`: `{ uid, cat, nome, criadoEm }`. Ler só com `where("uid","==",uid)`, SEM `orderBy` (ordenar no cliente).
- `perfis/{uid}`: `apelido` (1 a 30) e `atualizadoEm` sempre; opcionais `cpf` (11 dígitos), `nascimento` (AAAA-MM-DD), `telefone` (só dígitos, 10 a 13) e `foto` (data URL JPEG). Gravar SEMPRE com `setDoc` SEM merge, objeto completo com `atualizadoEm: new Date()` e só os opcionais preenchidos (campo vazio some).
- Foto: JPG/PNG/WebP até 5 MB → recorte quadrado central, máx. 256x256, JPEG 0.8, abaixo de 120.000 caracteres.

## Telas e comportamentos

- **Landing** (rolagem única, blocos com bastante espaço): a) hero sem etiqueta acima do título, com a frase de efeito como título, subtítulo "Organização, planejamento e controle financeiro: tudo o que o FALC entrega para você." (`heroLede`), "Começar agora" (botão cheio) / "Já tenho conta", a linha "Seus dados são só seus. Exclua sua conta quando quiser." (`dadosSeguros`) e o cartão de exemplo; b) "Como funciona" (título "Cada real com um destino.", 3 passos numerados: Anote, Veja, Feche o mês); c) "Recursos" (7 cartões, só o que o app tem); d) "Seus dados, protegidos" (4 pontos tirados da Política + link `.link-destaque`); e) CTA com o falcão vertical, a frase e "Começar agora"; f) rodapé com logo, link da Política, idioma e tema. Os links "Recursos"/"Relatório" do cabeçalho rolam até os blocos sem mudar o hash (o app usa `#/privacidade`).
- **Login/cadastro** em 2 colunas: esquerda com fundo de seção (`--color-section`; no claro `--color-accent-900`), falcão vertical grande e a frase; direita com o formulário (cartão até 420px, campos e botões de 48px, rótulos e textos auxiliares de 14px+, botão principal `.btn-cheio`). Barra do topo com "Voltar" (`.btn-voltar`) e seletor de idioma. No celular o painel vira um bloco compacto no topo. A lógica de autenticação e o aceite obrigatório não mudaram.
- **Primeiro acesso:** diálogo obrigatório "Como você quer ser chamado?" (sugere o primeiro nome).
- **Perfil** (menu → Perfil), cards em coluna única: Conta (e-mail só leitura, nome de exibição, avatar), Dados opcionais (CPF com dígitos verificadores, mostrado `***.***.***-XX` depois de salvo; nascimento até 120 anos; telefone) e Zona de perigo (excluir conta).
  - Avatar é um `button` acessível: sem foto mostra a inicial e abre direto o seletor; com foto mostra lápis no hover/foco e abre mini menu "Mudar avatar" / "Remover avatar". Salva na hora, com "Salvando…" e aviso.
- **Menu da conta** (chip no rodapé da barra lateral, com foto): Perfil, Exportar CSV, Legal (abre a Política), Sair. Fecha com Esc/clique fora; no celular vira só o avatar.
- **Lançar:** atalhos da categoria + "+ Novo" (com dica se não houver). Tocar no atalho só marca `sub`; a descrição é "Detalhe (opcional)" e, vazia, grava `desc` = nome do atalho. Histórico mostra a etiqueta só se diferente da descrição.
- **CSV:** `falc-lancamentos-AAAA-MM-DD.csv` para Excel em PT: BOM UTF-8, separador `;`, textos entre aspas, CRLF; PT com data dd/mm/aaaa e vírgula decimal, EN/ES com AAAA-MM-DD e ponto.
- **PDF:** cabeçalho escuro com o falcão bege (`falc-simbolo-bege-512.png`, 24mm, `"FAST"`) e coluna Subcategoria.

## Design e marca

| Uso | Escuro (padrão) | Claro (`[data-theme="light"]`) |
|---|---|---|
| Fundo / superfície | café `#15100D` / `#201813` | `#F4EEE4` / `#FBF8F3` |
| Texto | creme `#F3ECE2` | `#1F1812` |
| Acento | bege `#D9C7A3` | `#7A6240` |
| Despesas (coral) | `#E19A8B`, barras `#BE6B5C` | `#A5503F` |
| Logo (`--logo-falcao` / `--logo-texto`) | `#D9C7A3` / `#F3ECE2` | `#7A6240` / `#1F1812` |

- Use os tokens do `theme.css`, nunca cores fixas no JSX.
- Fraunces carregada com os eixos `opsz,wght,SOFT,WONK` (Google Fonts no `index.html`). Todos os títulos em Fraunces (h1–h5 e `.auth-frase`) usam uma regra única: peso 500, `font-optical-sizing: none`, `font-variation-settings: "opsz" 36, "SOFT" 0, "WONK" 0`, sem ligaduras, `letter-spacing: -0.01em`. Títulos em DM Sans (ex.: `.lp-recurso h3`) voltam ao ajuste óptico normal. O "f" curvado e o "j" com cauda são do desenho da própria Fraunces (não do WONK).
- `src/Logo.jsx`: `variant="horizontal"`, `"vertical"` (falcão em cima, FALC embaixo, posição original do SVG) ou `"simbolo"`; tamanhos: barra lateral 30px, Landing/Política 36px, rodapé 28px, CTA vertical 180px (140 no celular), login vertical 240px (96 no celular); no celular a barra lateral usa o símbolo. Sem texto "FALC" solto ao lado. Regerar com `node scripts/gerar-logo.js <pasta com falc-horizontal.svg e falc-simbolo.svg>` (usa `sharp`).
- SVG original do Recraft (vertical): `C:\projetos\logo-final\falc-vertical.svg.svg`; `falc-horizontal.svg` e `falc-simbolo.svg` aprovados ficam em `Downloads`.
- Ícones: `public/falc-icone.svg` (favicon), `public/apple-touch-icon.png` (180x180).
- Botões: `.btn-cheio` (ação principal, fundo acento), `.btn-grande` (48px), `.lp-toque` / `.link-alvo` (alvo de toque de 44px).
- Links da Política usam `.link-destaque` (negrito + sublinhado; no claro, cor do texto com sublinhado marrom), mas NÃO dentro do menu da conta: lá o item "Legal" é igual aos outros itens (`.conta-item`).

## LGPD e Política de Privacidade

- Página pública `#/privacidade` (`src/Privacidade.jsx`), no idioma salvo do app; **sem seletor de idioma** nessa página. Botão "Voltar" grande (`.btn-voltar`, 44px, seta bold) no canto superior direito.
- 11 seções em `src/i18n.js` (`privSecoes`, `{email}` trocado pela página); seção 9 "Crianças e adolescentes"; seção 3 cita o art. 14, §1º, da LGPD para menores de 12. Pedidos sempre "pelo e-mail de privacidade"; prazo de 15 dias. Ao mudar a política, atualize `privAtualizado` nos 3 idiomas.
- Links para a política: rodapé da Landing e do login, aceite do cadastro e card "Dados opcionais" (com destaque), e o item "Legal" do menu da conta (sem destaque).
- Aceite obrigatório no cadastro (e-mail/senha e Google na aba "Criar conta"), mencionando o responsável legal para menores. Brecha conhecida: Google na aba "Entrar" pode criar conta sem o aceite.
- Excluir conta (Perfil → Zona de perigo): digitar EXCLUIR/DELETE/ELIMINAR; exige login há menos de 5 min; apaga `transacoes`, `subcategorias` e `perfis/{uid}` em lotes de 400 e só então `deleteUser`; se apagar os dados falhar, a conta não é apagada.

## Armadilhas já resolvidas (não repetir)

- PDF: NÃO usar html2canvas (falha com `oklch`); evitar caracteres fora da fonte padrão (ex.: "−" U+2212).
- Usar `CATS_BASE` (não `CATS`); não exportar nada de dentro de componente.
- `node_modules/` e `dist/` fora do git (senão a Vercel dá "vite: Permission denied").
- Login Google por redirect (popup fechava sozinho).
- OneDrive: o repo tem `git config windows.appendAtomically false` (senão o commit falha).
- Celular: grids/flex com campos e tabelas precisam de `minmax(0, 1fr)` / `min-width: 0`; tabelas largas dentro de `.table-scroll`.
- `C:\projetos\financas-pessoais` é uma cópia antiga e parada; não usar.

## Regras de trabalho

- Windows; o dono usa **CMD** (PowerShell bloqueia npm). Projeto em `C:\Users\windows\OneDrive\Área de Trabalho\financas-pessoais`.
- Ler os arquivos antes de mexer; mudanças pequenas e testadas; o dono prefere arquivos reescritos por inteiro.
- Sempre `npm run build` e `git status` antes de commit/push.
- Explicar em linguagem simples, sem jargão.

## Próximas tarefas

1. Firebase App Check.
2. Possível dimensão de educação financeira para estudantes.
