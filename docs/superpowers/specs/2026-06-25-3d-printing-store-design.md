# Loja de Impressão 3D - Especificação de Design

## Resumo

Site de página única (com rotas internas) para venda de produtos impressos em 3D sob demanda, com catálogo, carrinho, cálculo de frete Correios e pagamento via gateway brasileiro.

## Stack Tecnológica

- **Framework:** Next.js 14+ (App Router)
- **Deploy:** Vercel
- **Estilo:** Tailwind CSS + Tailwind UI (ou custom)
- **Ícones:** Lucide React
- **Gateway de Pagamento:** Mercado Pago ou InfinitePay (via SDK JS + API webhook)
- **Frete:** API dos Correios (Sigep Web / Melhor Envio como intermediário ou consulta direta)
- **Banco/Estado:** Servidor (sem banco local inicialmente) - dados mockados em JSON para produtos, sessão de carrinho via cookies/storage

## Público-alvo

- Consumidores finais buscando objetos decorativos, utilitários e brinquedos impressos em 3D
- Design limpo, minimalista, que transmita qualidade artesanal + tecnologia

## Estrutura de Páginas

### 1. Home (`/`)

**Header**
- Logo (texto ou ícone 3D)
- Navegação: Categorias (dropdown ou links), Contato
- Ícone do carrinho com badge de quantidade

**Hero Section**
- Fundo com foto/design de peça 3D
- Headline principal + subtitle
- Botão CTA: "Ver Catálogo" (scroll)
- Indicador visual de "Sob Demanda" (explicação breve: "Feito sob encomenda para você")

**Seção "Como Funciona"** (3 passos)
1. Escolha o produto e a cor
2. Calcule o frete pelo CEP
3. Receba em casa

**Grid de Categorias** (cards com imagem e nome)

**Seção de Destaques** (2-3 produtos em grid maior)

**Footer**
- Redes sociais
- Política de trocas
- Contato/WhatsApp
- Selo de "Impressão 3D Sob Demanda"

### 2. Catálogo (`/catalogo`)

- Grid de produtos com filtro por categoria
- Cada card: foto, nome, faixa de preço, seletor de cor rápida, botão "Adicionar"
- Responsivo: 4 colunas desktop, 2 tablet, 1 mobile

### 3. Produto (`/produto/[slug]`)

**Galeria**
- Imagens do produto em múltiplas cores
- Carrossel/thumbs

**Info**
- Nome, descrição detalhada
- Especificações: material (PLA/ABS/Resina), dimensões (cm), peso estimado (g)
- Seletor de cor (bolinhas de cor) - todas mesmo preço
- Quantidade (stepper)
- **Frete:** Input de CEP + botão "Calcular" → retorna prazos e valores PAC/Sedex
- Preço + "Comprar"

**Seção de perguntas frequentes** (prazo de produção, envio, trocas)

### 4. Carrinho (`/carrinho`)

- Drawer/modal lateral ou página full
- Lista de itens: foto, nome, cor, quantidade, preço
- Input de CEP (recalcula frete)
- Subtotal, frete, total
- Botão "Finalizar Pedido" → redirect para checkout

### 5. Checkout (`/checkout`)

**Etapa 1: Dados**
- Nome, e-mail, telefone
- CEP (auto-completa endereço via ViaCEP)
- Endereço completo
- Observação do pedido

**Etapa 2: Pagamento**
- Resumo do pedido
- Opções de pagamento (Pix, Cartão, Boleto)
- Redirect para gateway (Mercado Pago / InfinitePay)

**Etapa 3: Confirmação**
- Número do pedido
- Resumo
- Status do pagamento
- Botão "Acompanhar Pedido"

### 6. Admin (`/admin`) - (MVP+)

- Lista de pedidos com status
- Atualizar status (Recebido, Em Produção, Enviado, Entregue)
- Inserir código de rastreio
- Gerenciar produtos (opcional no futuro)

## Fluxo de Dados

1. **Catálogo:** JSON estático → ISR (Incremental Static Regeneration)
2. **Carrinho:** localStorage (client-side) + cookie para SSR
3. **Frete:** Usuário digita CEP → Server Action consulta API Correios → retorna opções
4. **Checkout:** 
   - Server Action cria pedido (temporário em memória/arquivo)
   - Redirect para gateway de pagamento
   - Webhook do gateway confirma pagamento → Server Action atualiza status
   - E-mail de confirmação (opcional MVP+)
5. **Admin:** Acesso simples sem autenticação (MVP), depois NextAuth

## Dados do Produto (Schema)

```typescript
type Product = {
  id: string
  slug: string
  name: string
  description: string
  category: string
  material: string // "PLA", "Resina", "ABS"
  dimensions: string // ex: "15 × 10 × 8 cm"
  weight: number // gramas
  basePrice: number // centavos
  colors: { name: string; hex: string; imageUrl: string }[]
  images: string[]
  estimatedDays: number // prazo de produção
}
```

## Considerações de Segurança

- Webhooks de pagamento validados por assinatura HMAC
- Server Actions com validação de input (Zod)
- Cálculo de frete server-side (não confiar no client)
- Preço sempre calculado server-side no checkout

## Testes

- Validação de CEP (formato)
- Cálculo de frete para diferentes pesos/destinos
- Fluxo de compra completo (mock gateway)
- Renderização dos componentes principais

## MVP vs Futuro

**MVP (primeira versão):**
- Home + Catálogo + Produto + Carrinho + Checkout básico
- Integração com gateway de pagamento
- Frete Correios
- Admin: lista de pedidos + atualizar status manual

**Pós-MVP:**
- Autenticação (NextAuth)
- Área do cliente (meus pedidos)
- E-mail automático (Resend)
- Upload de fotos para os produtos
- Rastreio automático
- SEO avançado (blog, rich snippets)
- Múltiplos materiais/preços por produto
