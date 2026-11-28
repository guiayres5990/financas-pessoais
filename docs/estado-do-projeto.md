# FALC — estado do projeto

Histórico detalhado do que foi feito e decidido. O resumo para toda sessão fica no `CLAUDE.md`; o que falta fica em `docs/pendencias.md`.
Última revisão: 26/11/2026 (limpeza do repositório e cópia das regras v4). Onde não há certeza, está escrito "a confirmar".

---

## 1. Estrutura do projeto

- App web de finanças pessoais para jovens e estudantes. Antes se chamava "Capital Hub" (mascote "Oink", porquinho roxo); virou **FALC** em nov/2026.
- Produção: https://financas-pessoais-gray.vercel.app — deploy automático na Vercel a cada `git push` na `main` do repositório github.com/guiayres5990/financas-pessoais.
- Pasta local: `C:\Users\windows\OneDrive\Área de Trabalho\financas-pessoais` (dentro do OneDrive). `C:\projetos\financas-pessoais` é uma cópia antiga e parada: não usar.
- Stack: React 18 + Vite 4, Firebase Auth (e-mail/senha + Google por redirect), Firestore (projeto `financas-pessoais-14ce7`), jsPDF, Phosphor Icons (regular + bold, via unpkg), Google Fonts (Fraunces + DM Sans). `sharp` só como devDependency, para gerar o logo.

### Arquivos principais

| Arquivo | Para que serve |
|---|---|
| `index.html` | Título, favicon (`falc-icone.svg`), apple-touch-icon, fontes do Google e ícones Phosphor |
| `src/main.jsx` | Monta o `App` e importa `theme.css` |
| `src/App.jsx` | Rotas e telas (landing → login → app; views dashboard, histórico, relatório, perfil; painel de novo lançamento; `#/lancar` → Visão geral + painel), login/cadastro, leitura dos dados, `salvarPerfil`, CSV, exclusão de conta. Exporta `CATS_BASE` e `fmt` |
| `src/Landing.jsx` | Página inicial em blocos (listas `PASSOS`, `RECURSOS`, `LGPD` no topo do arquivo) |
| `src/Privacidade.jsx` | Política de Privacidade pública em `#/privacidade` (`EMAIL_CONTATO` no topo) |
| `src/Perfil.jsx` | Página de Perfil (Conta, Dados opcionais, Zona de perigo) |
| `src/perfilUtil.js` | Validação de CPF, máscaras de CPF/telefone, limites da data de nascimento, `processarFoto` |
| `src/Avatar.jsx` | Avatar redondo (foto ou inicial) |
| `src/MenuConta.jsx` | Chip da conta no rodapé da barra lateral + menu |
| `src/Relatorio.jsx` | Relatório e PDF por período (jsPDF desenhando direto) |
| `src/Logo.jsx` | Logo em SVG inline: `horizontal`, `vertical`, `simbolo` |
| `src/subcategorias.js` | Só `MAX_SUB = 40` (não há atalhos prontos) |
| `src/PageHeader.jsx` | Cabeçalho das páginas do app (título, subtítulo opcional e ações à direita). Usado uma vez no topo de `.content` para Visão geral, Histórico, Relatório e Perfil |
| `src/PainelLancamento.jsx` | "Casca" do painel de novo lançamento: fundo escurecido, `role="dialog"` + `aria-modal`, foco preso, foco inicial no valor, Esc, aviso "Descartar o lançamento?", animação de 200ms (sem movimento com `prefers-reduced-motion`). O formulário e a lógica ficam no `App.jsx` |
| `src/Vazios.jsx` | Telas vazias: `BoasVindas` (cartão da Visão geral para conta sem lançamentos) e `Vazio` (mensagem com falcão, título, texto e botão opcionais) |
| `src/parseValor.js` | Lê o valor digitado (PT: `1.000,50`; EN: `1,000.50`; com os dois separadores o último é o decimal; até 2 casas; recusa vazio, letras, negativo, zero e acima de 999.999.999,99). Usado em todo campo de dinheiro |
| `src/i18n.js` | Todos os textos em PT / EN (`T`, `LANGS`, `idiomaInicial`, `normalizarIdioma`) |
| `src/theme.css` | Tokens de cor, fontes e todos os estilos |
| `src/firebase.js` | Inicializa Firebase (`auth`, `db`). Não mexer na configuração |
| `scripts/gerar-logo.js` | Regera `Logo.jsx` e os ícones a partir dos SVGs aprovados |
| `scripts/testar-valor.mjs` | Testes do `parseValor` em Node puro (`npm run test:valor`) |
| `vercel.json`, `vite.config.js` | Configuração de deploy e build |
| `firestore.rules` | Cópia das regras publicadas no console (v4), só para consulta. Não publicar pelo terminal |

