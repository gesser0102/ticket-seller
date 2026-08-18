# Bilheteria — Plataforma de Eventos e Ingressos

Qualquer pessoa navega o cartaz, abre um filme (elenco, gênero, duração e classificação vêm da TMDb ao vivo), escolhe data/sala/horário num calendário de sessões e escolhe assento num mapa **ao vivo** — tudo sem conta. No meio do checkout — depois do carrinho fechado, antes de pagar — escolhe o tipo de ingresso (Inteira/Meia) e só então se pede cadastro (nome, e-mail, senha, CPF, celular, nascimento). Paga por Pix ou Cartão de Crédito (simulado), recebe ingresso com QR, e a portaria valida na entrada.

Especificação original e decisões travadas: [`ESPECIFICACAO-Plataforma-Eventos.md`](./ESPECIFICACAO-Plataforma-Eventos.md). **Atenção:** o fluxo abaixo passou por duas revisões pedidas depois da spec original ser escrita — (1) navegação e mapa públicos, cadastro adiado pro meio do checkout, e (2) calendário de sessões por sala/horário, tipo de ingresso e método de pagamento, no estilo de uma bilheteria de cinema real. As razões e consequências técnicas de cada uma estão detalhadas em `DECISOES-IA.md`.

**Status atual:** esqueleto vivo completo, incluindo realtime (peça do Slice 2 puxada pra agora, por causa do fluxo público), um modelo de dados expandido (filme com várias sessões, não um evento = uma sessão) e painel do organizador (busca na TMDb, adiciona filme, publica sessão — item 15 do Slice 3). Ver "O que falta" abaixo pro que ainda não foi construído.

## URL pública

Ainda não publicado — os `Dockerfile`s e o passo a passo já estão prontos e testados localmente (ver [`DEPLOY.md`](./DEPLOY.md)), falta só a instância do Coolify de verdade. Rodando localmente por enquanto — ver "Rodar local" abaixo.

## Deploy

Guia completo em [`DEPLOY.md`](./DEPLOY.md): `apps/api/Dockerfile`, `apps/web/Dockerfile` e `docker-compose.prod.yml` (dois serviços — API e front estático — atrás do mesmo domínio via Traefik, same-origin conforme a seção 2 da spec). Os três já foram buildados e testados localmente (build + boot real contra Postgres + login funcionando) antes de qualquer coisa ser escrita no guia.

## Credenciais semeadas

Cliente **não usa credencial semeada** — a conta é criada por ele mesmo no checkout. As credenciais abaixo são só para os dois papéis internos (organizador tem painel próprio em `/organizer`; portaria tem console funcional em `/gate`).

Todas com senha `senha123`.

| Papel | E-mail |
| --- | --- |
| Organizador | `organizador@ticketseller.dev` |
| Portaria | `portaria@ticketseller.dev` |

O seed busca ao vivo os **10 primeiros filmes "em cartaz" da TMDb** (`GET /movie/now_playing`, região BR) na primeira vez que roda — cada um com **12 sessões** (3 dias × 2 salas × 2 horários, grade de assentos própria por sessão), **2 salas cadastradas** para o organizador ("Sala 1"/"Sala 2", R$ 45,00 — mesmo preço/nome usado nas sessões semeadas), 2 clientes de exemplo (`cliente1@ticketseller.dev` / `cliente2@ticketseller.dev`, mesma senha — úteis pra testar o login de retorno de um cliente já cadastrado) e um assento já vendido na primeira sessão do primeiro filme com ingresso pronto (token `seed-demo-ticket-token-0001`, código de portaria `DEM-234`) pra testar "já utilizado" na portaria sem precisar comprar nada. Sem `TMDB_API_KEY` configurada (ou se a TMDb estiver fora do ar), cai de volta num catálogo fixo de 2 filmes ("Clube da Luta" e "Batman: O Cavaleiro das Trevas") — o seed nunca falha duro por falta da chave. O seed é idempotente: rodar de novo não duplica nada que já existe (filmes são identificados pelo id da TMDb); como o "em cartaz" muda com o tempo, rodar dias depois pode trazer filmes novos, somados aos que já estavam lá.

## Rodar local

Pré-requisitos: Node 22+ (ver `DECISOES-IA.md` pro motivo de não ser mais 20 — achado real montando o deploy), pnpm, Docker.

```bash
# 1. instalar dependências do monorepo
pnpm install

# 2. subir o Postgres
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d postgres

# 3. copiar o .env para a API (Prisma lê de apps/api/.env)
cp .env apps/api/.env

# 4. migrar e semear o banco
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
cd ../..

# 5. rodar API e frontend (dois terminais)
pnpm dev:api   # http://localhost:3000/api
pnpm dev:web   # http://localhost:5173 (proxy /api e /socket.io pra API — same-origin, zero CORS)
```

Abra `http://localhost:5173` — cai direto no cartaz público, sem login.

## Rodar os testes

