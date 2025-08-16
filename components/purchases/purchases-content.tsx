import { PurchasesList } from "./purchases-list"

export function PurchasesContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Purchases</h1>
      <PurchasesList />
    </div>
  )
}
