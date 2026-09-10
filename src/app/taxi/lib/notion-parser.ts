export interface NotionRide {
  ride_date: string
  category: string
  value: number
  passenger_name?: string
  payment_method?: string
  company_name?: string
  repasse?: boolean
  repasse_value?: number
  car_type?: string
  source: "notion"
  notion_id: string
  user_id: string
}

export interface NotionExpense {
  expense_date?: string
  fuel_date?: string
  category: string
  value?: number
  total_value?: number
  source: "notion"
  notion_id: string
  user_id: string
}

const CATEGORY_MAP: Record<string, string> = {
  "🔹": "private",
  "🔸": "invoiced",
  "🔺": "invoiced",
  "🚕": "app",
  "🚖": "taximeter",
}

const PAYMENT_MAP: Record<string, string> = {
  "💳": "card",
  "💲": "cash",
}

const COMPANY_KEYWORDS: Record<string, string> = {
  ultra: "Ultra",
  cedac: "CEDAC",
  bta: "BTA",
  líder: "Líder",
  lider: "Líder",
}

export function mapCategory(symbol: string): string {
  return CATEGORY_MAP[symbol] || "private"
}

export function mapPayment(symbol: string): string {
  return PAYMENT_MAP[symbol] || "not_specified"
}

export function parseValue(str: string): number {
  const cleaned = str.replace(/\./g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
}

export function extractCompany(line: string): string | undefined {
  const lower = line.toLowerCase()
  
  for (const [keyword, company] of Object.entries(COMPANY_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return company
    }
  }
  
  const parenMatch = line.match(/\(([^)]+)\)/)
  if (parenMatch) {
    return parenMatch[1]
  }
  
  return undefined
}

export function isRideLine(line: string): boolean {
  const symbol = line.match(/^([🔹🔸🔺🚕🚖])/u)?.[1]
  if (!symbol) return false
  
  const values = [...line.matchAll(/(?:\$)?([\d.]+,\d{2})/g)]
  return values.length > 0
}

export function isExpenseLine(line: string): boolean {
  return /[\d.]+,\d{2}G$/.test(line)
}

export function isDateHeader(line: string): boolean {
  return /📅\s*\d{2}\/\d{2}\/\d{4}/.test(line)
}

export function parseDateHeader(line: string): string | null {
  const match = line.match(/📅\s*(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return null
  
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export function parseRideLine(
  line: string,
  userId: string,
  datePrefix: string,
  blockId: string
): NotionRide | null {
  const symbol = line.match(/^([🔹🔸🔺🚕🚖])/u)?.[1]
  if (!symbol) return null
  
  const values = [...line.matchAll(/(?:\$)?([\d.]+,\d{2})/g)]
  if (values.length === 0) return null
  
  const paymentSymbol = line.match(/([💳💲])/u)?.[1]
  const payment_method = paymentSymbol ? mapPayment(paymentSymbol) : "not_specified"
  
  const hasRepasse = line.includes("🟡") || line.includes("⚫")
  const repasse_value = hasRepasse && values.length > 1 ? parseValue(values[values.length - 1][1]) : 0
  
  const passengerMatch = line.match(/Passageiro\s+([^\s$]+)/i)
  const passenger_name = passengerMatch ? passengerMatch[1] : undefined
  
  const company_name = extractCompany(line)
  
  const timeMatch = line.match(/(\d{1,2}:\d{2})/)
  const time = timeMatch ? timeMatch[1] : "12:00"
  
  return {
    ride_date: `${datePrefix}T${time}:00`,
    category: company_name ? "invoiced" : mapCategory(symbol),
    value: parseValue(values[0][1]),
    passenger_name,
    payment_method,
    company_name,
    repasse: hasRepasse,
    repasse_value,
    car_type: undefined,
    source: "notion",
    notion_id: blockId,
    user_id: userId,
  }
}

export function parseExpenseLine(
  line: string,
  userId: string,
  datePrefix: string,
  blockId: string
): NotionExpense | null {
  const gasMatch = line.match(/([\d.]+,\d{2})G$/)
  if (!gasMatch) return null
  
  return {
    fuel_date: `${datePrefix}T12:00:00`,
    category: "fuel",
    total_value: parseValue(gasMatch[1]),
    source: "notion",
    notion_id: blockId,
    user_id: userId,
  }
}
