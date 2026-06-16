# Pilates Studio Management System

App web fullstack para gerenciar um estúdio de pilates: cadastro de pacientes, agendamento de aulas e controle de pagamentos, com autenticação segura e dois níveis de acesso.

## Stack

- **Frontend:** Next.js (App Router)
- **Backend:** Express.js
- **Banco de dados:** MongoDB (Mongoose)
- **Autenticação:** JWT + bcrypt

## Estrutura do projeto

```
pilates-studio/
├── backend/     # API REST (Express + MongoDB)
└── frontend/    # Aplicação Next.js
```

## Funcionalidades

- Login seguro com JWT (senhas com hash via bcrypt) ou com Google (NextAuth)
- Cadastro público de novos usuários, que ficam **pendentes** até um admin aprovar e definir o role
- Página `/users` (admin-only) para aprovar/recusar cadastros, definir role e remover usuários
- Dois roles: **admin** e **recepcionista**
  - Admin: acesso total, incluindo edição/remoção de pagamentos, aprovação de usuários e criação direta de contas
  - Recepcionista: cadastro de pacientes, agendamentos e lançamento de pagamentos
- Cadastro e listagem de pacientes
- Agendamento de aulas com controle de status (agendado, concluído, cancelado, não compareceu)
- Histórico de pagamentos
- Rodízio automático de equipamentos (Cadillac, Reformer, Chair, Barrel) por paciente

## Como rodar localmente

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # edite com sua MONGO_URI e JWT_SECRET
npm run dev
```

Crie o primeiro usuário administrador:

```bash
npm run seed:admin -- "Admin" admin@example.com "SenhaForte123"
```

Para atualizar email/senha de um usuário existente (ex.: o admin):

```bash
npm run set:admin-credentials -- "email-atual@example.com" "novo-email@example.com" "NovaSenha123"
```

A API ficará disponível em `http://localhost:5000/api`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # ajuste NEXT_PUBLIC_API_URL se necessário
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## Variáveis de ambiente

**backend/.env**

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta do servidor Express |
| `MONGO_URI` | String de conexão do MongoDB |
| `JWT_SECRET` | Segredo usado para assinar os tokens JWT |
| `JWT_EXPIRES_IN` | Tempo de expiração do token (ex: `1d`) |
| `CORS_ORIGIN` | Origem(ns) permitida(s) para requisições do frontend |
| `INTERNAL_API_SECRET` | Segredo compartilhado com o frontend para a rota interna `POST /api/auth/google` |

**frontend/.env.local**

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL base da API do backend |
| `NEXTAUTH_URL` | URL pública do frontend (ex.: `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Segredo usado pelo NextAuth para assinar sessões |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciais OAuth do Google Cloud Console (necessárias para o botão "Entrar com Google") |
| `INTERNAL_API_SECRET` | Mesmo valor configurado no backend |

## Segurança

- Senhas armazenadas com hash (bcrypt), nunca em texto puro
- Autenticação via JWT com expiração configurável
- Autorização por role em cada rota sensível da API
- Rate limiting no endpoint de login
- Cabeçalhos de segurança via Helmet e CORS restrito a origens configuradas
