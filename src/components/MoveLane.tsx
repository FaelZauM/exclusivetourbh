import { Shield, Star, Clock, Receipt } from "lucide-react"

export function MoveLane() {
  return (
    <section className="border-b border-slate bg-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-block rounded-full border border-ember/20 bg-amber-50 px-3 py-1 text-xs font-semibold text-ember">
            DIFERENCIAL EXCLUSIVO
          </div>

          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-ember" />

          <h2 className="text-balance text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
            Faixa do Move — sem trânsito
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-silver">
            Somos credenciados pela <strong className="text-ink">BHTRANS</strong> para transitar na
            Faixa do Move, a via exclusiva do transporte coletivo. Enquanto outros ficam presos no
            trânsito, você chega mais rápido ao seu destino com conforto e pontualidade.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 border-t border-slate pt-12 sm:grid-cols-4">
          {[
            { icon: Clock, label: "24 horas", desc: "Atendimento ininterrupto" },
            { icon: Star, label: "Pontualidade", desc: "Chegamos antes do previsto" },
            { icon: Shield, label: "Credenciado", desc: "Autorizado pela BHTRANS" },
            { icon: Receipt, label: "Taxímetro", desc: "Recibo e nota fiscal" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ember/10">
                <item.icon className="h-6 w-6 text-ember" />
              </div>
              <span className="font-semibold text-ink">{item.label}</span>
              <span className="mt-1 text-sm text-silver">{item.desc}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-silver">
          Aceitamos PIX, cartão de crédito e dinheiro
        </p>
      </div>
    </section>
  )
}