---

## 2. Firestore

Cada usuário só acessa os próprios dados (por `uid`). As **regras de segurança foram publicadas pelo dono direto no console do Firebase**, que é a fonte oficial; `firestore.rules` na raiz é uma cópia da versão publicada (v4), entregue pelo dono em 26/11/2026. Nunca publicar regras pelo terminal (`firebase deploy`).

O que a v4 exige: `transacoes` e `subcategorias` só podem ser criadas, lidas e apagadas pelo dono (edição negada); `perfis/{uid}` pode ser criado e atualizado. Cada coleção aceita só os campos da tabela abaixo, com estes limites extras: `valor` > 0 e < 1 bilhão, `desc` 1 a 200, `cat` até 30, `data` com 10 caracteres, `criadoEm`/`atualizadoEm` como data; `foto` até 150.000 caracteres e só `data:image/jpeg|png|webp;base64`. Todo o resto do banco é fechado.

Conferido no código em 26/11/2026: os campos e formatos que o app grava batem com a v4. O limite de valor do banco (< 1 bilhão) também é conferido no app pelo `parseValor` (máximo R$ 999.999.999,99), com aviso no campo antes de salvar.

| Coleção | Campos que o app grava | Observações |
|---|---|---|
| `transacoes` | `uid`, `tipo` ("receita"/"despesa"), `valor` (número), `desc` (texto, obrigatório), `cat`, `data` (AAAA-MM-DD), `criadoEm` (Date) e `sub` (opcional, até 40) | Leitura com `where("uid","==",uid)` + `orderBy("data","desc")` — exige o índice composto uid asc + data desc (já criado) |
| `subcategorias` | `uid`, `cat`, `nome` (1 a 40), `criadoEm` (`serverTimestamp`) | Atalhos criados pelo usuário. Ler só com `where("uid","==",uid)`, **sem** `orderBy` (ordena no navegador) |
| `perfis/{uid}` | `apelido` (1 a 30) e `atualizadoEm` (`new Date()`) sempre; opcionais `cpf` (11 dígitos), `nascimento` (AAAA-MM-DD), `telefone` (só dígitos, 10 a 13), `foto` (data URL JPEG) | Gravado SEMPRE com `setDoc` **sem merge** e só com os campos preenchidos, para campo esvaziado sumir do documento (`salvarPerfil` no `App.jsx`) |

Exclusão de conta apaga `transacoes` e `subcategorias` do uid e `perfis/{uid}` (se existir), em lotes de até 400 com `writeBatch`; só depois chama `deleteUser`.

---

## 3. Marca e tema

- Nome sempre **FALC**, em maiúsculas.
- Paleta café + bege. Sempre usar os tokens do `theme.css` (nada de cor fixa no JSX).

| Uso | Escuro (padrão) | Claro (`[data-theme="light"]`) |
|---|---|---|
| Fundo / superfície | `#15100D` / `#201813` | `#F4EEE4` / `#FBF8F3` |
| Texto | `#F3ECE2` | `#1F1812` |
| Acento | `#D9C7A3` | `#7A6240` |
| Despesas (coral) | `#E19A8B`, barras `#BE6B5C` | `#A5503F` |
| Logo (`--logo-falcao` / `--logo-texto`) | `#D9C7A3` / `#F3ECE2` | `#7A6240` / `#1F1812` |
| Seção (painel do login) | `--color-section` `#2A1F17` | `--color-accent-900` |

