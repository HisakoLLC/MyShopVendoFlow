import { ProductsList } from "./products-list"

export function InventoryContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Inventory</h1>
      <ProductsList />
    </div>
  )
}
