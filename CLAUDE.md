# Estúdio Vitá — Sistema de Gestão

App web fullstack para gerenciar um estúdio de pilates chamado **Estúdio Vitá**.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Backend/API | Express.js |
| Banco de dados | MongoDB Atlas |
| Autenticação | JWT próprio + NextAuth.js (Google OAuth) |
| Email transacional | Resend |
| Hospedagem frontend | Vercel |
| Hospedagem backend | Railway |

---

## URLs de Produção

- **Frontend (Vercel):** https://pilates-studio-three.vercel.app
- **Backend (Railway):** https://pilates-studio-production-355d.up.railway.app
- **Health check:** `GET https://pilates-studio-production-355d.up.railway.app/api/health` → `{"status":"ok"}`

Ao iniciar uma sessão, verifique a saúde do backend com uma requisição para a URL acima antes de diagnosticar qualquer problema.

---

## Estrutura de Pastas

```
pilates-studio/
├── backend/
│   ├── server.js                      # Entry point (conecta DB e sobe o servidor)
│   ├── scripts/seedAdmin.js           # Script pontual para criar admin inicial
│   └── src/
│       ├── app.js                     # Express app, CORS, rotas, middlewares
│       ├── config/db.js               # Conexão MongoDB Atlas
│       ├── models/
│       │   ├── User.js                # roles: admin | recepcionista; status: pending | active; provider: local | google
│       │   ├── Patient.js             # Pacientes (active/inactive)
│       │   ├── Appointment.js         # Agendamentos (equipment + manualEquipment flag)
│       │   ├── Equipment.js           # Equipamentos cadastrados
│       │   └── Payment.js             # Pagamentos
│       ├── controllers/
│       │   ├── authController.js      # login, register (admin), signup (self-service), googleAuth, forgotPassword, resetPassword
│       │   ├── userController.js      # CRUD de usuários (admin)
│       │   ├── patientController.js   # CRUD de pacientes + histórico de equipamentos
│       │   ├── appointmentController.js  # CRUD agendamentos (aceita campo equipment no PUT)
│       │   ├── scheduleController.js  # Rodízio automático de equipamentos por dia/semana
│       │   ├── equipmentController.js # CRUD de equipamentos
│       │   └── paymentController.js   # CRUD de pagamentos
│       ├── routes/
│       │   ├── authRoutes.js          # /api/auth/*
│       │   ├── userRoutes.js          # /api/users/* (admin only)
│       │   ├── patientRoutes.js       # /api/patients/*
│       │   ├── appointmentRoutes.js   # /api/appointments/*
│       │   ├── scheduleRoutes.js      # /api/schedule/today | /:date | /week
│       │   ├── equipmentRoutes.js     # /api/equipment/* (GET: admin+recepcionista; POST/DELETE: admin only)
│       │   └── paymentRoutes.js       # /api/payments/*
│       ├── middleware/
│       │   ├── authMiddleware.js      # protect (JWT), authorize (roles), internalOnly (INTERNAL_API_SECRET)
│       │   └── errorMiddleware.js     # notFound + errorHandler global
│       └── utils/
│           ├── generateToken.js       # Gera JWT
│           ├── equipmentRotation.js   # Algoritmo de rodízio (assignEquipmentsToSlot)
│           └── protectedAccounts.js   # PRIMARY_ADMIN_EMAIL = "priscillacwb@gmail.com"
│
└── frontend/
    ├── next.config.js
    ├── lib/
    │   ├── api.js                     # Cliente HTTP (fetch wrapper, lança "Não foi possível conectar ao servidor" em falha de rede)
    │   └── authOptions.js             # Configuração NextAuth (Google OAuth → chama /api/auth/google interno)
    └── app/
        ├── layout.js                  # Layout global + AuthContext provider
        ├── globals.css                # Design system (variáveis CSS, componentes base)
        ├── page.js                    # Redirect: / → /dashboard ou /login
        ├── login/page.js              # Login local + botão Google
        ├── signup/page.js             # Auto-cadastro (cria conta pending, aguarda aprovação admin)
        ├── forgot-password/page.js    # Solicita link de recuperação por email
        ├── reset-password/page.js     # Redefine senha via token do link
        ├── dashboard/page.js          # Resumo: pacientes, agendamentos, pagamentos do mês
        ├── patients/
        │   ├── page.js                # CRUD de pacientes
        │   └── [id]/history/page.js   # Histórico de equipamentos usados por paciente
        ├── appointments/page.js       # Agendamentos + rodízio (view dia/semana) + dropdown de equipamento manual
        ├── payments/page.js           # Histórico de pagamentos
        ├── equipment/page.js          # Gestão de equipamentos (admin only)
        ├── users/page.js              # Gestão de usuários e aprovações (admin only)
        └── api/auth/[...nextauth]/route.js  # Handler NextAuth (callback Google OAuth)
```

---

## Funcionalidades Implementadas

### Autenticação e Usuários
- Login local (email + senha) com JWT
- Login via Google OAuth (NextAuth → callback interno `/api/auth/google`)
- Auto-cadastro público (`/signup`) → conta criada com `status: "pending"`, aguarda aprovação de admin
- Admin pode criar contas diretamente (já ativas) e definir role
- Aprovação/rejeição de contas pendentes na página `/users`
- Recuperação de senha via email (Resend): link com token SHA-256, expira em 1h
- Dois roles: `admin` e `recepcionista`

