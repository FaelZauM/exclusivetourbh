import { Plane, Car, Briefcase, Map, Mountain, Route } from "lucide-react"
import { services } from "@/data/services"
import { SectionHeading } from "./SectionHeading"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  plane: Plane,
  car: Car,
  briefcase: Briefcase,
  map: Map,
  mountain: Mountain,
  route: Route,
}

export function Services() {
  return (
    <section id="servicos" className="bg-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Nossos Serviços"
          subtitle="Soluções completas em transporte executivo para cada momento"
          center
        />

        <div className="mx-auto mb-12 mt-8 h-1 w-10 rounded-full bg-ember" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = iconMap[service.icon]
            return (
              <div
                key={service.title}
                className="group rounded border border-slate bg-canvas p-6 transition-all duration-200 hover:-translate-y-1 hover:border-ember/30 hover:shadow-sm"
              >
                {Icon && <Icon className="mb-4 h-8 w-8 text-ember" />}
                <h3 className="text-lg font-semibold text-ink">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silver">{service.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
