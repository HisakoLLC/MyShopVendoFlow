import { SaleEditForm } from "@/components/sales/sale-edit-form"
import { GoBack } from "@/components/go-back"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <GoBack fallbackPath="/sales" />
        <h1 className="text-3xl font-bold tracking-tight ml-4">Edit Sale</h1>
      </div>
      <SaleEditForm saleId={id} />
    </div>
  )
}
