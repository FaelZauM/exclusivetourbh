import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "ExclusiveTour BH | Transporte Executivo Premium em Belo Horizonte",
  description:
    "Transporte executivo premium em BH. 90+ veículos, atendimento 24h, faixa do Move. Transfer aeroporto, city tour, viagens corporativas. Solicite via WhatsApp.",
  openGraph: {
    title: "ExclusiveTour BH | Transporte Executivo Premium",
    description:
      "Transporte executivo premium em Belo Horizonte. Pontualidade, conforto e segurança.",
    url: "https://exclusivetourbh.com",
    siteName: "ExclusiveTour BH",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ExclusiveTour BH | Transporte Executivo Premium",
    description:
      "Transporte executivo premium em Belo Horizonte. Pontualidade, conforto e segurança.",
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
        {children}
      </body>
    </html>
  )
}
