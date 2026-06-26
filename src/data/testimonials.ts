export interface Testimonial {
  name: string
  role: string
  text: string
  rating: number
}

export const testimonials: Testimonial[] = [
  {
    name: "Ana Clara Martins",
    role: "Executiva · São Paulo",
    text: "Serviço impecável do início ao fim. Motorista pontual, veículo impecável e atendimento cortês. Virou minha primeira opção para viagens a BH.",
    rating: 5,
  },
  {
    name: "Carlos Eduardo Lima",
    role: "Turista · Rio de Janeiro",
    text: "Contratei o City Tour e foi a melhor experiência. O motorista conhecia cada detalhe de BH. Recomendo de olhos fechados.",
    rating: 5,
  },
  {
    name: "Fernanda Oliveira",
    role: "Empresária · Belo Horizonte",
    text: "Usamos o serviço corporativo há 6 meses. Pontualidade, frota nova e nota fiscal sem atraso. Parceiro de confiança.",
    rating: 5,
  },
]
