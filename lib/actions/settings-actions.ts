"use server"

export type StoreInfo = {
  name: string
  address: string
  phone: string
  email: string
}

// Hardcoded store info - no database fetching
export async function getStoreSettings(): Promise<StoreInfo> {
  // Return hardcoded values directly without trying to fetch from database
  return {
    name: "AQSS Flow Limited",
    address: "Eastleigh, Nairobi",
    phone: "Phone: +254799964646",
    email: "Email: aqssflow@gmail.com",
  }
}

// Stub function that just returns success without doing anything
export async function updateStoreSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  console.log(`Setting update requested but disabled: ${key} = ${value}`)
  return { success: true }
}
