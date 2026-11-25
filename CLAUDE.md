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
  - `perfis/{uid}`: `apelido` (1 a 30 caracteres) e `atualizadoEm` (sempre), mais os OPCIONAIS `cpf` (só os 11 dígitos), `nascimento` (AAAA-MM-DD), `telefone` (só dígitos, 10 a 13) e `foto` (data URL JPEG). Nomes exatamente esses. Gravar SEMPRE com `setDoc` SEM merge, objeto completo com `apelido` + `atualizadoEm: new Date()` (não `serverTimestamp`) e só os opcionais preenchidos, para campo esvaziado sumir do documento (função `salvarPerfil` no App.jsx).

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
- `src/Perfil.jsx`: página de Perfil (view `perfil`, fora da navegação lateral). `src/perfilUtil.js`: validação de CPF, máscaras, limites da data e `processarFoto`. `src/Avatar.jsx`: foto ou inicial.
- `src/subcategorias.js`: só `MAX_SUB = 40` (não há atalhos prontos).
- `src/Relatorio.jsx`: PDF por período, com jsPDF desenhando direto.
- `src/i18n.js`: textos em PT / EN / ES (`T`, `LANGS`). **Todo texto novo deve existir nos 3 idiomas.**
- `src/Privacidade.jsx`: Política de Privacidade (LGPD), página pública em `#/privacidade`.
- `src/Logo.jsx`, `src/Landing.jsx`, `src/theme.css`, `src/firebase.js`, `vercel.json`, `scripts/gerar-logo.js`.
- Gráficos: donut em CSS conic-gradient e barras em CSS (sem Chart.js).

## Apelido, Perfil e menu da conta

- **Primeiro acesso** (sem `perfis/{uid}` ou sem apelido): diálogo obrigatório "Como você quer ser chamado?", já preenchido com o primeiro nome (displayName, ou o e-mail antes do @ cortado no primeiro ponto/número, com inicial maiúscula). Depois o apelido vem do banco (vale em qualquer aparelho).
- **Página de Perfil** (menu da conta → Perfil), cards arredondados em coluna única:
  - **Conta**: e-mail cadastrado (somente leitura), nome de exibição (1 a 30) com Salvar e o avatar grande, que é um `button` acessível (aria-label, foco visível, teclado). No celular o avatar vai para cima dos campos.
    - Sem foto: mostra a inicial; no hover/foco aparece uma câmera; clicar abre direto o seletor de arquivo.
    - Com foto: no hover/foco escurece e mostra um lápis; clicar abre um mini menu abaixo do avatar com "Mudar avatar" e "Remover avatar" (em `--color-negative`). Fecha com Esc, clique fora ou ao escolher.
    - Trocar/remover salva na hora (sem botão Salvar), com "Salvando…" e aviso rápido de sucesso/erro. Remover grava o perfil sem o campo `foto`.
  - **Dados opcionais** (aviso com link para a Política): CPF com máscara e dígitos verificadores (depois de salvo aparece `***.***.***-XX` + botão Alterar), data de nascimento (não futura, no máximo 120 anos), telefone com máscara. Um botão "Salvar dados"; campo vazio = remove o dado antigo.
  - **Zona de perigo**: título em coral e botão "Excluir minha conta" (abre o diálogo de exclusão).
- **Foto**: NÃO usa Firebase Storage. Aceita JPG/PNG/WebP até 5 MB; o navegador recorta o quadrado central, reduz para no máximo 256x256 e exporta JPEG 0.8, baixando qualidade/tamanho até ficar abaixo de 120.000 caracteres; grava como data URL em `perfis/{uid}.foto`. Aparece no chip da barra lateral, no cabeçalho do menu e no Perfil.
- **Menu da conta** (chip no rodapé da barra lateral): cabeçalho (avatar 40px, apelido, e-mail cortado com reticências) → Perfil → Exportar CSV → Legal (abre direto a Política de Privacidade) → Sair. Sem "Aparência", sem "Cobrança" e sem "Excluir" (exclusão fica no Perfil). Fecha com Esc, clique fora ou ao escolher; no celular vira só o avatar e abre para baixo com `position: fixed`.