- Fontes: **Fraunces** nos títulos, **DM Sans** no texto. A Fraunces é carregada com os eixos `opsz, wght, SOFT, WONK`. Todos os títulos em Fraunces (h1–h5 e `.auth-frase`) usam: peso 500, `font-optical-sizing: none`, `font-variation-settings: "opsz" 36, "SOFT" 0, "WONK" 0`, sem ligaduras, `letter-spacing: -0.01em`. O "f" curvado e o "j" com cauda são do desenho da própria Fraunces (testado: o WONK só mexe em "h" e "n").
- Logo final (falcão, gerado no Recraft): `src/Logo.jsx` com as formas originais; só as cores vêm do CSS. Variantes: `horizontal` (falcão + FALC ao lado), `vertical` (falcão em cima, FALC embaixo — posição original), `simbolo` (só o falcão).
  - Tamanhos: barra lateral 30px (no celular, só o símbolo), Landing/Política 36px, rodapé 28px, CTA vertical 180px (140 no celular), login vertical 240px (96 no celular).
  - SVG original: `C:\projetos\logo-final\falc-vertical.svg.svg`. `falc-horizontal.svg` e `falc-simbolo.svg` aprovados pelo dono ficam em `Downloads`. Regerar: `node scripts/gerar-logo.js <pasta com os dois SVGs>`.
  - Ícones: `public/falc-icone.svg` (favicon, café com falcão bege), `public/apple-touch-icon.png` (180x180), `public/falc-simbolo-bege-512.png` (cabeçalho do PDF).
- Classes úteis: `.btn-cheio` (ação principal), `.btn-grande` (48px), `.btn-voltar` (Voltar forte, 44px), `.link-destaque` (links da Política), `.link-alvo` / `.lp-toque` (alvo de toque de 44px), `.table-scroll` (tabela larga rola dentro do card).

---

## 4. Telas e funcionalidades

- **Landing** (rolagem única, blocos espaçados): (a) hero com o título "Veja seu dinheiro com olhos de falcão.", subtítulo "Organização, planejamento e controle financeiro: tudo o que o FALC entrega para você.", botões "Começar agora" (cheio) e "Já tenho conta", a linha "Seus dados são só seus. Exclua sua conta quando quiser." e o cartão de exemplo do saldo; (b) "Como funciona" — título "Cada real com um destino." e 3 passos (Anote, Veja, Feche o mês); (c) "Recursos" — 7 cartões (lançamentos com atalhos, histórico, PDF, CSV, tema claro/escuro, 2 idiomas, perfil com foto); (d) "Seus dados, protegidos" — 4 pontos tirados da Política + link; (e) CTA com o falcão vertical, a frase e "Começar agora"; (f) rodapé só com logo (esquerda), link da Política (direita) e a frase "FALC · feito no Brasil · privacidade primeiro" embaixo; idioma e tema ficam só no cabeçalho do topo (decisão do dono, nov/2026). Os links "Recursos"/"Relatório" do cabeçalho rolam até os blocos sem mudar o hash.
- **Login/cadastro** em 2 colunas: esquerda com fundo de seção, falcão vertical e a frase; direita com o formulário num cartão de superfície com sombra (até 460px, padding 32px/20px no celular, campos e botões de 48px, textos auxiliares de 14px+). Barra do topo com "Voltar" e idioma. No celular, o painel vira um bloco compacto no topo. Campo de senha com rótulo "Senha" e dica "Use ao menos 6 caracteres." no cadastro.
- **Primeiro acesso:** diálogo obrigatório "Como você quer ser chamado?", sugerindo o primeiro nome (displayName ou e-mail antes do @, cortado no primeiro ponto/número).
- **Perfil** (menu da conta → Perfil): cards Conta (e-mail só leitura, nome de exibição 1–30, avatar), Dados opcionais (CPF com dígitos verificadores e exibição `***.***.***-XX`; nascimento até 120 anos atrás e não futuro; telefone com máscara; aviso para menores de 18) e Zona de perigo (excluir conta).
  - Avatar é um botão: sem foto abre o seletor; com foto abre um mini menu "Mudar avatar" / "Remover avatar". Salva na hora.
  - Foto sem Firebase Storage: JPG/PNG/WebP até 5 MB → recorte quadrado, máx. 256x256, JPEG 0.8, abaixo de 120.000 caracteres, gravada em `perfis/{uid}.foto`.