```bash
# Backend — unitários (rápidos, sem banco nenhum)
cd apps/api
pnpm test

# Backend — e2e (sobe um Postgres de teste isolado, porta 5434, tmpfs)
docker compose -f docker-compose.dev.yml up -d postgres_test
pnpm test:e2e   # aplica as migrations no banco de teste sozinho antes de rodar

# Frontend
cd apps/web
pnpm test
```

O banco de teste (`postgres_test`, `.env`/`.env.example` → `DATABASE_URL_TEST`) é **isolado do banco de dev** — os testes de e2e fazem `TRUNCATE` entre cada teste sem nenhum risco de apagar dado de demonstração. Detalhes da suíte (o quê, por quê, cobertura) em `DECISOES-IA.md`.

### Coverage

```bash
# Backend — unit + e2e mesclados num relatório único
cd apps/api
pnpm test:cov:all
# abre apps/api/coverage/merged/index.html

# Frontend
cd apps/web
pnpm test:cov
# abre apps/web/coverage/index.html
```

`apps/api/coverage/unit` e `coverage/e2e` medem coisas diferentes (unit cobre guards/services isolados com mocks; e2e cobre os controllers/fluxos completos) — `test:cov:all` roda os dois e mescla num relatório combinado, o único número que reflete o que está testado de verdade. No frontend, `coverage.all: true` no `vite.config.ts` garante que componentes sem nenhum teste apareçam como 0% em vez de simplesmente sumirem do relatório.

### Banco de dados

Postgres 16 via Docker Compose, na porta **5433** do host (não 5432 — evita conflito com um Postgres nativo que pode já estar rodando na máquina; dentro do container continua sendo 5432). `DATABASE_URL` já vem certa no `.env.example`.

### Variáveis de ambiente

Ver [`.env.example`](./.env.example). As que importam:

- `DATABASE_URL` — string de conexão do Postgres.
- `SESSION_SECRET` — assina o cookie de sessão. Trocar em produção.
- `COOKIE_SECURE` — `true` em produção (exige HTTPS); `false` em dev local (HTTP).
- `TMDB_API_KEY` — v4 Read Access Token (JWT) da TMDb, usado como `Authorization: Bearer`. Já configurada no `.env` deste ambiente (funcionando — testada contra a API real: elenco, gênero, duração e classificação etária vêm de lá). Opcional em geral: sem ela, a página de detalhe do filme funciona normalmente, só sem essas informações (degrada graciosamente, não quebra nada — ver `TmdbService`).

## Arquitetura em uma página

Stack e decisões travadas estão detalhadas na especificação original (seção 2 em diante); o fluxo abaixo é a revisão — ver `DECISOES-IA.md` pro porquê de cada peça.