## Subcategorias (atalhos)

- Só existem os atalhos criados pelo próprio usuário (coleção `subcategorias`); NÃO há atalhos prontos no código. Na tela Lançar aparecem os da categoria escolhida + "+ Novo"; sem nenhum, mostra a dica "Crie atalhos para o que você mais repete…". Atalhos têm × para excluir (com confirmação).
- Tocar num atalho só marca `sub`, NÃO preenche a descrição. A descrição é um "Detalhe (opcional)"; se ficar vazia, grava `desc` = nome do atalho (o banco exige `desc`).
- No Histórico e na prévia do Relatório, a etiqueta do atalho só aparece se for diferente da descrição (sem diferenciar maiúsculas).

## Exportar CSV

- Arquivo `falc-lancamentos-AAAA-MM-DD.csv` (data de hoje), feito para o Excel em português: começa com BOM UTF-8 (`\uFEFF`), separador `;`, textos entre aspas (aspas internas duplicadas), quebra de linha CRLF.
- Em PT: data `dd/mm/aaaa` e vírgula decimal; em EN/ES: data `AAAA-MM-DD` e ponto decimal. Cabeçalho traduzido: Data, Tipo, Categoria, Subcategoria, Descrição, Valor.

## Privacidade e LGPD (feito em nov/2026)

- **Política de Privacidade** em `src/Privacidade.jsx`, aberta sem login em `/#/privacidade`. O App.jsx escuta o `hashchange` e mostra a página antes de qualquer outra tela; o "Voltar" limpa o hash e volta para onde a pessoa estava.
  - Responsável (controlador): o próprio projeto **FALC** (não citar nome de pessoa na política nem no código). Contato: **falc.empresa@gmail.com**, na constante `EMAIL_CONTATO` no topo do arquivo. Pedidos e dúvidas sempre orientam a "entrar em contato pelo e-mail de privacidade".
  - O texto das 11 seções fica em `src/i18n.js` (`privSecoes`, com `{email}` trocado pela página). A seção 9 é "Crianças e adolescentes" (menores de 12: conta criada e acompanhada por um responsável, que consente; 12 a 17: recomendamos que um responsável saiba e acompanhe). A seção 3 cita o art. 14, §1º, da LGPD para menores de 12. Prazo de resposta informado: 15 dias. Ao mudar a política, atualize `privAtualizado` nos 3 idiomas.
  - Links para a política: rodapé da Landing, embaixo do formulário de login, no menu da conta (Legal) e no card "Dados opcionais" do Perfil.
  - A seção 2 explica que CPF, nascimento, telefone e foto são opcionais; a seção 8 diz que a exclusão fica no Perfil, no fim da página.
- **Aceite no cadastro:** caixa "Li e concordo com a Política de Privacidade. Se tenho menos de 18 anos, meu responsável legal está ciente (menores de 12: a conta deve ser criada pelo responsável).", obrigatória para criar conta por e-mail/senha e para o botão Google na aba "Criar conta".
  - Brecha conhecida: o botão Google na aba "Entrar" pode criar uma conta nova sem o aceite.
- **Excluir minha conta** (Perfil → Zona de perigo): diálogo em que a pessoa digita a palavra de confirmação (EXCLUIR / DELETE / ELIMINAR, conforme o idioma).
  - Só segue se o último login (`metadata.lastSignInTime`) foi há menos de 5 minutos; senão pede para sair e entrar de novo.
  - Ordem: apaga os docs de `transacoes` e `subcategorias` do uid e o `perfis/{uid}` (se existir; inclui foto e dados opcionais), em lotes de até 400 com `writeBatch`; depois `deleteUser`, limpa as chaves `fp_*` do localStorage e volta para a Landing. Se apagar os dados falhar, a conta NÃO é apagada.
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