- **Menu da conta:** chip com avatar no rodapé da barra lateral → Perfil, Exportar CSV, Legal (abre a Política), Sair. Fecha com Esc/clique fora; no celular vira só o avatar e abre para baixo.
- **Cabeçalho das páginas (pós-login):** `PageHeader` dentro de `.content` → título e subtítulo começam na mesma borda e na mesma altura dos cartões em todas as páginas (conferido em 1440 e 375). Título em Fraunces `clamp(28px, 20px + 2.2vw, 36px)`, peso 500; subtítulo em DM Sans 16px, `--color-neutral-400`. Subtítulos: Visão geral "Como o mês está indo até aqui", Histórico "Tudo que você registrou no mês", Relatório "Escolha o período e exporte em PDF", Perfil "Sua conta e seus dados". O seletor de mês fica à direita do título (Visão geral e Histórico). A barra do topo (`.topbar`) tem só ocultar valores, idioma, tema e "Novo lançamento", com a mesma linha divisória em todas as páginas. No celular, `.shell` usa `grid-template-rows: auto 1fr` para a barra não esticar em página curta.
- **Painel de novo lançamento (teste, nov/2026):** substituiu a aba/página Lançar (removida da barra lateral, que ficou com Visão geral, Histórico e Relatório). Abre pelo "Novo lançamento" do topo em qualquer página; no celular (≤900px) o botão do topo some e aparece o "+" flutuante de 56px no canto inferior direito (`.content` ganha 104px embaixo para ele não cobrir nada). Desktop: lateral de 440px vindo da direita; celular: tela cheia vindo de baixo. A página atrás fica `inert`. Mesmo formulário e mesma lógica de antes (Despesa/Receita, valor com `parseValor`, categoria, data, atalhos com "+ Novo" e ×, detalhe, regra atalho OU detalhe). Fechar: Cancelar (direto), Esc, fundo ou ✕; com algo preenchido, Esc/fundo/✕ mostram dentro do painel "Descartar o lançamento?" com Descartar e Continuar. Fechar limpa valor, detalhe e atalho; o foco volta ao botão que abriu. Ao salvar: fecha, mostra "Lançamento salvo" por 3s (`.aviso-flutuante`) e a página se atualiza pelo `onSnapshot` (antes ia para o Histórico). `#/lancar` → Visão geral com o painel aberto. Removidas a dica "Dica: use o mesmo texto para gastos recorrentes — fica mais fácil achar no histórico." e as chaves `dicaLancamento` e `lancar`. Textos novos (PT/EN): `painelLancTitulo`, `lancamentoSalvo`, `descartarPergunta`, `descartar`, `fecharPainel`. Conferido só abrir/fechar/foco/layout com mocks (o formulário não foi enviado). Para desfazer: `git revert` do commit "Painel de novo lançamento (teste)".
- **Idiomas (nov/2026):** só português e inglês; o bloco `es` e a opção "Español" saíram. `fp_lang` = "es" (ou navegador em espanhol sem escolha salva) abre em inglês. Cartão da Landing: "2 idiomas / Português e inglês.".
- **Visão geral (nov/2026):** 3 KPIs e, abaixo, `.dash-row` com "Despesas por categoria" (60%, `minmax(0,3fr)`) e o gráfico "Últimos 6 meses" (40%, `.dash-grafico`, a área das barras estica para a mesma altura do cartão ao lado); até 900px empilham. O cartão "Projeção do mês" foi removido junto com o cálculo (`projecao`, `projPct`, `diaAtual`, `diasMes`, que só ele usava; o Relatório/PDF não usa) e as chaves `projecao`, `projecaoAcima`, `sobraprevista`, `ritmoAtual`, `pctReceita`, `receita2`. A classe `.proj-note` continua (usada no aviso de e-mail enviado do login). Barras mais finas (até 14px, 3px entre elas, 12px entre meses).
- **Telas vazias (nov/2026):** "conta vazia" = 1ª leitura dos lançamentos já chegou (`txsCarregados`) e `txs` está vazio (sem consulta nova nem índice). Visão geral: KPIs com R$ 0,00 e o cartão `BoasVindas` no lugar de categorias e gráfico: título "Bem-vindo ao FALC, {apelido}!" (sem apelido: "Bem-vindo ao FALC!"), texto "Anote seu primeiro gasto ou receita e veja para onde seu dinheiro vai.", botão "Fazer meu primeiro lançamento" (abre o painel), 3 passos (Anote, Classifique, Acompanhe; empilham até 600px) e o falcão símbolo discreto. Mês vazio com outros meses preenchidos: categorias com "Nenhum lançamento neste mês." + "Novo lançamento"; o gráfico continua mostrando os outros meses (só mostra a mensagem se os 6 meses estiverem vazios). Histórico: conta vazia → falcão + "Nada por aqui ainda" + "Seus lançamentos aparecem nesta lista." + "Novo lançamento" (sem a busca); mês vazio → mensagem do mês + botão; busca sem resultado → "Nenhum resultado para a busca." (sem botão). Relatório: "Sem lançamentos neste período." e "Gerar PDF" desativado (opacidade, cursor proibido, `title` e `aria-describedby` com a mensagem). O CSV fica no menu da conta, não no Relatório. Chave `nenhumLanc` removida; `nenhumPeriodo` com o texto novo.
- **Gráfico "Últimos 6 meses":** colunas são botões (`.col-botao`); tooltip `.bars-tip` com Receitas, Despesas e Saldo (`pt-BR` ou `en-US`, respeita "Ocultar valores"), abre por mouse, toque (fecha ao tocar fora ou Esc) e Tab, ao lado da coluna. Mês atual (ou o escolhido, se o atual não estiver no gráfico) com rótulo em negrito e barras cheias; anteriores com 50% de opacidade; mês sem lançamentos só com traço neutro.
- **Lançamento e atalhos:** atalhos só do usuário, por categoria, com "+ Novo" e × para excluir (com confirmação). Tocar no atalho só marca `sub`; com o detalhe vazio, grava `desc` = nome do atalho. Histórico mostra a etiqueta do atalho só se diferente da descrição.
- **Regra de classificação do lançamento:** obrigatório escolher um atalho OU escrever um detalhe (sem "(opcional)" nos rótulos). Bloco único com o título "Do que foi esse lançamento?" (EN "What was this for?"), a dica neutra "Escolha um atalho ou escreva um detalhe.", os rótulos "Atalho" e "Detalhe" separados por "ou", e o exemplo "Ex.: almoço com a turma" no detalhe. A dica só fica coral (com ícone) depois de tentar salvar sem nenhum dos dois, e volta a neutra assim que a pessoa escolhe um atalho ou digita algo. Sem atalhos na categoria, o "+ Novo" vira o botão em destaque "Crie seu primeiro atalho" (`.chip-primeiro`), sem obrigar. Valor inválido e falta de classificação aparecem juntos ao tentar salvar.
- **CSV:** `falc-lancamentos-AAAA-MM-DD.csv`, para Excel em PT: BOM UTF-8, `;`, textos entre aspas, CRLF; PT com dd/mm/aaaa e vírgula decimal; EN com AAAA-MM-DD e ponto. Coluna Subcategoria.
- **Relatório/PDF:** por período (atalhos "Dia N → N"), cabeçalho escuro com o falcão bege (24mm), coluna Subcategoria, imagem comprimida (`"FAST"`).
- **Exclusão de conta:** Perfil → Zona de perigo; digitar EXCLUIR/DELETE/ELIMINAR; exige login há menos de 5 minutos; apaga os dados e só então a conta; se apagar os dados falhar, a conta não é apagada; limpa `fp_*` do localStorage.
- **Idioma e tema:** salvos em `fp_lang` (padrão PT) e `fp_theme`.