- **Monorepo pnpm** — `apps/api` (NestJS), `apps/web` (React + Vite), `packages/shared` (tipos/contratos TypeScript compartilhados, importados diretamente como fonte — sem build intermediário em dev).
- **Filme ≠ sessão.** `Movie` (título/pôster/sinopse snapshot da TMDb) tem N `Screening` (sala, data/hora, preço, mapa de assentos próprio). O calendário de sessões na página do filme agrupa `Screening` por data e depois por sala. Extensão sobre a seção 4 original — ver `DECISOES-IA.md`.
- **Identidade anônima lazy.** Um visitante que nunca logou não é "ninguém" — na primeira ação que exige dono (segurar assento, criar reserva), o backend cria uma linha `User(role=client, email=null, passwordHash=null)` e amarra ela à sessão (cookie). O registro no checkout só **completa** essa mesma linha — nunca cria uma segunda conta. Ver `IdentityService`.
- **Dois guards fazem a fronteira:** `AnonymousIdentityGuard` (garante identidade, nunca bloqueia — usado em segurar/soltar assento e criar reserva) e `RegisteredGuard` (exige conta completa — usado em pagar e em "Meus ingressos"). `SessionAuthGuard` original continua valendo pra organizador/portaria, que sempre logam com conta pré-existente.
- **Sessão por cookie** (`express-session` + `connect-pg-simple`, guardada no próprio Postgres). `HttpOnly`, `SameSite=Lax`, `Secure` condicionado a `COOKIE_SECURE`.
- **O padrão central (seção 5 da spec): UPDATE condicional atômico.** Usado em quatro lugares agora: segurar assento, **soltar assento** (desmarcar — pedido explícito do usuário, ver abaixo), validar ingresso na portaria, e o sweeper de holds/reservas vencidas (`@nestjs/schedule`, a cada ~5s). SQL cru parametrizado via `Prisma.$queryRaw`/tagged template — nunca concatenado.
- **Desmarcar assento existe agora.** `DELETE /seats/:id/hold` — só quem segurou pode soltar, e só enquanto ainda está `held` (não vendido). Isso não estava na spec original (que só definia segurar/validar/varrer) nem no primeiro Slice — foi adicionado a pedido explícito depois de um teste real mostrar que faltava.
- **Tipo de ingresso, meia = 50% sempre.** Etapa nova entre escolher assento e pagar: `PATCH /orders/:id/ticket-types` marca cada assento reservado como `inteira` ou `meia` e recalcula `Order.totalCents` no servidor (nunca confia no total calculado no cliente).
- **Método de pagamento: Pix ou Cartão.** O simulador de recusa (número de cartão mágico) só existe no caminho de Cartão — Pix não tem um "número mágico" real equivalente, então na simulação Pix sempre aprova. Ver `DECISOES-IA.md`.
- **Realtime de verdade.** Gateway Socket.IO (`realtime/realtime.gateway.ts`) com sala `screening:{id}`; qualquer visitante (com ou sem conta) entra na sala só de abrir o mapa. Mutação sempre passa por REST — o socket só replica `seat.held`/`seat.released`/`seat.sold`. Quem clicou recebe a confirmação autoritativa pela resposta REST, não pelo broadcast. Reconexão sempre re-busca o mapa inteiro, nunca confia em delta acumulado.
- **Contrato de resposta único:** `{ success, message, data, redirectUrl? }` via `ResponseInterceptor` + `HttpExceptionFilter` globais. Erros nunca vazam stack/SQL pro cliente.
- **Frontend same-origin em dev:** o Vite faz proxy de `/api` e `/socket.io` (incluindo upgrade de WebSocket) pra API — zero CORS, cookie de sessão e socket funcionam igual em dev e produção.
- **Painel do organizador é um dashboard de verdade** (`/organizer`, sidebar com Visão geral / Filmes / Sessões via `<Outlet/>` do React Router — primeira vez que o app usa rotas aninhadas). `OrganizerModule` guardado por `SessionAuthGuard` + `@Roles('organizer')`. Busca "em cartaz" ou por texto na TMDb (`GET /organizer/tmdb/search`, paginado de verdade — "carregar mais" contra a paginação real da TMDb, não só os 20 primeiros resultados) num modal dedicado, adiciona o filme escolhido (`POST /organizer/movies` — busca um snapshot próprio título/pôster/sinopse, idempotente via `@@unique([organizerId, externalRef])` no schema).
- **Sessões nascem em lote, não uma de cada vez.** `POST /organizer/movies/:id/screenings` recebe sala + preço uma vez e uma lista explícita de sessões (`CreateScreeningsBatchRequest.slots`, `{date, time}[]`) — o organizador programa uma semana de sessões de uma sala numa ação só, como uma bilheteria real opera (spec seção 9: "escolhe um → define data/local/preço → publica"). Limite de bom senso de 60 sessões por lote contra clique errado. Cada sessão nasce com sua grade de 150 assentos, todas dentro da mesma transação — bug real encontrado testando a primeira versão (sessão por sessão): sem isso a sessão publicava mas o mapa ficava vazio. O front (`CreateSessionsModal.tsx`) é um wizard de 3 passos (Detalhes → Sessões → Resumo) — cada sessão é adicionada uma de cada vez à lista antes de publicar; a versão anterior cruzava datas × horários automaticamente (produto cartesiano), o que gerava sessões que o organizador não tinha pedido de verdade. Ver `DECISOES-IA.md`.
- **`Modal`** (`apps/web/src/ui/Modal.tsx`) — primeiro componente de modal do app (não existia até esta rodada); overlay + painel acessível (`role="dialog"`, fecha em Esc ou clique fora, trava scroll do body). Usado pela busca de filme e pela criação de sessões em lote.
- **Sala é uma entidade cadastrada, não texto digitado.** Painel > Salas (`GET`/`POST /organizer/rooms`, modelo `Room` novo — nome + preço padrão do ingresso, `@@unique([organizerId, name])`) — pedido explícito do usuário. O modal de sessões trocou o campo de texto livre "Sala" por um `<select>` das salas cadastradas; escolher uma preenche o preço sozinho (ainda editável, pra promoção pontual). Sem FK entre `Screening` e `Room` de propósito — mesmo padrão de snapshot do Movie/TMDb: o nome/preço são copiados no momento de publicar a sessão, editar a sala depois não altera sessões já publicadas.
- **Sessão dá pra editar e excluir** (`PATCH`/`DELETE /organizer/screenings/:id`) — pedido explícito do usuário. Editar (sala/data/hora/preço) sempre é permitido — não mexe em `Order.totalCents`/`Payment.amountCents` de reservas já feitas, que são valores históricos travados no momento da compra. **Excluir é bloqueado se a sessão já tem pedido ou ingresso** (`ConflictException` 409) — isso não é "cancelamento com devolução ao estoque" (item 16 da spec, uma feature maior, ainda fora de escopo), é só limpeza de um erro de cadastro numa sessão que ainda não vendeu nada.
- **Rate limiting** (`@nestjs/throttler`): teto padrão de 120 req/min por IP em toda a API + limite mais apertado nas rotas sensíveis da checklist original (seção 12) — login/registro, segurar assento, pagamento, validação de portaria. Mensagem de erro em PT-BR, dentro do mesmo contrato `{success,message,data}`.
- **Busca e filtro de filmes no cartaz público** (item 16 da spec) — busca por título e filtro por gênero (pills), tudo no cliente sobre a lista já carregada: o catálogo é de um cinema só, não justifica paginação/filtro no servidor.
- **Cancelamento com devolução ao estoque** (item 16 da spec, `POST /organizer/screenings/:id/cancel`) — diferente de excluir (que só funciona sem venda nenhuma), cancelar funciona com pedidos/ingressos já emitidos: `Screening.status` vira `cancelled` (some da grade pública — todo filtro já usa `status: 'published'`), `Order`/`Ticket` vinculados viram `cancelled`, assentos voltam a `available`. Pagamento não é estornado de verdade (seção 6: "sem transação financeira real", mesma simulação do resto do app) — `Payment.status` fica como estava, é um fato histórico. "Avisar o cliente" não manda e-mail (fora de escopo, seção 18): o aviso é o próprio ingresso aparecendo "Cancelado" em Meus Ingressos. Na portaria, apresentar um ingresso cancelado retorna um resultado próprio ("Sessão cancelada"), distinto de "já utilizado".
- **Dois identificadores por ingresso** — `Ticket.token` (~256 bits, `nanoid`) continua sendo o único usado pelo QR e pelo link público `/i/{token}` (sem sessão, sem rate limit — precisa da entropia alta). `Ticket.shortCode`, novo, formato `XXX-XXX` (alfabeto de 32 caracteres sem `I`/`L`/`O`/`0`/`1`), é o que o operador da portaria digita — só aceito atrás de login + rate limit, por isso pode ser mais curto. Pedido explícito do usuário pra simplificar a digitação manual; a separação em dois códigos (em vez de encurtar o único identificador em todo lugar) foi decisão tomada depois de apontar o risco de força bruta no link público — ver `DECISOES-IA.md`.
- **Validador de portaria global, com dados da reserva no resultado** (pedido explícito do usuário) — `POST /gate/validate` não recebe mais `screeningId`: aceita qualquer código válido de qualquer sessão/filme, sem exigir escolher um evento antes. Diferente da spec original (seção 8, "portaria escopada a evento"), decisão sinalizada ao usuário antes de implementar — a troca é o check automático de "sessão errada" virar responsabilidade do operador, que agora vê filme, sessão (data/hora), sala e **nome do comprador** no resultado da validação pra conferir com os próprios olhos. Nome do comprador só aparece nessa resposta (`GateTicketDto`, não o `TicketDto` usado em "Meus ingressos"/link público) — não é exposto em nenhum lugar acessível por quem não é da portaria. Ver `DECISOES-IA.md`.
- **Organizador e portaria não compram ingresso** — bug de RBAC real encontrado ao implementar esta regra (pedido explícito do usuário): `AnonymousIdentityGuard`/`RegisteredGuard` (segurar assento, criar reserva, tipo de ingresso, pagamento, "Meus ingressos", registro) só checavam se havia *alguma* sessão logada, não o papel — um organizador ou operador de portaria conseguia comprar ingresso de verdade com a própria conta de staff. Os dois guards agora barram com `403` quando o papel logado não é `client`. No frontend, `ClientOnlyRoute` (novo) redireciona quem já está logado como organizer/gate de volta pro próprio painel ao tentar abrir mapa de assentos/checkout — sem bloquear visitante anônimo, que continua podendo comprar sem conta (`RequireRole` normal quebraria esse fluxo).
- **Navbar modernizada** (pedido explícito do usuário) — trocado o e-mail cru + links soltos por um avatar (iniciais do nome, ícone genérico como fallback) que abre um dropdown com as opções por papel (Meus ingressos / Portaria / Painel do organizador) e "Sair". `SessionUserDto` ganhou `name`.
- **Redesign do cartaz e detalhe do filme** (feedback do usuário: "layout ainda está muito genérico de IA") — hero em destaque no topo do cartaz usando o próprio pôster do filme como fundo ambiente borrado, cards da grade viraram pôster-forward (texto sobre a imagem, não num bloco separado), mesmo tratamento de fundo na página de detalhe, e os tokens de brilho dourado (`--shadow-glow-accent`) — definidos desde o início mas nunca usados em componente nenhum — agora aparecem nos estados ativos/CTA. Ver `DECISOES-IA.md`.
- **Hero rotativo com backdrop real da TMDb** (pedido de seguimento do usuário) — `Movie` ganhou `backdropUrl` (snapshot 16:9 da TMDb, mesmo princípio do `posterUrl`, `backdrop_path` nunca buscado antes). `HeroCarousel.tsx` roda até 6 filmes em destaque com crossfade automático (7s), pausa em hover/foco, desliga o autoplay com `prefers-reduced-motion`, setas + bolinhas com área de toque de 44px. Sem backdrop cadastrado, cai de volta no tratamento de pôster borrado da rodada anterior.
- **Cadastro do checkout revisado** (pedidos do usuário, em duas rodadas) — confirmar senha (com toggle de mostrar/ocultar, `IconEye`/`IconEyeOff`) e validador de força de senha (barra + rótulo, só feedback visual — não bloqueia envio, o mínimo de 6 caracteres continua sendo a única regra de verdade); máscaras de CPF (`xxx.xxx.xxx-xx`) e celular (`(xx) x xxxx-xxxx`) formatadas em tempo real (`lib/masks.ts`); `DateField.tsx` (novo) substitui o `<input type="date">` nativo — calendário em dropdown no tema escuro que abre pra cima (é o último campo do formulário), formato `dd/mm/aaaa`, mês/ano por `<select>` pra não exigir clicar seta-a-seta décadas pra trás, guarda ISO por baixo. Resolve de quebra o ícone do calendário nativo (escuro sobre escuro, quase invisível) por um ícone próprio com contraste real.
- **`helmet` + correção de vulnerabilidade de dependência** (pedido do usuário, depois de uma revisão de segurança) — `app.use(helmet({ contentSecurityPolicy: false }))`: CSP desligado de propósito, porque esta API nunca serve HTML (Traefik serve o build do Vite direto em produção, sem `ServeStaticModule`), então CSP aqui não protegeria nada e só arriscaria bloquear o `img-src` das capas da TMDb; os outros headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`) continuam ativos e têm valor real, inclusive pra origem inteira (API e frontend são same-origin em produção). Também corrigida a única vulnerabilidade que `pnpm audit` apontava (`deepmerge-ts`, transitiva do `@prisma/config`, só usada pelo CLI do Prisma — não alcançável por requisição de usuário) via `pnpm.overrides` no `package.json` raiz, sem precisar subir a major do Prisma (que nem resolveria: até a versão `latest` publicada ainda usa a versão vulnerável).
- **"Meus ingressos" em grade de cards** (pedido do usuário) — pôster do filme no topo do card (`TicketDto.screening` ganhou `moviePosterUrl`), clicar abre um modal com o QR/código curto/compartilhar (reaproveita o `TicketCard` original, que continua servindo a página de link público `/i/{token}` sem mudança). Botão de compartilhar dispara um toast confirmando a cópia do link (`ui/toast.ts` + `ui/ToastHost.tsx`, sistema simples via `CustomEvent`, sem lib nova) além do feedback local que já existia.
- **Identidade visual clara/azul, no lugar do tema escuro original** (pedido explícito do usuário, inspirado num print de referência da Blueticket) — `styles/tokens.css` reescrito (fundo `#f4f6fb`, azul `#2563eb` como cor de destaque), busca removida do cartaz público (badges de gênero mantidas), grade de filmes virou fileira horizontal com setas (cards em formato paisagem, `backdropUrl` no lugar do pôster em retrato). Hero em destaque reconstruído em rodadas de seguimento (feedback visual direto do usuário) pra bater com a referência de verdade: cartão de imagem emoldurado + fundo azul sólido em gradiente (`hero-banner-*`, não mais foto de fundo full-bleed), sem pontos de navegação. Navbar em `var(--color-primary-strong)` (mesmo tom do início do gradiente do hero, evita a costura de cor entre os dois). Ver `DECISOES-IA.md`.
- **Página "Minha conta"** (`/conta`, pedido do usuário) — dois formulários: dados pessoais (nome/e-mail/CPF/celular/nascimento, reaproveitando os mesmos componentes/máscaras do cadastro do checkout) e trocar senha (senha atual + nova, com barra de força). Backend novo: `UsersModule` (`GET`/`PATCH /users/me`, `PATCH /users/me/password`), guardado por `RegisteredGuard`; nenhuma migration nova, os campos já existiam no `User` desde o cadastro do checkout. Editar nome/e-mail atualiza a sessão na hora (cabeçalho/dropdown refletem sem reload). Ver `DECISOES-IA.md`.
- **Suíte de testes automatizados** (pedido explícito do usuário: "testes completos... no back e no front") — 95 testes no backend (35 unitários com Prisma mockado + 60 e2e contra um Postgres de teste isolado, via Jest/Supertest, já configurado desde o `nest new` mas nunca usado) e 58 no frontend (Vitest + Testing Library, infra nova). Fundo nos fluxos de maior risco primeiro: concorrência real de hold de assento, RBAC entre os três papéis, pagamento (Pix/Cartão/recusa), validação de portaria, cancelamento de sessão com devolução ao estoque — não é cobertura de 100% da superfície, é profundidade onde bug custa caro. Ver `DECISOES-IA.md` pro raciocínio completo e "Rodar os testes" abaixo pro comando.

