export interface Service {
  title: string
  description: string
  icon: string
}

export const services: Service[] = [
  {
    title: "Transfer Aeroporto",
    description: "Recepção no desembarque com placa nominal, auxílio com bagagens e translado direto ao seu destino.",
    icon: "plane",
  },
  {
    title: "Táxi Executivo",
    description: "Corridas urbanas com veículos premium e motoristas uniformizados. Disponível 24 horas.",
    icon: "car",
  },
  {
    title: "Corporativo",
    description: "Soluções de transporte para empresas: convênios mensais, contas corporativas e frotas dedicadas.",
    icon: "briefcase",
  },
  {
    title: "City Tour BH",
    description: "Roteiros personalizados pelos principais pontos turísticos de Belo Horizonte com guia local.",
    icon: "map",
  },
  {
    title: "Passeios Turísticos",
    description: "Viagem para Inhotim, Ouro Preto, Lapinha da Serra e outras atrações de Minas Gerais.",
    icon: "mountain",
  },
  {
    title: "Viagens Intermunicipais",
    description: "Transporte executivo para qualquer cidade de Minas Gerais com conforto e segurança.",
    icon: "route",
  },
]
