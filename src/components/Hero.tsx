import { Shield, Star, Clock, Award } from "lucide-react"
import { WhatsAppButton } from "./WhatsAppButton"

const badges = [
  { icon: Shield, label: "90+ Veículos" },
  { icon: Star, label: "5★ Avaliações" },
  { icon: Clock, label: "Atendimento 24h" },
  { icon: Award, label: "100% Pontualidade" },
]

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-ink-warm via-ink to-night">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(217,119,6,0.06)_0%,_transparent_70%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-32 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-block rounded-full border border-ember/30 px-4 py-1.5 text-xs font-semibold tracking-widest text-ember uppercase">
          Transporte Executivo Premium
        </div>

        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-ember" />

        <h1 className="text-balance max-w-4xl text-4xl font-extrabold leading-tight text-canvas sm:text-5xl md:text-6xl lg:text-7xl">
          Transporte Executivo Premium{" "}
          <span className="text-ember">em Belo Horizonte</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-silver sm:text-xl">
          90+ veículos · Atendimento 24h · Faixa do Move
        </p>

        <div className="mt-10">
          <WhatsAppButton large />
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
          {badges.map((badge) => (
            <div key={badge.label} className="flex flex-col items-center gap-2">
              <badge.icon className="h-6 w-6 text-ember" />
              <span className="text-sm font-medium text-silver">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
