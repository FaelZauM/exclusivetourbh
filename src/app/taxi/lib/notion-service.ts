"use client"

import { getSupabase } from "./supabase"

const NOTION_PAGE_ID = "2c3a6544942080c4b94fd6fc11ed9e15"

interface NotionRide {
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
  type: string
}

interface NotionExpense {
  fuel_date: string
  total_value: number
  source: "notion"
  notion_id: string
  user_id: string
}

export async function importAllNotionData(
  pageId: string,
  userId: string,
  month?: number
): Promise<{ ridesImported: number; expensesImported: number }> {
  // Fetch data from our API route
  const response = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageId, userId, month }),
  })
  
  if (!response.ok) {
    throw new Error("Failed to fetch from Notion API")
  }
  
  const { rides, expenses } = await response.json()
  
  let ridesImported = 0
  let expensesImported = 0
  
  // Import rides
  for (const ride of rides as NotionRide[]) {
    const { error } = await getSupabase()
      .from("rides")
      .upsert(ride, { onConflict: "notion_id" })
    
    if (!error) ridesImported++
  }
  
  // Import expenses (fuel)
  for (const expense of expenses as NotionExpense[]) {
    const { error } = await getSupabase()
      .from("fuel")
      .upsert(expense, { onConflict: "notion_id" })
    
    if (!error) expensesImported++
  }
  
  return { ridesImported, expensesImported }
}

