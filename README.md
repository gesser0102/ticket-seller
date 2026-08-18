# Bilheteria

Plataforma de venda de ingressos de cinema. Qualquer pessoa navega o cartaz, abre um filme (elenco, gênero, duração e classificação vêm da TMDb ao vivo), escolhe sessão num calendário por sala e horário e seleciona assento num mapa em tempo real, tudo sem precisar de conta. O cadastro só é pedido no meio do checkout, depois de escolher o assento e o tipo de ingresso (inteira ou meia), antes de pagar. O pagamento é simulado (Pix ou cartão), o ingresso sai com QR code, e a portaria valida na entrada por QR ou digitando o código curto.

## Credenciais pré-definidas

O cliente não usa credencial nenhuma, a conta é criada por ele mesmo durante o checkout. As credenciais abaixo servem só para os dois papéis internos: organizador (painel em `/organizer`) e portaria (console em `/gate`).

Senha de todas: `senha123`.

| Papel | E-mail |
| --- | --- |
| Organizador | organizador@ticketseller.dev |
| Portaria | portaria@ticketseller.dev |

## Rodando localmente

Pré-requisitos: Node 22 ou superior, pnpm, Docker.

**1. Instalar as dependências do monorepo**

```bash
pnpm install
```

**2. Copiar o `.env` de exemplo e subir o Postgres**

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d postgres
```

**3. Copiar o `.env` também para dentro da API**

É de lá que o Prisma lê a `DATABASE_URL`.

```bash
cp .env apps/api/.env
```

**4. Rodar as migrations e semear o banco**

```bash
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
cd ../..
```

O seed busca ao vivo os 10 primeiros filmes "em cartaz" da TMDb e cria 12 sessões para cada um (3 dias, 2 salas, 2 horários), cadastra 2 salas para o organizador, 2 clientes de exemplo (`cliente1@ticketseller.dev` e `cliente2@ticketseller.dev`, mesma senha) e um ingresso já vendido, pra testar a validação de "já utilizado" na portaria sem precisar comprar nada. Sem a `TMDB_API_KEY` configurada, ou se a TMDb estiver fora do ar, ele cai num catálogo fixo de 2 filmes e não quebra. É idempotente: pode rodar de novo que não duplica nada, e se o "em cartaz" da TMDb mudar entre uma execução e outra, os filmes novos só se somam aos que já estavam no banco.

**5. Rodar API e frontend, cada um no seu terminal**

```bash
pnpm dev:api   # http://localhost:3000/api
pnpm dev:web   # http://localhost:5173
```

O Vite faz proxy de `/api` e `/socket.io` para a API, então em dev tudo funciona same-origin, sem CORS. Abrindo `http://localhost:5173` já cai direto no cartaz público, sem precisar logar.

## Rodando os testes

```bash
# backend, unitários (rápido, não precisa de banco)
cd apps/api
pnpm test

# backend, e2e (sobe um Postgres de teste isolado, na porta 5434)
docker compose -f docker-compose.dev.yml up -d postgres_test
pnpm test:e2e

# frontend
cd apps/web
pnpm test
```

O `pnpm test:e2e` já aplica as migrations no banco de teste sozinho antes de rodar, não precisa fazer nada manual antes. Esse banco (`postgres_test`, configurado em `DATABASE_URL_TEST`) é totalmente isolado do banco de dev; os testes fazem `TRUNCATE` entre um caso e outro sem nenhum risco de apagar dado de demonstração.

### Coverage

```bash
# backend, unit + e2e mesclados num relatório só
cd apps/api
pnpm test:cov:all
# abre apps/api/coverage/merged/index.html

# frontend
cd apps/web
pnpm test:cov
# abre apps/web/coverage/index.html
```

## Variáveis de ambiente

Ver `.env.example`. As que realmente importam:

- `DATABASE_URL`: string de conexão do Postgres.
- `SESSION_SECRET`: assina o cookie de sessão. Trocar em produção.
- `COOKIE_SECURE`: `true` em produção (exige HTTPS), `false` em dev local.
- `TMDB_API_KEY`: token de leitura v4 da TMDb. Sem ela o app funciona normal, só sem elenco, gênero e duração na página do filme, e o seed cai no catálogo fixo.

## Arquitetura, resumida

Monorepo pnpm: `apps/api` (NestJS), `apps/web` (React + Vite), `packages/shared` (tipos TypeScript compartilhados entre os dois, importados direto como fonte, sem build intermediário em dev).

Alguns pontos que valem explicar:

- Filme e sessão são coisas diferentes. Um `Movie` guarda o snapshot da TMDb (título, pôster, sinopse) e tem várias `Screening` (sala, data/hora, preço, mapa de assentos próprio).
- A identidade do visitante é criada de forma preguiçosa: só na primeira ação que realmente precisa de um dono (segurar assento, criar reserva), o backend cria um usuário anônimo e amarra ele à sessão via cookie. O cadastro no checkout só completa essa mesma conta, nunca cria uma segunda.
- Sessão de login é por cookie (`express-session` + `connect-pg-simple`, guardado no próprio Postgres), `HttpOnly`, `SameSite=Lax`.
- Operações concorrentes (segurar assento, validar ingresso na portaria) usam UPDATE condicional atômico direto em SQL, não um "verifica e depois grava".
- Mapa de assentos é realtime de verdade, via Socket.IO. A mutação sempre passa pela API REST; o socket só serve para replicar o estado para os outros visitantes olhando a mesma sessão.
- Todo endpoint responde no mesmo formato (`{ success, message, data }`), e erros nunca vazam stack trace nem SQL cru para o cliente.