---

## 5. Política de Privacidade (LGPD)

- Página pública `#/privacidade`, no idioma salvo, **sem seletor de idioma**, com "Voltar" grande no topo. Responsável (controlador): o próprio **FALC** — nenhum nome de pessoa. Contato: falc.empresa@gmail.com (`EMAIL_CONTATO`). Pedidos e dúvidas sempre "pelo e-mail de privacidade"; prazo de resposta de 15 dias. Última atualização registrada: 25/11/2026.
- Seções: 1 Quem é o responsável · 2 Quais dados coletamos · 3 Para que usamos · 4 Onde os dados ficam · 5 O que fica no seu navegador · 6 Não vendemos nem compartilhamos · 7 Seus direitos pela LGPD · 8 Como excluir sua conta · 9 Crianças e adolescentes · 10 Prazo para responder · 11 Mudanças nesta política.
- Menores de idade: o app pode ser usado por menores. Menores de 12: conta criada e acompanhada por um pai, mãe ou responsável legal, que consente (seção 3 cita o art. 14, §1º, da LGPD). De 12 a 17: recomendamos que um responsável saiba e acompanhe. Login com Google segue a idade mínima do Google.
- Aceite obrigatório no cadastro: "Li e concordo com a Política de Privacidade. Se tenho menos de 18 anos, meu responsável legal está ciente (menores de 12: a conta deve ser criada pelo responsável)." Vale para e-mail/senha e para o Google na aba "Criar conta".
- Textos da Landing sobre dados só repetem o que a Política afirma (por isso "só você lê seus dados" virou "seus dados não são vendidos nem compartilhados, e o FALC não tem anúncios").

