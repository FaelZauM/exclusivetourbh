# Serena + Lastlink: Integração de Pagamentos

## Resumo

Integrar a plataforma Serena (Next.js static export, hospedado no HostGator) com o gateway Lastlink para processar assinaturas recorrentes (Mensal R$15,90 e Anual R$159), usando Cloudflare Workers + KV + Email Service para validar webhooks e liberar acesso via link mágico.

## Arquitetura

```
[Botão "Assinar" no serenamedita.com.br]
        │
        ▼  (redirect)
[Lastlink Checkout — oferta C7F49B969]
        │
        ▼  (pagamento aprovado)
[Lastlink → Webhook POST → api.serenamedita.com.br/webhook]
        │
        ▼
[Cloudflare Worker: valida payload, gera token UUID]
        │
        ├── Cloudflare KV: salva { token → { email, nome, plano, expiresAt } }
        │
        └── Cloudflare Email Service: envia e-mail com link mágico
                │
                ▼
        [E-mail: "Seu acesso ao Serena → serenamedita.com.br/acessar?token=xyz"]
                │
                ▼
        [Página /acessar.html → fetch Worker valida token → sessionStorage → app]
```

## Componentes

### 1. Lastlink — Produtos e Ofertas

- **Produto**: "Serena Premium"
- **Oferta Mensal**: R$ 15,90/mês — assinatura recorrente
- **Oferta Anual**: R$ 159/ano — assinatura recorrente
- Webhook configurado para eventos:
  - `Purchase_Order_Confirmed` (compra aprovada)
  - `Subscription_Canceled` (cancelamento)
  - `Subscription_Expired` (expiração)
  - `Payment_Refund` / `Payment_Chargeback` (reembolso/estorno)

### 2. Cloudflare Worker (webhook)

Endpoint: `POST https://api.serenamedita.com.br/webhook`

**Validação**: Verificar se o IP de origem é da Lastlink e validar HMAC se disponível. Em último caso, validar pelo `Id` único do evento (idempotência via KV).

**Payload relevante** (`Purchase_Order_Confirmed`):
```json
{
  "Event": "Purchase_Order_Confirmed",
  "Data": {
    "Buyer": { "Email": "...", "Name": "...", "Document": "..." },
    "Purchase": {
      "Price": { "Value": 15.90 },
      "Payment": { "PaymentMethod": "credit_card" },
      "Recurrency": 1
    },
    "Subscriptions": [{ "Id": "sub-id", "ProductId": "prod-id" }],
    "Products": [{ "Name": "Serena Premium", "Price": 15.90 }]
  }
}
```

**Ações do Worker ao receber Purchase_Order_Confirmed:**
1. Validar idempotência — checar se `event.Id` já foi processado no KV
2. Gerar UUID v4 como token de acesso
3. Calcular `expiresAt`: para Mensal = now + 31 dias, Anual = now + 366 dias
4. Salvar em KV: `access:${token}` → `{ email, nome, plano, expiresAt, subscriptionId, createdAt }`
5. Salvar em KV: `email:${email}:token` → token (para lookup)
6. Salvar em KV: `subscription:${subscriptionId}` → token (para cancelamento)
7. Enviar e-mail via Cloudflare Email Service:
   - De: `serena@serenamedita.com.br`
   - Para: e-mail do comprador
   - Assunto: "Seu acesso ao Serena está liberado! 🧘"
   - HTML: template com botão "Acessar Serena" apontando para `https://serenamedita.com.br/acessar?token=${token}`

### 3. Cloudflare Worker (validação de token)

Endpoint: `GET https://api.serenamedita.com.br/validate?token=xyz`

**Ações:**
1. Buscar `access:xyz` no KV
2. Se não existir → 404 token inválido
3. Se `expiresAt` < now → retornar expirado (com dias desde expiração)
4. Retornar JSON: `{ valid: true, email, nome, plano, expiresAt }`

### 4. Cloudflare Worker (cancelamento/expiração)

Webhooks `Subscription_Canceled` e `Subscription_Expired`:
1. Buscar token pelo `subscription.id` no KV
2. Remover `access:token` do KV
3. Remover `email:${email}:token`
4. (Opcional) enviar e-mail de confirmação de cancelamento

### 5. Página /acessar.html (no Serena estático)

Nova página Next.js (rota: `/acessar`):
1. Ler query param `token` do URL
2. Fazer fetch para `https://api.serenamedita.com.br/validate?token=${token}`
3. Se válido → salvar `{ token, email, expiresAt }` no `sessionStorage`
4. Redirecionar para o app (`/app`)
5. Se inválido ou expirado → mostrar mensagem "Link inválido ou expirado"
6. Se token não presente → mostrar "Link de acesso necessário"

### 6. Serena App (proteção de conteúdo)

O app atual (`/app/*`) deve checar o `sessionStorage`:
- Se token presente e não expirado → renderizar conteúdo
- Se não → redirecionar para landing page
- Verificação periódica (ex: a cada rota ou intervalo) se token ainda é válido

## Infraestrutura Cloudflare

### DNS

| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| A    | @    | IP HostGator | DNS only |
| CNAME | www | serenamedita.com.br | DNS only |
| CNAME | api | `worker-name.meu-subdomain.workers.dev` | Proxied |

### Workers

- **Nome**: `serena-api`
- **Rota**: `api.serenamedita.com.br/*`
- **Triggado por**: Webhook Lastlink + validação de token
- **KV namespace**: `SERENA_ACCESS`
- **Email binding**: `SERENA_EMAIL` (domínio verificado: `serenamedita.com.br`)

### KV Schema

| Key | Value | TTL |
|-----|-------|-----|
| `event:${eventId}` | `{ "processed": true }` | 7 dias (idempotência) |
| `access:${token}` | `{ "email", "nome", "plano", "expiresAt", "subscriptionId", "createdAt" }` | conforme plano |
| `email:${email}:token` | token | conforme plano |
| `subscription:${subscriptionId}` | token | conforme plano |

## Fluxo de Renovação

- **Pagamento recorrente bem-sucedido**: Lastlink envia `Recurrent_Payment` → Worker renova o TTL do token no KV (adiciona +31 ou +366 dias)
- **Falha na renovação**: Lastlink envia `Subscription_Renewal_Pending` → Worker pode enviar e-mail de alerta
- **Cancelamento**: `Subscription_Canceled` → Worker remove token do KV → acesso cortado imediatamente
- **Expiração**: `Subscription_Expired` → Worker remove token

## Considerações de Segurança

- Tokens são UUID v4 aleatórios (128 bits), impraticáveis de adivinhar
- KV não exposto publicamente — só o Worker acessa
- Worker valida HMAC/payload antes de processar webhook
- Idempotência via `event.Id` evita processamento duplicado
- Cloudflare Email Service usa DKIM/DMARC configurados automaticamente

## Setup (Ordem de Implementação)

1. **Cloudflare**: migrar DNS, verificar domínio, configurar Email Service
2. **Lastlink**: criar produto + ofertas + webhook apontando para Worker
3. **Worker**: desenvolver + deploy (webhook + validação + email)
4. **Serena**: criar página /acessar + proteção de conteúdo no app
5. **Teste**: fluxo completo (compra → email → acesso → renovação → cancelamento)
6. **Deploy**: build estático + upload FTP