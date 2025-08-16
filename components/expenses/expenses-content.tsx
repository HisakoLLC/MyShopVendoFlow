"use client"

import { useState, useCallback } from "react"
import { ExpenseSummary } from "./expense-summary"
import { ExpenseTable } from "./expense-table"
import { ExpenseForm } from "./expense-form"

export function ExpensesContent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleExpenseChange = useCallback(() => {
    console.log("ExpensesContent: Expense changed, incrementing refresh trigger...")
    setRefreshTrigger((prev) => {
      const newValue = prev + 1
      console.log("ExpensesContent: New refresh trigger value:", newValue)
      return newValue
    })
  }, [])

  console.log("ExpensesContent: Rendering with refreshTrigger:", refreshTrigger)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track and manage your business expenses</p>
        </div>
        <ExpenseForm onExpenseAdded={handleExpenseChange} />
      </div>

      <ExpenseSummary refreshTrigger={refreshTrigger} />

      <ExpenseTable refreshTrigger={refreshTrigger} onExpenseUpdated={handleExpenseChange} />
    </div>
  )
}

export default ExpensesContent