## O que falta

**Leitura de QR por câmera na portaria:** só digitação manual por enquanto (é o que a spec original pede pra começar).

**Painel do organizador sem despublicação nem edição de filme.** Dá pra editar/excluir/cancelar sessão (ver acima) e cadastrar sala, mas não pra editar/remover um filme já adicionado.

## O que não está funcionando como esperado

Nada identificado no que foi construído — ver "Testes manuais rodados" abaixo. Ao todo, **11 bugs reais** foram encontrados e corrigidos ao longo do desenvolvimento (não só no que foi entregue por último) — todos documentados em detalhe no `DECISOES-IA.md`, incluindo uma condição de corrida real no login, uma sessão publicada pelo painel do organizador sem grade de assentos, uma condição de corrida na busca do modal de filme (resultados de duas buscas concorrentes podiam se sobrepor), um chip de data/horário que nascia visualmente invisível no modal de sessões em lote, um valor de backfill do código curto de portaria que nunca batia com o próprio formato que ele define, nomes de comprador vazios nos clientes semeados, e um buraco de RBAC real onde organizador/portaria conseguiam comprar ingresso com a própria conta de staff — todos pegos em rodadas de teste do próprio recurso (ou, no caso do RBAC, ao implementar a regra pedida pelo usuário), corrigidos antes de reportar como pronto.

