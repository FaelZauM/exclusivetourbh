import { Shield } from "lucide-react"
import { fleet } from "@/data/fleet"
import { SectionHeading } from "./SectionHeading"

export function Fleet() {
  return (
    <section id="frota" className="bg-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Nossa Frota"
          subtitle="Veículos premium para cada necessidade"
          center
        />

        <div className="mx-auto mb-12 mt-8 h-1 w-10 rounded-full bg-ember" />

        <div className="grid gap-8 lg:grid-cols-3">
          {fleet.map((item) => (
            <div
              key={item.category}
              className="group relative overflow-hidden rounded border border-slate bg-canvas transition-all duration-200 hover:-translate-y-1 hover:border-ember/30 hover:shadow-sm"
            >
              <div className="aspect-[16/10] bg-gradient-to-br from-night to-ink flex items-center justify-center">
                <span className="text-4xl font-extrabold text-slate/20 tracking-widest uppercase">
                  {item.category === "Sedã Luxo" ? "SEDAN" : item.category === "SUV Premium" ? "SUV" : "7 LUGARES"}
                </span>
              </div>

              {item.armoredModels && item.armoredModels.length > 0 && (
                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ember px-3 py-1 text-xs font-semibold text-canvas">
                  <Shield className="h-3 w-3" />
                  Blindado
                </div>
              )}

              <div className="p-6">
                <h3 className="text-xl font-bold text-ink">{item.category}</h3>
                <p className="mt-2 text-sm text-silver">{item.description}</p>

                <ul className="mt-4 space-y-1.5">
                  {item.models.map((model) => (
                    <li key={model} className="flex items-center gap-2 text-sm text-ink">
                      <span className="h-1 w-1 rounded-full bg-ember" />
                      {model}
                      {item.armoredModels?.includes(model) && (
                        <span className="flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-ember">
                          <Shield className="h-2.5 w-2.5" />
                          Blindado
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
