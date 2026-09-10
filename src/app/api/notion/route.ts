import { NextRequest, NextResponse } from "next/server"

const NOTION_TOKEN = process.env.NOTION_TOKEN || ""
const NOTION_API = "https://api.notion.com/v1"
const NOTION_VERSION = "2022-06-28"

async function notionFetch(endpoint: string) {
  const response = await fetch(`${NOTION_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
    },
  })
  
  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status}`)
  }
  
  return response.json()
}

async function getPageBlocks(pageId: string) {
  const blocks: unknown[] = []
  let cursor: string | undefined
  
  do {
    const endpoint = `/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`
    const data = await notionFetch(endpoint)
    blocks.push(...data.results)
    cursor = data.next_cursor || undefined
  } while (cursor)
  
  return blocks
}

async function getSubpages(pageId: string) {
  const blocks = await getPageBlocks(pageId)
  return blocks.filter((b) => (b as Record<string, unknown>).type === "child_page") as Array<{ id: string; child_page?: { title: string } }>
}

function extractText(block: Record<string, unknown>): string {
  const type = block.type as string
  const blockData = block[type] as { rich_text?: Array<{ plain_text: string }> } | undefined
  const richText = blockData?.rich_text || []
  return richText.map((t) => t.plain_text).join("")
}

function parseValue(str: string): number {
  const cleaned = str.replace(/\./g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
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

export async function POST(request: NextRequest) {
  try {
    const { pageId, userId, month } = await request.json()
    
    if (!pageId || !userId) {
      return NextResponse.json({ error: "Missing pageId or userId" }, { status: 400 })
    }
    
    console.log("🔍 Fetching subpages from:", pageId)
    const subpages = await getSubpages(pageId)
    console.log("📂 Found subpages:", subpages.length, subpages.map(s => s.child_page?.title))
    
    const allRides: unknown[] = []
    const allExpenses: unknown[] = []
    
    const monthNames = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ]
    
    for (const subpage of subpages) {
      const title = subpage.child_page?.title || ""
      
      // Filter by month if specified
      if (month) {
        const targetMonth = monthNames[month - 1]
        if (!title.toLowerCase().includes(targetMonth)) continue
      }
      
      console.log("📄 Processing:", title)
      const blocks = await getPageBlocks(subpage.id)
      console.log("🧱 Found blocks:", blocks.length)
      let currentDate = ""
      
      for (const block of blocks) {
        const b = block as Record<string, unknown>
        const text = extractText(b)
        
        if (text.trim()) {
          console.log("📝 Block text:", text.substring(0, 100))
        }
        
        // Check for date header (📅 01/08/2026)
        const dateMatch = text.match(/📅\s*(\d{2})\/(\d{2})\/(\d{4})/)
        if (dateMatch) {
          const [, day, m, y] = dateMatch
          currentDate = `${y}-${m}-${day}`
          continue
        }
        
        if (!currentDate) continue
        
        const line = text.trim().replace(/\uFE0F/g, "")
        
        // Skip non-ride lines
        if (line.match(/^Km\s/i)) continue
        if (line.match(/^[📊💰✅❌📈📉]/u)) continue
        if (line.match(/^[─=]{10,}/)) continue
        
        // Extract symbol
        const symbol = line.match(/^([🔹🔸🔺🚕🚖])/u)?.[1]
        if (!symbol) continue
        
        // Extract values
        const values = [...line.matchAll(/(?:\$)?([\d.]+,\d{2})/g)]
        if (values.length === 0) continue
        
        // Check for fuel (ends with G)
        const gasMatch = line.match(/([\d.]+,\d{2})G$/)
        if (gasMatch) {
          allExpenses.push({
            fuel_date: `${currentDate}T12:00:00`,
            total_value: parseValue(gasMatch[1]),
            source: "notion",
            notion_id: b.id as string,
            user_id: userId,
          })
          continue
        }
        
        // Extract payment method
        const paymentSymbol = line.match(/([💳💲])/u)?.[1]
        const payment_method = paymentSymbol ? PAYMENT_MAP[paymentSymbol] || "not_specified" : "not_specified"
        
        // Extract repasse
        const hasRepasse = line.includes("🟡") || line.includes("⚫")
        const repasse_value = hasRepasse && values.length > 1 ? parseValue(values[values.length - 1][1]) : 0
        
        // Extract passenger name
        const passengerMatch = line.match(/Passageiro\s+([^\s$]+)/i)
        const passenger_name = passengerMatch ? passengerMatch[1] : undefined
        
        // Extract company name
        const companyMatch = line.match(/\(([^)]+)\)/)
        const company_name = companyMatch ? companyMatch[1] : undefined
        
        // Extract time
        const timeMatch = line.match(/(\d{1,2}:\d{2})/)
        const time = timeMatch ? timeMatch[1] : "12:00"
        
        allRides.push({
          ride_date: `${currentDate}T${time}:00`,
          category: company_name ? "invoiced" : CATEGORY_MAP[symbol] || "private",
          value: parseValue(values[0][1]),
          passenger_name,
          payment_method,
          company_name,
          repasse: hasRepasse,
          repasse_value,
          car_type: undefined,
          source: "notion",
          notion_id: b.id as string,
          user_id: userId,
          type: "own",
        })
      }
    }
    
    console.log("✅ Final result:", { rides: allRides.length, expenses: allExpenses.length })
    
    return NextResponse.json({ rides: allRides, expenses: allExpenses })
  } catch (error) {
    console.error("Notion API error:", error)
    return NextResponse.json({ error: "Failed to fetch from Notion" }, { status: 500 })
  }
}