## Limitações conhecidas

- **WebSocket assume uma instância** da API (sala em memória por processo). No Coolify (um container) isso é perfeito; escalar réplicas exigiria o adapter Redis do Socket.IO. Limitação conhecida e assumida, não bug — documentada na spec original (seção 7).
- **Extensões de schema sobre a seção 4 original:** `Movie`/`Screening` no lugar de um único `Event`; `Seat.orderId` e `Seat.ticketType`; `User.email`/`passwordHash` nullable com `name`/`cpf`/`phone`/`birthDate`; `Room` (sala cadastrada pelo organizador); `ScreeningStatus.cancelled` e `GateCheckResult.cancelled` (cancelamento de sessão); `Ticket.shortCode` (código curto de portaria); `Movie.backdropUrl` (imagem 16:9 do hero rotativo). Todas descritas e justificadas em `DECISOES-IA.md`.
- **Pagamento não é estornado de verdade no cancelamento de sessão** — `Payment.status` continua `approved` mesmo depois do `Order`/`Ticket` virarem `cancelled`. Coerente com a seção 6 original ("sem transação financeira real"): o pagamento simulado realmente foi aprovado, isso é fato histórico; quem sinaliza que a compra não vale mais é `Order.status`/`Ticket.status`, não um estorno financeiro que não existiria de verdade em produção real.
- ~~Rate limiting não implementado~~ **Implementado.** `@nestjs/throttler`, guard global (`AppThrottlerGuard`, 120 req/min por IP como teto padrão) + limite mais apertado nas rotas sensíveis da checklist original (seção 12): login/registro (5/min), segurar assento (20/10s), pagamento (10/min), validação de portaria (30/min). Estouro responde `429` com mensagem em PT-BR, dentro do mesmo contrato `{success,message,data}`. Armazenamento em memória por processo — mesma limitação de instância única já documentada pro WebSocket (item acima), não é um problema novo.
- **CPF/celular validados só por formato** (11 dígitos), sem checksum de CPF nem verificação de posse do celular — suficiente pro escopo de avaliação, não pra produção real.
- **Handshake do WebSocket valida origem, não sessão** — coerente com o mapa ser público, mas é uma leitura mais fraca do "handshake valida sessão" da seção 12 original, que previa tudo autenticado.
- **Meia-entrada não pede comprovante.** Qualquer assento pode virar "Meia" sem verificação de elegibilidade (estudante, idoso etc.) — fora de escopo pra esta avaliação, mas seria óbvio de mais numa versão real.

