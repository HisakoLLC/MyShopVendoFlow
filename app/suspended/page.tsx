import * as React from "react"
import { getSuspensionData } from "./actions"
import { SuspendedContent } from "./SuspendedContent"

export default async function SuspendedPage() {
  const data = await getSuspensionData()

  return (
    <SuspendedContent initialData={data} />
  )
}
