# ExclusiveTour BH - Especificação de Design

## Resumo

Redesign completo do site da ExclusiveTour BH, transporte executivo premium em Belo Horizonte. Site one-page com navegação por âncoras, foco em SEO, performance máxima e design premium.

## Stack Tecnológica

- **Framework:** Next.js 16 (App Router)
- **Estilo:** Tailwind CSS v4
- **Ícones:** Lucide React
- **Fontes:** Inter (Google Fonts)
- **Contato:** WhatsApp (link direto, sem formulário/chat)
- **Imagens:** Próprias do cliente (fotos reais dos veículos)
- **Deploy:** Vercel

## Paleta de Cores

- **Fundo primário:** Branco (#FFFFFF)
- **Fundo secundário:** Cinza claro (#F7F8FA)
- **Fundo escuro:** Preto/grafite (#0A0A0A)
- **Texto primário:** Preto (#1A1A1A)
- **Texto secundário:** Cinza (#666666)
- **Accent (CTA):** Dourado / Âmbar (#D97706 ou similar)
- **Destaque:** Azul escuro corporativo (#1E3A5F)

## Estrutura da Página

### Header
- Logo + "ExclusiveTour BH"
- Navegação: Serviços | Frota | Cobertura | Contato
- Botão WhatsApp em destaque (ícone + número)
- Sticky, fundo branco com backdrop-blur
- Mobile: hamburger menu

### Hero
- Fundo gradiente escuro
- Headline: "Sua chegada merece ser especial"
- Subheadline: "90+ veículos · 24h · Faixa Move"
- CTA: "Solicitar via WhatsApp" (dourado)
- Imagem: veículo na faixa do Move
- Indicadores: 4 badges (90+ Veículos, 5★, 24h, 100% Pontualidade)

### Faixa do Move (Diferencial)
- Fundo claro ou foto com sobreposição
- Título: "Faixa do Move — sem trânsito"
- Explicação do credenciamento
- Repetição dos indicadores (24h, Pontualidade, Veículos)

### Serviços
- Grid 3 colunas (6 cards)
- Cada card: ícone + título + descrição curta
- Serviços: Transfer Aeroporto, Táxi Executivo, Corporativo, City Tour BH, Passeios Turísticos, Viagens Intermunicipais
- Hover sutil com sombra

### Mimos a Bordo
- Ícones dos itens (água, balas, café, Wi-Fi, carregador)
- Grid simples e clean

### Frota
- 3 cards grandes: Sedã Luxo, SUV Premium, 7 Lugares
- Cada card: foto, lista de modelos, destaque para blindado
- Badge "Blindado" no card relevante

### Cobertura
- Grid de regiões atendidas
- Destaque: Aeroportos, Grande BH, Cidades Históricas
- Badge: "Belo Horizonte · Minas Gerais · Brasil"

### Depoimentos
- 3 cards com estrelas, texto, nome e cargo
- Rolagem horizontal em mobile

### CTA Final
- Fundo escuro
- "Pronto para uma experiência diferente?"
- Botão WhatsApp grande

### Footer
- 3 colunas: Logo + descrição | Links | Contato
- CNPJ e copyright
- Ícones sociais (WhatsApp, Instagram)

## SEO

- Meta tags otimizadas (title, description, OG)
- Structured data (LocalBusiness)
- Sitemap automático
- URLs canônicas
- Imagens com alt text e lazy loading
- SSR para crawlers

## Performance

- Next.js App Router + Turbopack
- Imagens otimizadas (next/image)
- Fontes com next/font
- Bundle pequeno (sem bibliotecas pesadas)
- Lighthouse 90+

## Fluxo do Usuário

1. Usuário acessa o site
2. Navega pelas seções (scroll ou menu)
3. Clica em "Solicitar via WhatsApp"
4. Abre conversa direta no WhatsApp com mensagem pré-preenchida

## Dados

- Serviços: mockados em JSON
- Frota: mockada em JSON
- Depoimentos: mockados em JSON
- Imagens: placeholder + fotos reais quando disponíveis

## MVP vs Futuro

**MVP (primeira versão):**
- One-page completa com todas as seções
- Responsivo
- WhatsApp integrado
- SEO básico

**Pós-MVP:**
- Blog (rotas de cidade, dicas)
- Galeria de fotos
- Multi-idioma (inglês)
- Agendamento online (pré-reserva)