## Testes manuais rodados

**Backend (curl/script):** login/RBAC nos papéis internos, fluxo anônimo completo (hold → desmarcar → segurar de novo → reserva → tipo de ingresso com recálculo → **bloqueio de pagamento até registrar**, confirmado com 403 → registro → pagamento liberado), corrida de hold com dois clientes simultâneos, os dois caminhos de pagamento (Pix sempre aprova; Cartão com número mágico recusa), os 4 resultados da portaria, rate limit do login (6 tentativas seguidas com senha errada: as 5 primeiras respondem 401 normal, a 6ª responde 429 com `Retry-After` e mensagem em PT-BR; endpoints não relacionados continuam respondendo 200 no mesmo intervalo, confirmando que o limite é por rota, não global), cancelamento de sessão ponta a ponta (organizador publica sessão → cliente compra e paga de verdade → organizador cancela → confirmado via `psql` que `Screening`/`Order`/`Ticket` viram `cancelled` e o `Seat` volta a `available` na mesma chamada → cliente vê "Cancelado" em `GET /tickets/mine` → portaria recebe resultado "Sessão cancelada" ao tentar validar → segunda tentativa de cancelar responde 409 → sessão some de `GET /movies/:id`).

**Frontend (Playwright headless):**
- Duas sessões de navegador em paralelo: visitante A seleciona assento sem login; visitante B (sessão separada, mesma sessão de cinema) vê "reservado por outra pessoa" **em tempo real, sem reload**; A paga; B vê "vendido" em tempo real.
- Fluxo completo ponta a ponta: cartaz → filme (elenco/gênero/duração real da TMDb) → calendário (troca de data) → mapa (seleciona 2, desmarca 1, reseleciona, testa hover) → tipo de ingresso (mistura Meia/Inteira, total dinâmico confere) → registro → pagamento por Cartão (aprovado) e por Pix (aprovado) → "Meus ingressos" mostra o tipo correto por assento.
- Login da portaria e de cliente de retorno, isolado, pra pegar a condição de corrida descrita abaixo.
- Painel do organizador (primeira versão, página única): login → busca "Matrix" na TMDb → adiciona filme → publica sessão → aparece no cartaz público e no calendário do filme → mapa renderiza os 150 assentos. Pegou o bug da sessão sem assento (ver `DECISOES-IA.md`).
- Painel do organizador (dashboard reconstruído): visão geral (contadores + próximas sessões) → Filmes (modal de busca, adiciona 1 filme, sem duplicar) → Sessões em lote a partir da linha do filme (2 datas × 2 horários = 4 sessões, confirmado o preview antes de publicar) → tela Sessões filtrada mostra as 4 sessões com data/hora/preço corretos. Pegou uma condição de corrida real no modal de busca (ver `DECISOES-IA.md`), corrigida e reverificada.
- Modal "Publicar sessões", viewport menor (1280×780, mais perto de um laptop real): adicionou 3 datas e 3 horários em sequência, confirmou os 6 chips visíveis por screenshot (não só presentes no DOM). Pegou o bug do chip que nascia abaixo da área visível do modal sem rolar (ver `DECISOES-IA.md`), corrigido e reverificado no mesmo viewport pequeno onde o problema aparecia.
- Painel > Salas: cadastra sala nova ("Sala VIP", R$ 60,00) → aparece na lista → no modal de sessões, selecionar "Sala VIP" preenche o preço sozinho (confirmado no input, ainda editável) → publica 2 datas × 2 horários → tela Sessões confirma as 4 sessões com sala/preço corretos.
- Editar/excluir sessão: edita sala/preço de uma sessão semeada real, confere a mudança na tabela, edita de volta pros valores originais (round-trip sem perda). Exclusão testada em dois casos — direto contra a API (`curl` autenticado): sessão com ingresso emitido responde 409 e continua intacta no banco (confirmado via `psql`, o bloqueio funciona de verdade, não só na UI); sessão descartável criada só pro teste é excluída via UI com o diálogo de confirmação nativo, some da tabela.
- Modal de edição de sessão, select de sala: abre "Editar sessão" numa sessão de "Sala 2", confirma que o select já vem pré-selecionado (não a primeira sala da lista); cadastra sala temporária com preço bem diferente, troca a seleção → preço muda sozinho no campo.
- Busca/filtro de filmes no cartaz: busca por "batman" mostra só o filme certo; filtro por gênero mostra só filmes daquele gênero; busca sem resultado mostra estado vazio (não a lista inteira nem tela em branco); pills de gênero continuam visíveis durante a busca.
- Cancelar sessão (UI): depois do cancelamento via API (ver acima), a linha na tela Sessões mostra badge "cancelada" e some o botão de cancelar (só ficam editar/excluir) — confirmado por screenshot, não só pela resposta da API.
- Código curto de portaria: fluxo completo via `curl` (organizador publica → cliente compra e paga → resposta traz `token` inalterado e `shortCode` no formato `XXX-XXX`) → portaria rejeita o token antigo por formato (400) → aceita o `shortCode` (`valid`, marca `used`) → repetir o mesmo código responde `already_used` → link público `/i/{token}` confirmado que continua funcionando sem mudança nenhuma.
- Validador global: `POST /gate/validate` com `screeningId` no corpo responde `400` (campo não existe mais no DTO) → validação só com `{"code": "..."}` funciona pra qualquer sessão, sem seletor de evento → resposta traz filme/sessão/sala/nome do comprador corretos → segunda validação do mesmo código responde `already_used`. Sem verificação visual via Playwright nesta rodada (sem navegador disponível no ambiente) — conferido por leitura de código; recomendado um teste manual no navegador na próxima sessão.
- Organizador/portaria não compram ingresso: os dois, logados com a própria conta, tentam `POST /seats/:id/hold` → `403 "Esta ação é exclusiva de clientes."` nos dois; portaria tenta `GET /tickets/mine` → mesmo `403`. Fluxo normal de cliente repetido ponta a ponta (segurar → reservar → pagar) confirma que a regra nova não quebrou a compra legítima. Sem verificação visual do redirecionamento do frontend (`ClientOnlyRoute`) nem do dropdown do avatar via Playwright nesta rodada (sem navegador disponível) — conferidos por leitura de código.
- "Minha conta": fluxo completo via `curl` com uma conta de teste descartável — registro → `GET /users/me` traz CPF/celular/nascimento salvos → `PATCH /users/me` (nome/celular) → `GET /auth/me` confirma que a sessão já reflete o nome novo → tentar usar o e-mail da `cliente1` responde `409` → `PATCH /users/me/password` com senha atual errada responde `401`, com a certa troca de verdade (confirmado logando com a senha nova). Conta de teste removida do banco depois; login da `cliente1` repetido no final, sem alteração. Sem verificação visual das duas telas via Playwright nesta rodada (sem navegador disponível) — conferido por leitura de código.

