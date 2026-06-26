import { Phone } from "lucide-react"
import { cn } from "@/lib/utils"

const WHATSAPP_NUMBER = "5531984816915"
const WHATSAPP_MESSAGE = "Olá! Gostaria de solicitar um orçamento."
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

interface WhatsAppButtonProps {
  iconOnly?: boolean
  large?: boolean
}

export function WhatsAppButton({ iconOnly, large }: WhatsAppButtonProps) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={iconOnly ? "Falar pelo WhatsApp" : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded font-semibold transition-all duration-200",
        "bg-ember text-canvas hover:bg-ember-dark",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2",
        large ? "px-8 py-4 text-base" : "px-4 py-2 text-sm",
      )}
    >
      <Phone className={cn(large ? "h-5 w-5" : "h-4 w-4")} />
      {!iconOnly && <span>{large ? "Solicitar via WhatsApp" : "WhatsApp"}</span>}
    </a>
  )
}
