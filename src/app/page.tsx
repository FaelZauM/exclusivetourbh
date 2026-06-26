import { Header } from "@/components/Header"
import { Hero } from "@/components/Hero"
import { MoveLane } from "@/components/MoveLane"
import { Services } from "@/components/Services"
import { OnboardMimos } from "@/components/OnboardMimos"
import { Fleet } from "@/components/Fleet"
import { Coverage } from "@/components/Coverage"
import { Testimonials } from "@/components/Testimonials"
import { CtaFinal } from "@/components/CtaFinal"
import { Footer } from "@/components/Footer"

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <MoveLane />
        <Services />
        <OnboardMimos />
        <Fleet />
        <Coverage />
        <Testimonials />
        <CtaFinal />
      </main>
      <Footer />
    </>
  )
}