Sem erros novos no console em nenhum dos casos (só o 401 esperado da checagem de sessão anônima).

## Estrutura de pastas

Ver seção 13 da especificação original como ponto de partida. Diferenças da implementação atual:
- `apps/api/src/movies/` + `apps/api/src/screenings/` — no lugar de um único módulo `events/`.
- `apps/api/src/common/identity/` + `common/guards/{anonymous-identity,registered}.guard.ts` — identidade anônima, fluxo revisado.
- `apps/api/src/tmdb/` — busca elenco/gênero/duração/classificação com cache (não estava no Slice 1 original).
- `apps/api/src/realtime/` — gateway Socket.IO + sweeper (puxado do Slice 2).
- `apps/web/src/features/movies/` (cartaz + detalhe com calendário) + `features/seatmap/` (mapa + painel de resumo) + `features/checkout/TicketTypePage.tsx` (tipo de ingresso, novo) + `CheckoutPage.tsx` (registro + pagamento Pix/Cartão).
- `apps/api/src/organizer/` — painel do organizador (item 15 do Slice 3): busca TMDb paginada, cria filme, cadastra sala, publica/edita/exclui/cancela sessões.
- `apps/web/src/features/organizer/` — dashboard do organizador: `OrganizerLayout.tsx` (sidebar + `<Outlet/>`), `OrganizerOverviewPage.tsx`, `OrganizerMoviesPage.tsx`, `OrganizerRoomsPage.tsx`, `OrganizerSessionsPage.tsx`, `AddMovieModal.tsx`, `CreateRoomModal.tsx`, `CreateSessionsModal.tsx`, `EditScreeningModal.tsx`.
- `apps/web/src/ui/Modal.tsx` — componente de modal reusável, novo nesta rodada.
- `apps/api/src/common/guards/app-throttler.guard.ts` — rate limit global + mensagem em PT-BR, registrado como `APP_GUARD` em `app.module.ts`.
- `apps/web/src/ui/UserMenu.tsx` — avatar com dropdown da conta, novo nesta rodada, substitui o e-mail cru + links soltos da navbar.
- `apps/web/src/features/auth/ClientOnlyRoute.tsx` — guarda de rota que barra organizer/gate (mas não anônimo) do mapa de assentos e checkout.
- `apps/web/src/features/movies/HeroCarousel.tsx` — hero rotativo do cartaz com backdrop da TMDb, novo nesta rodada.
- `apps/web/src/ui/DateField.tsx` — seletor de data em pt-BR, novo nesta rodada, substitui o `<input type="date">` nativo no cadastro do checkout.
- `apps/web/src/lib/masks.ts` — máscaras de CPF/celular, novo nesta rodada.
- `apps/web/src/lib/passwordStrength.ts` — validador de força de senha (feedback visual), novo nesta rodada.
- `apps/web/src/features/tickets/TicketPreviewCard.tsx` — card compacto da grade de "Meus ingressos", novo nesta rodada.
- `apps/web/src/ui/toast.ts` + `ToastHost.tsx` — notificação flutuante global via `CustomEvent`, novo nesta rodada.
- `apps/api/src/users/` — `UsersModule` novo: `GET`/`PATCH /users/me` (perfil) e `PATCH /users/me/password` (troca de senha), separado do `AuthModule` (que só cobre login/registro/logout/`me` de sessão).
- `apps/web/src/features/account/AccountPage.tsx` — tela "Minha conta" (`/conta`), novo nesta rodada.
- `apps/api/src/**/*.spec.ts` — testes unitários colocados junto do código que testam (guards, `IdentityService`, `AuthService`, utils), novo nesta rodada.
- `apps/api/test/` — testes e2e (`*.e2e-spec.ts`) + infra de teste nova: `global-setup.ts`/`env-setup.ts` (banco de teste isolado), `utils/create-test-app.ts` (bootstrap da app espelhando o `main.ts`), `utils/db.ts` (reset entre testes), `utils/fixtures.ts` (helpers pra criar organizador/filme/sessão/cliente registrado).
- `apps/web/src/**/*.test.ts(x)` — testes de Vitest colocados junto do código (lib puro, `seatLayout`, guards de rota, `AuthContext`, `LoginPage`), novo nesta rodada. `apps/web/src/test/setup.ts` registra os matchers do `jest-dom` e o auto-cleanup do Testing Library entre testes.
- `apps/api/Dockerfile` + `apps/web/Dockerfile` + `docker-compose.prod.yml` + `DEPLOY.md` — deploy de produção pro Coolify, novo nesta rodada. Ver `DEPLOY.md` pro passo a passo e `DECISOES-IA.md` pro raciocínio (por que Node 22 e não 20, por que dois serviços em vez de um).
