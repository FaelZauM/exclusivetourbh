import { Building2, Plane, Landmark, MapPin } from "lucide-react"
import { SectionHeading } from "./SectionHeading"

const regions = [
  {
    icon: Plane,
    title: "Aeroportos",
    locations: ["Confins (CNF)", "Pampulha (PLU)"],
  },
  {
    icon: Building2,
    title: "Grande BH",
    locations: ["Belo Horizonte", "Contagem", "Betim", "Nova Lima"],
  },
  {
    icon: Landmark,
    title: "Cidades Históricas",
    locations: ["Ouro Preto", "Mariana", "Tiradentes", "Diamantina", "Catas Altas", "Caraça"],
  },
  {
    icon: MapPin,
    title: "Minas Gerais",
    locations: ["Viagens intermunicipais", "Rodoviária", "Hospitais", "Eventos"],
  },
]

export function Coverage() {
  return (
    <section id="cobertura" className="border-y border-slate bg-gradient-to-br from-[#1C1814] to-[#0A0A0A] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Área de Cobertura"
          subtitle="Estamos onde você precisa"
          center
          light
        />

        <div className="mx-auto mb-12 mt-8 h-1 w-10 rounded-full bg-ember" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map((region) => (
            <div
              key={region.title}
              className="rounded border border-night bg-ink/50 p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ember/10">
                <region.icon className="h-6 w-6 text-ember" />
              </div>
              <h3 className="text-lg font-semibold text-canvas">{region.title}</h3>
              <ul className="mt-3 space-y-1.5">
                {region.locations.map((loc) => (
                  <li key={loc} className="flex items-center gap-2 text-sm text-silver">
                    <span className="h-1 w-1 rounded-full bg-ember/50" />
                    {loc}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-silver">
          Belo Horizonte · Minas Gerais · Brasil
        </p>
      </div>
    </section>
  )
}
