import { Phone } from "lucide-react"

const WHATSAPP_NUMBER = "5531984816915"
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`

export function Footer() {
  return (
    <footer id="contato" className="bg-ink py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-ember">Ex</span>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-extrabold tracking-[0.2em] text-canvas">EXCLUSIVE</span>
                <span className="text-xs font-extrabold tracking-[0.2em] text-canvas">TOUR BH</span>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-silver">
              Transporte executivo premium em Belo Horizonte. Pontualidade, conforto e
              segurança para você e sua empresa.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-canvas">Links</h4>
            <ul className="space-y-2 text-sm text-silver">
              <li><a href="#servicos" className="transition-colors hover:text-ember">Serviços</a></li>
              <li><a href="#frota" className="transition-colors hover:text-ember">Frota</a></li>
              <li><a href="#cobertura" className="transition-colors hover:text-ember">Cobertura</a></li>
              <li><a href="#contato" className="transition-colors hover:text-ember">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-canvas">Contato</h4>
            <ul className="space-y-3 text-sm text-silver">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 transition-colors hover:text-ember"
                >
                  <Phone className="h-4 w-4" />
                  (31) 98481-6915
                </a>
              </li>
              <li className="flex items-center gap-2 text-silver">
                @exclusivetourbh
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-night pt-8 text-center text-xs text-silver">
          <p>ExclusiveTour BH — Transporte Executivo</p>
          <p className="mt-1">CNPJ: 36.875.200/0001-35</p>
          <p className="mt-2">&copy; {new Date().getFullYear()} ExclusiveTour BH. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
