"use server"

import { seedDemoData } from "@/scripts/seed-demo-data"

export async function loadDemoData(accountId: string, storeId: string) {
  try {
    const result = await seedDemoData(accountId, storeId)
    return result
  } catch (error) {
    throw new Error(
      `Failed to load demo data: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
