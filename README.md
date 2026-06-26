# 3DPrint Store

Loja virtual para venda de produtos impressos em 3D sob demanda. Catálogo com ~10 produtos, carrinho, frete Correios e pagamento via gateway brasileiro.

## Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Lucide React** (ícones)
- **Deploy:** Vercel

## Funcionalidades (MVP)

- [x] Home com hero, categorias e destaques
- [x] Catálogo com filtro por categoria
- [x] Página do produto com galeria e seletor de cor
- [x] Carrinho com cálculo de frete
- [x] Checkout com formulário e ViaCEP
- [x] Integração com gateway de pagamento
- [x] Admin para gerenciar pedidos

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Deploy no Vercel

```bash
npx vercel
```

## Próximos passos (pós-MVP)

- Integração real com API dos Correios (Sigep Web)
- Integração real com Mercado Pago / InfinitePay
- Autenticação (NextAuth)
- Área do cliente
- Upload de imagens dos produtos
- Fotos reais dos produtos impressos
