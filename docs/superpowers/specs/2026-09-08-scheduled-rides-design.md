# Design: Sistema de Agendamento de Corridas

## Visão Geral

Sistema para agendar corridas futuras com notificações automáticas antes do horário agendado.

## Regras de Negócio

### Quem pode agendar

| Aba | Quem agenda | Para quem |
|-----|-------------|-----------|
| **Corridas** | Todos (admin, driver, user, developer) | Própria corrida |
| **Aluguel** | Somente owner (admin/Regis) | Motorista do aluguel |

### Categorias permitidas

- Cooperativa (`cooperative`)
- Particular (`private`)
- Faturado (`invoiced`)

**Não permitido:** App (Uber, 99, InDrive) e Taxímetro

### Notificações

| Tipo | Antecedência | Mensagem |
|------|--------------|----------|
| **Own** (própria) | 1 hora | "Seu atendimento começa em 1 hora" |
| **Passed** (passada) | 15 minutos | "Nos próximos 15 minutos, o motorista X irá realizar o seu atendimento" |

## Estrutura de Dados

### Tabela `scheduled_rides`

```sql
CREATE TABLE scheduled_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('own', 'passed')),
  category TEXT NOT NULL CHECK (category IN ('cooperative', 'private', 'invoiced')),
  value DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2),
  driver_name TEXT,
  passenger_name TEXT,
  company_name TEXT,
  dispatcher_name TEXT,
  start_location TEXT,
  end_location TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'notified', 'completed', 'cancelled')),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE scheduled_rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled rides" ON scheduled_rides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled rides" ON scheduled_rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled rides" ON scheduled_rides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled rides" ON scheduled_rides
  FOR DELETE USING (auth.uid() = user_id);

-- Admin/Developer can view all
CREATE POLICY "Admin can view all scheduled rides" ON scheduled_rides
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );
```

### Tabela `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
```

## Arquitetura

### Componentes

1. **ScheduledRideForm** — Formulário de agendamento (baseado no RideForm existente)
2. **ScheduledRidesList** — Lista de corridas agendadas
3. **NotificationsList** — Lista de notificações
4. **NotificationBadge** — Badge no Header com contador

### Fluxo Principal

```
1. Usuário agenda corrida → salva em scheduled_rides (status: scheduled)
2. Cron job roda a cada 5min
3. Encontra corridas próximas:
   - Own: 1 hora antes
   - Passed: 15 minutos antes
4. Envia push notification
5. Cria notificação in-app
6. Atualiza status para 'notified'
```

### Cron Job (Supabase Edge Function)

```typescript
// A cada 5 minutos verifica corridas agendadas
const now = new Date()

// Corridas own: 1 hora antes
const ownThreshold = new Date(now.getTime() + 60 * 60 * 1000)

// Corridas passed: 15 minutos antes
const passedThreshold = new Date(now.getTime() + 15 * 60 * 1000)

// Buscar corridas scheduled que precisam de notificação
// Enviar push + criar notificação in-app
// Atualizar status para 'notified'
```

## Interface

### Tela Corridas

- Botão "Agendar Corrida" no topo
- Lista de corridas agendadas antes das corridas do dia
- Cada agendamento mostra: data/hora, categoria, passageiro, valor
- Botão para cancelar agendamento

### Tela Aluguel

- Mesmo botão (só aparece para owner)
- Lista de agendamentos do motorista

### Header

- Badge com contador de notificações não lidas
- Clicável para abrir lista de notificações

## Arquivos a modificar/criar

### Novos arquivos

- `src/app/taxi/lib/types.ts` — Adicionar tipos ScheduledRide, Notification
- `src/app/taxi/components/ScheduledRideForm.tsx` — Formulário de agendamento
- `src/app/taxi/components/ScheduledRidesList.tsx` — Lista de agendamentos
- `src/app/taxi/components/NotificationsList.tsx` — Lista de notificações
- `src/app/taxi/components/NotificationBadge.tsx` — Badge no Header
- `src/app/taxi/lib/notification-service.ts` — Serviço de notificações

### Arquivos a modificar

- `src/app/taxi/corridas/page.tsx` — Adicionar agendamento
- `src/app/taxi/aluguel/page.tsx` — Adicionar agendamento (só owner)
- `src/app/taxi/components/Header.tsx` — Adicionar badge de notificações
- `src/app/taxi/layout.tsx` — Carregar notificações

## SQL para rodar no Supabase

```sql
-- 1. Tabela scheduled_rides
CREATE TABLE scheduled_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('own', 'passed')),
  category TEXT NOT NULL CHECK (category IN ('cooperative', 'private', 'invoiced')),
  value DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2),
  driver_name TEXT,
  passenger_name TEXT,
  company_name TEXT,
  dispatcher_name TEXT,
  start_location TEXT,
  end_location TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'notified', 'completed', 'cancelled')),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE scheduled_rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled rides" ON scheduled_rides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled rides" ON scheduled_rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled rides" ON scheduled_rides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled rides" ON scheduled_rides
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all scheduled rides" ON scheduled_rides
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

-- 2. Tabela notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- 3. Índices para performance
CREATE INDEX idx_scheduled_rides_status ON scheduled_rides(status);
CREATE INDEX idx_scheduled_rides_date ON scheduled_rides(scheduled_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
```
