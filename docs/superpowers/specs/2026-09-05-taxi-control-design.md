# Taxi Control — Design Spec

> App mobile-first para motoristas de táxi registrarem corridas, investimentos e acompanharem metas.

## Overview

**Purpose:** Ferramenta para motoristas de táxi registrarem corridas (próprias e passadas), controlarem investimento (combustível, km) e acompanharem metas de ganho.

**Users:**
- **Admin:** Pode ver tudo, definir metas, gerenciar motoristas
- **Motorista:** Pode registrar corridas, investimentos e ver seu próprio progresso

**Tech Stack:** Next.js 16 (static export), Tailwind CSS v4, React 19, Supabase (auth + DB)

**Platform:** Mobile-only (responsivo para telas de celular)

---

## Architecture

**Route:** `/taxi/*`

**Structure:**
```
src/app/taxi/
├── layout.tsx          # Layout principal com abas
├── page.tsx            # Redirect para /taxi/corridas
├── globals.css         # Tokens visuais do app
├── lib/
│   ├── supabase.ts     # Cliente Supabase
│   ├── auth-context.tsx # Context de autenticação
│   └── types.ts        # Tipos TypeScript
├── corridas/
│   └── page.tsx        # Aba de corridas
├── investimento/
│   └── page.tsx        # Aba de investimento
├── metas/
│   └── page.tsx        # Aba de metas
├── config/
│   └── page.tsx        # Aba de configurações
└── auth/
    └── page.tsx        # Tela de login
```

---

## Design System

**Style:** Moderno/minimalista, mobile-first

**Colors:**
- Background: `#FFFFFF` (white)
- Text: `#111827` (gray-900)
- Primary: `#2563EB` (blue-600) — CTAs, ações
- Secondary: `#6B7280` (gray-500) — textos secundários
- Success: `#10B981` (emerald-500) — progresso, positivo
- Warning: `#F59E0B` (amber-500) — alertas
- Border: `#E5E7EB` (gray-200)
- Card: `#F9FAFB` (gray-50)

**Typography:** Inter (font-family)

**Components:**
- Cards com bordas arredondadas (`rounded-xl`)
- Botões com padding generoso (`py-3 px-6`)
- Barras de progresso com animação
- Input fields com bordas claras

---

## Features

### 1. Auth (Login)

**Tela de login:**
- Email + senha
- Botão "Entrar"
- Link "Esqueci a senha"

**Fluxo:**
- Supabase Auth com email/senha
- Redireciona para `/taxi/corridas` após login
- Admin vê tudo, motorista vê só seus dados

---

### 2. Aba Corridas

**Tela principal:**
- Resumo do dia: Total ganho / Meta diária (barra de progresso)
- Botão "+ Nova Corrida"
- Lista de corridas do dia

**Registrar Corrida:**
- **Tipo:** Própria ou Passada
- **Valor total** (R$)
- **Data e hora** (preenchimento automático, editável)
- **Nome do passageiro** (opcional)
- **Início e Destino** (para Cooperativa, Particular, Faturado, Passada)

**Corrida Passada (adicional):**
- **Valor que o motorista recebe** (R$)
- **Comissão** = Total - Motorista (calculado automático)
- **Nome do motorista** que fez a corrida

**Corrida Cooperativa (adicional):**
- **Nome de quem mandou a corrida**

**Lista de corridas:**
- Cards com: tipo, valor, hora
- Pode editar/excluir

---

### 3. Aba Investimento

**Resumo:**
- Total guardado (10% de cada corrida própria)
- Meta de economia (admin define)

**Registrar Combustível:**
- Data
- Litros (opcional)
- Valor total (R$)
- KM do carro

**Preço do Combustível (opcional):**
- Registrar preço por litro (ex: R$ 6,50)
- Histórico de preços

**KM do Dia:**
- KM início (ao iniciar o dia)
- KM fim (ao finalizar)
- KM rodados = Fim - Início
- Consumo = Litros / KM rodados (se litros informado)

---

### 4. Aba Metas

**Para Admin:**
- Definir meta diária (R$)
- Definir meta semanal (R$)
- Editar metas a qualquer momento

**Para Motorista:**
- Barra de progresso diário (ganho atual / meta)
- Barra de progresso semanal (ganho atual / meta)
- Percentual atingido

---

### 5. Aba Configurações

**Perfil:**
- Nome
- Email
- Foto (opcional)

**Segurança:**
- Alterar senha

**Sair:**
- Botão de logout

---

## Database (Supabase)

### Tables

**users**
```sql
id: uuid (primary key)
email: text (unique)
nome: text
role: text (admin/driver)
created_at: timestamp
```

**rides**
```sql
id: uuid (primary key)
user_id: uuid (foreign key → users)
type: text (own/passed)
category: text (app/taximeter/cooperative/private/invoiced)
value: decimal
commission: decimal (for passed rides)
driver_name: text (for passed rides)
passenger_name: text (optional)
dispatcher_name: text (optional, for cooperative)
start_location: text
end_location: text
ride_date: timestamp
created_at: timestamp
```

**fuel**
```sql
id: uuid (primary key)
user_id: uuid (foreign key → users)
fuel_date: timestamp
liters: decimal (optional)
total_value: decimal
km_start: decimal
km_end: decimal
created_at: timestamp
```

**fuel_price**
```sql
id: uuid (primary key)
price_per_liter: decimal
recorded_date: timestamp
created_at: timestamp
```

**goals**
```sql
id: uuid (primary key)
daily_goal: decimal
weekly_goal: decimal
updated_at: timestamp
```

### Row Level Security (RLS)

- Motoristas só veem seus próprios dados
- Admin vê todos os dados
- Metas são visíveis para todos, editáveis só por admin

---

## Implementation Order

1. **Task 1:** Project structure + Supabase client + auth context
2. **Task 2:** Auth page (login)
3. **Task 3:** Layout with tabs + navigation
4. **Task 4:** Rides page (register + list)
5. **Task 5:** Investment page (fuel + km)
6. **Task 6:** Goals page (admin + driver view)
7. **Task 7:** Settings page (profile + logout)

---

## Future Enhancements

- **PWA:** Transformar em app instalável
- **Offline:** Cache de dados para uso sem internet
- **Gráficos:** Relatórios por semana/mês
- **Exportar:** CSV/PDF de corridas