---

## 6. Decisões do dono (o que ele pediu para fazer ou não fazer)

- Sem atalhos (subcategorias) prontos no código: só os criados pelo usuário.
- Sem o simulador de decisão (trabalhar × bolsa × crédito educativo) — removido de propósito no rebranding.
- Sem seletor de idioma na página da Política.
- Sem destaque de link no item "Legal" do menu da conta (fica igual aos outros itens).
- Sem "Aparência", "Cobrança" ou "Excluir" no menu da conta; sem "Mudar decoração de avatar".
- Sem nome pessoal na Política nem no código.
- Sem etiqueta "Grátis · sem cartão" no hero.
- Sem citar "SQL" na Landing (o banco é Firestore).
- CPF, telefone, data de nascimento e foto são opcionais.
- Nome sempre FALC em maiúsculas; não mudar cores, fontes ou logo sem pedido.
- Não trocar a fonte por conta própria.
- REGRA DE DADOS: nunca gravar no Firebase, nunca testar logado na conta real, nunca publicar regras.

---

## 7. Problemas já resolvidos (não repetir)

- PDF: html2canvas falha com cores `oklch` → jsPDF desenhando direto. O sinal "−" (U+2212) sai quebrado no PDF → usar "-". O falcão do PDF ficava escondido atrás do card "Saldo" e o PDF tinha ~1 MB → 24mm centralizado e compressão `"FAST"` (~49 KB).
- `CATS` vs `CATS_BASE`: usar `CATS_BASE`; não exportar nada de dentro de componente.
- Vercel "vite: Permission denied": `node_modules/` e `dist/` fora do git.
- Login Google com popup fechava sozinho → `signInWithRedirect`.
- OneDrive: commit falhava ("unable to append to .git/logs/HEAD") → `git config windows.appendAtomically false` no repo.
- Celular: tabelas e campos vazavam → `minmax(0, 1fr)` / `min-width: 0`, `.table-scroll`; Landing com cabeçalho que quebra linha.
- Fraunces "pesada/estranha" nos títulos grandes → eixos carregados e `opsz` fixo em 36, WONK 0.
- CSV abria numa coluna só e com acentos quebrados no Excel → BOM + `;`.
- "Mercado / Mercado" repetido no histórico → atalho não preenche descrição; etiqueta só quando difere.
- `.link-destaque` aplicado por engano no menu da conta → removido do item "Legal".
- Escrever caminhos Windows com `\` em scripts Python dentro do terminal gerou caractere invisível no CLAUDE.md → usar scripts em arquivo para textos com barras invertidas.
- Conferência de telas logadas sem gravar dados: config temporária do Vite trocando o Firebase por mocks em memória, apagada no fim (nunca commitada).
