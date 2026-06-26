import { Droplets, Candy, Coffee, Wifi, BatteryCharging } from "lucide-react"
import { SectionHeading } from "./SectionHeading"

const mimos = [
  { icon: Droplets, label: "Água mineral" },
  { icon: Candy, label: "Balas e snacks" },
  { icon: Coffee, label: "Café premium" },
  { icon: Wifi, label: "Wi-Fi a bordo" },
  { icon: BatteryCharging, label: "Carregador USB" },
]

export function OnboardMimos() {
  return (
    <section className="border-y border-slate bg-gradient-to-br from-[#1C1814] to-[#0A0A0A] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Mimos a Bordo"
          subtitle="Pequenos detalhes que fazem sua viagem ainda mais especial"
          center
          light
        />

        <div className="mx-auto mb-12 mt-8 h-1 w-10 rounded-full bg-ember" />

        <div className="flex flex-wrap justify-center gap-8">
          {mimos.map((mimo) => (
            <div
              key={mimo.label}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-ember/20 bg-ember/10">
                <mimo.icon className="h-7 w-7 text-ember" />
              </div>
              <span className="text-sm font-medium text-silver">{mimo.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
