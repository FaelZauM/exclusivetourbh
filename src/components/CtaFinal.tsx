import { WhatsAppButton } from "./WhatsAppButton"

export function CtaFinal() {
  return (
    <section className="bg-gradient-to-br from-[#1C1814] to-[#0A0A0A] py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-ember" />
        <h2 className="text-balance text-3xl font-bold leading-tight text-canvas sm:text-4xl lg:text-5xl">
          Pronto para uma experiência diferente?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-silver">
          Solicite seu orçamento agora e descubra o verdadeiro significado de viajar com conforto.
        </p>
        <div className="mt-10">
          <WhatsAppButton large />
        </div>
      </div>
    </section>
  )
}
