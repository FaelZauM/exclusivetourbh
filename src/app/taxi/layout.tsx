import type { Metadata } from "next"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Taxi Control | Controle de corridas",
  description:
    "Registre corridas, controle investimentos e acompanhe suas metas.",
  metadataBase: new URL("https://exclusivetourbh.com.br"),
  openGraph: {
    title: "Taxi Control — Controle de corridas",
    description: "Registre corridas, controle investimentos e acompanhe suas metas.",
    locale: "pt_BR",
    type: "website",
  },
}

export default function TaxiLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`}>
      <body className="font-inter bg-white text-taxi-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
