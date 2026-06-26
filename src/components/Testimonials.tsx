import { Star } from "lucide-react"
import { testimonials } from "@/data/testimonials"
import { SectionHeading } from "./SectionHeading"

export function Testimonials() {
  return (
    <section className="bg-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="O que nossos clientes dizem"
          subtitle="A satisfação de quem já viajou conosco"
          center
        />

        <div className="mx-auto mb-12 mt-8 h-1 w-10 rounded-full bg-ember" />

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded border border-slate bg-canvas p-6"
            >
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-ember text-ember" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-silver">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-4 border-t border-slate pt-4">
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-silver">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