### Proteção do Admin Principal
- Email `priscillacwb@gmail.com` está hardcoded em `utils/protectedAccounts.js`
- Nenhum usuário (nem outro admin) pode deletar ou alterar o role dessa conta
- No Google OAuth, se esse email fizer login pela primeira vez, a conta é criada automaticamente como `admin` e `active` (não fica pending)

### Pacientes
- CRUD completo com nome, email, telefone, data de nascimento, observações médicas
- Campo `active` (inativo não pode ser agendado)
- Histórico de equipamentos usados (consulta agendamentos concluídos)

### Agendamentos e Rodízio de Equipamentos
- CRUD de agendamentos (paciente, data/hora, duração em minutos, notas, status)
- Status: `scheduled` | `completed` | `cancelled` | `no-show`
- **Rodízio automático:** ao consultar `/schedule/:date`, o backend atribui equipamentos automaticamente por slot de horário usando o algoritmo em `utils/equipmentRotation.js`
  - Regra: cada paciente tenta não repetir o equipamento da sua última aula concluída
  - Algoritmo: até 50 shuffles aleatórios para satisfazer as restrições; fallback ignora a restrição de repetição mas evita conflito dentro do slot
  - Se não há equipamento disponível no slot (overflow), marca `noEquipmentAvailable: true`
- **5 equipamentos padrão** (auto-criados se o banco estiver vazio): `Cadillac`, `Reformer`, `Chair 1`, `Chair 2`, `Barrel`
- **Equipamento já atribuído não é sobrescrito** em recarregamentos seguintes (o schedule controller só atribui quando `equipment === null`)
- **Edição manual de equipamento:** na view de dia, cada agendamento tem um dropdown que mostra só equipamentos livres naquele horário + o atual. Ao salvar, grava `equipment` e `manualEquipment: true` no banco. A escolha é preservada em recarregamentos
- **View semana:** visualização de 7 dias a partir da segunda-feira da semana selecionada (sem dropdown de edição, só badges)

### Pagamentos
- Registro de pagamentos por paciente com valor, data, método e observações
- Listagem com filtros

### Equipamentos
- CRUD de equipamentos (admin only para criar/deletar; admin e recepcionista podem listar)
- Não permite deletar equipamento com agendamentos futuros associados

---

## Variáveis de Ambiente

### Backend (Railway)

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Porta do servidor (Railway define automaticamente) |
| `MONGO_URI` | Connection string do MongoDB Atlas |
| `JWT_SECRET` | Segredo para assinar os JWTs |
| `JWT_EXPIRES_IN` | Expiração do token (ex: `1d`) |
| `CORS_ORIGIN` | URL do frontend no Vercel (sem barra final) |
| `INTERNAL_API_SECRET` | Segredo compartilhado entre frontend e backend para a rota `/api/auth/google` |
| `RESEND_API_KEY` | Chave da API Resend para envio de emails |
| `RESEND_FROM_EMAIL` | Remetente dos emails transacionais |
| `FRONTEND_URL` | URL do frontend (usada no link de reset de senha no email) |

### Frontend (Vercel)

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API do Railway (ex: `https://…railway.app/api`) |
| `NEXTAUTH_URL` | URL pública do frontend no Vercel |
| `NEXTAUTH_SECRET` | Segredo do NextAuth |
| `GOOGLE_CLIENT_ID` | Client ID do Google OAuth (Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google OAuth |
| `INTERNAL_API_SECRET` | Mesmo valor configurado no backend |

---

## Aviso Crítico: Variáveis de Ambiente em Produção

**Os arquivos `.env` e `.env.local` estão no `.gitignore` e nunca vão para o GitHub.**

Isso significa que:
- O **Vercel** não tem acesso a `frontend/.env.local` — todas as variáveis de produção devem ser configuradas manualmente em **Vercel → Project Settings → Environment Variables**
- O **Railway** não tem acesso a `backend/.env` — todas as variáveis devem ser configuradas manualmente em **Railway → Serviço → Variables**

Se `NEXT_PUBLIC_API_URL` não estiver no Vercel, o frontend usa o fallback `http://localhost:5000/api` e todos os requests falham com **"Não foi possível conectar ao servidor"** — esse foi o diagnóstico confirmado da falha de produção.

Se `CORS_ORIGIN` não estiver no Railway, o backend usa o fallback `http://localhost:3000` e o browser bloqueia todos os requests com erro de CORS.

---

## Lógica CORS

`backend/src/app.js` lê `process.env.CORS_ORIGIN`, faz split por vírgula (permite múltiplas origens) e configura o middleware `cors`. Exemplo para múltiplas origens:
```
CORS_ORIGIN=https://pilates-studio-three.vercel.app,https://outro-dominio.vercel.app
```

---

## Próximos Passos / Pendências Conhecidas

- Configurar `NEXT_PUBLIC_API_URL` e demais variáveis no painel do Vercel para resolver o erro de produção
- Confirmar que `CORS_ORIGIN` está corretamente configurado no Railway
- O dropdown de edição manual de equipamento existe apenas na **view de dia** (não na view de semana)
- Equipamento manual (`manualEquipment: true`) é preservado entre recarregamentos, mas não há botão de "resetar para automático" — seria um próximo passo útil
