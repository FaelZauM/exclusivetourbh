import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "ExclusiveTour BH",
  description: "Transporte executivo premium em Belo Horizonte. 90+ veículos, atendimento 24h, faixa do Move.",
  url: "https://exclusivetourbh.com.br",
  telephone: "+5531984816915",
  image: "https://exclusivetourbh.com.br/og-image.jpg",
  taxID: "36.875.200/0001-35",
  priceRange: "$$",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
  areaServed: [
    { "@type": "City", name: "Belo Horizonte" },
    { "@type": "City", name: "Confins" },
    { "@type": "City", name: "Ouro Preto" },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Belo Horizonte",
    addressRegion: "MG",
    addressCountry: "BR",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "3",
    bestRating: "5",
  },
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Ana Clara Martins" },
      reviewRating: { "@type": "Rating", ratingValue: "5" },
      description: "Serviço impecável do início ao fim. Motorista pontual, veículo impecável e atendimento cortês. Virou minha primeira opção para viagens a BH.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Carlos Eduardo Lima" },
      reviewRating: { "@type": "Rating", ratingValue: "5" },
      description: "Contratei o City Tour e foi a melhor experiência. O motorista conhecia cada detalhe de BH. Recomendo de olhos fechados.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Fernanda Oliveira" },
      reviewRating: { "@type": "Rating", ratingValue: "5" },
      description: "Usamos o serviço corporativo há 6 meses. Pontualidade, frota nova e nota fiscal sem atraso. Parceiro de confiança.",
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Serviços de Transporte Executivo",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Transfer Aeroporto" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Táxi Executivo" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "City Tour" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Viagens Corporativas" } },
    ],
  },
}

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Quanto custa um transfer do Aeroporto de Confins para Belo Horizonte?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O valor varia conforme o veículo e destino. Utilizamos taxímetro (bandeira 2) com recibo e nota fiscal. Solicite seu orçamento pelo WhatsApp para um valor exato.",
      },
    },
    {
      "@type": "Question",
      name: "Vocês têm carro blindado?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim! Dispomos de Jeep Commander blindado em nossa frota de SUV Premium, ideal para quem busca segurança adicional.",
      },
    },
    {
      "@type": "Question",
      name: "Como funciona a Faixa do Move?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Somos credenciados pela BHTRANS para transitar na Faixa do Move, via exclusiva do transporte coletivo. Isso significa que evitamos o trânsito e você chega mais rápido ao seu destino.",
      },
    },
    {
      "@type": "Question",
      name: "Quais formas de pagamento são aceitas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aceitamos PIX, cartão de crédito e dinheiro. Todas as corridas têm recibo e nota fiscal.",
      },
    },
    {
      "@type": "Question",
      name: "Atendem quais regiões de Minas Gerais?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Atendemos Belo Horizonte, Grande BH (Contagem, Betim, Nova Lima), Aeroportos (Confins, Pampulha), Cidades Históricas (Ouro Preto, Mariana, Tiradentes, Diamantina) e todo o estado de Minas Gerais.",
      },
    },
    {
      "@type": "Question",
      name: "O serviço funciona 24 horas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim! Nosso atendimento é 24 horas, todos os dias da semana, incluindo feriados. Ideal para transfers noturnos e emergências.",
      },
    },
  ],
}

export const metadata: Metadata = {
  title: "ExclusiveTour BH | Transporte Executivo Premium em Belo Horizonte",
  description:
    "Transporte executivo premium em BH. 90+ veículos, atendimento 24h, faixa do Move. Transfer aeroporto, city tour, viagens corporativas. Solicite via WhatsApp.",
  metadataBase: new URL("https://exclusivetourbh.com.br"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ExclusiveTour BH | Transporte Executivo Premium em BH",
    description:
      "Transporte executivo premium em Belo Horizonte. Pontualidade, conforto e segurança. 90+ veículos, atendimento 24h.",
    url: "https://exclusivetourbh.com.br",
    siteName: "ExclusiveTour BH",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ExclusiveTour BH - Transporte Executivo Premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ExclusiveTour BH | Transporte Executivo Premium",
    description:
      "Transporte executivo premium em Belo Horizonte. Pontualidade, conforto e segurança.",
    images: ["/og-image.jpg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth antialiased">
      <body className={`${inter.className} bg-canvas text-ink`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
        {children}
      </body>
    </html>
  )
}
