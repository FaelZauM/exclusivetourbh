export interface FleetItem {
  category: string
  description: string
  models: string[]
  armoredModels?: string[]
  image: string
}

export const fleet: FleetItem[] = [
  {
    category: "Sedã Luxo",
    description: "Conforto e elegância para viagens executivas e transfers.",
    models: ["Toyota Corolla", "Nissan Sentra", "BYD King", "Chevrolet Cruze"],
    image: "/fleet/sedan.jpg",
  },
  {
    category: "SUV Premium",
    description: "Espaço e sofisticação para grupos e viagens mais longas.",
    models: ["Toyota Corolla Cross", "Chery Tiggo 8", "Jeep Commander", "BYD Song"],
    armoredModels: ["Jeep Commander"],
    image: "/fleet/suv.jpg",
  },
  {
    category: "7 Lugares",
    description: "Ideal para famílias e grupos de até 7 passageiros com bagagem.",
    models: ["Chery Tiggo 8 (7L)", "Jeep Commander (7L)"],
    image: "/fleet/van.jpg",
  },
]
