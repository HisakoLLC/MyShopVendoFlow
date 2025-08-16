"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Upload, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExpenseFormData {
  title: string
  category: string
  amount: string
  payment_method: string
  expense_date: string
  notes: string
  attachment_url: string
}

interface ExpenseFormProps {
  onExpenseAdded?: () => void
  expense?: any
  mode?: "create" | "edit"
  trigger?: React.ReactNode
}

const initialFormData: ExpenseFormData = {
  title: "",
  category: "",
  amount: "",
  payment_method: "",
  expense_date: new Date().toISOString().slice(0, 16),
  notes: "",
  attachment_url: "",
}

// Move FormContent outside the main component to prevent recreation
const FormContent = React.memo(
  ({
    formData,
    errors,
    loading,
    mode,
    onInputChange,
    onSubmit,
    onCancel,
  }: {
    formData: ExpenseFormData
    errors: Partial<ExpenseFormData>
    loading: boolean
    mode: "create" | "edit"
    onInputChange: (field: keyof ExpenseFormData, value: string) => void
    onSubmit: (e: React.FormEvent) => void
    onCancel: () => void
  }) => {
    // Categories based on the original schema - using exact values from the CHECK constraint
    const categories = [
      { value: "Utilities", label: "Utilities" },
      { value: "Supplies", label: "Supplies" },
      { value: "Rent", label: "Rent" },
      { value: "Transport", label: "Transport" },
      { value: "Other", label: "Other" },
    ]

    // Payment methods - keeping it simple with common values
    const paymentMethods = [
      { value: "Cash", label: "Cash" },
      { value: "M-Pesa", label: "M-Pesa" },
      { value: "Bank", label: "Bank Transfer" },
      { value: "Card", label: "Credit/Debit Card" },
      { value: "Cheque", label: "Cheque" },
    ]

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Expense Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Printer Ink, Delivery Fee"
              value={formData.title}
              onChange={(e) => onInputChange("title", e.target.value)}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.category} onValueChange={(value) => onInputChange("category", value)}>
              <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount (KES) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => onInputChange("amount", e.target.value)}
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.payment_method} onValueChange={(value) => onInputChange("payment_method", value)}>
              <SelectTrigger className={errors.payment_method ? "border-red-500" : ""}>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_method && <p className="text-sm text-red-500">{errors.payment_method}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="expense_date">
              Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="expense_date"
              type="datetime-local"
              value={formData.expense_date}
              onChange={(e) => onInputChange("expense_date", e.target.value)}
              className={errors.expense_date ? "border-red-500" : ""}
            />
            {errors.expense_date && <p className="text-sm text-red-500">{errors.expense_date}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about this expense..."
              value={formData.notes}
              onChange={(e) => onInputChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="attachment">Receipt Attachment (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="attachment"
                placeholder="Upload receipt image URL"
                value={formData.attachment_url}
                onChange={(e) => onInputChange("attachment_url", e.target.value)}
              />
              <Button type="button" variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">You can paste an image URL or upload a receipt photo</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} style={{ backgroundColor: "#A9E000" }} className="hover:opacity-90">
            {loading ? "Saving..." : mode === "edit" ? "Update Expense" : "Add Expense"}
          </Button>
        </div>
      </form>
    )
  },
)

FormContent.displayName = "FormContent"

export function ExpenseForm({ onExpenseAdded, expense, mode = "create", trigger }: ExpenseFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<ExpenseFormData>>({})

  const { toast } = useToast()

  // Initialize form data when expense prop changes or dialog opens
  useEffect(() => {
    if (open && expense && mode === "edit") {
      console.log("Initializing edit form with expense:", expense)

      // Format the date properly for datetime-local input
      let formattedDate = new Date().toISOString().slice(0, 16)
      if (expense.expense_date) {
        try {
          const expenseDate = new Date(expense.expense_date)
          if (!isNaN(expenseDate.getTime())) {
            formattedDate = expenseDate.toISOString().slice(0, 16)
          }
        } catch (error) {
          console.error("Error parsing expense date:", error)
        }
      }

      setFormData({
        title: expense.title || "",
        category: expense.category || "",
        amount: expense.amount?.toString() || "",
        payment_method: expense.payment_method || "",
        expense_date: formattedDate,
        notes: expense.notes || "",
        attachment_url: expense.attachment_url || "",
      })
      setErrors({})
    } else if (open && mode === "create") {
      setFormData({
        ...initialFormData,
        expense_date: new Date().toISOString().slice(0, 16),
      })
      setErrors({})
    }
  }, [expense, mode, open])

  const validateForm = (): boolean => {
    const newErrors: Partial<ExpenseFormData> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    }

    if (!formData.category) {
      newErrors.category = "Category is required"
    }

    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0"
    }

    if (!formData.payment_method) {
      newErrors.payment_method = "Payment method is required"
    }

    if (!formData.expense_date) {
      newErrors.expense_date = "Date is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChangeMemo = useCallback(
    (field: keyof ExpenseFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    },
    [errors],
  )

  const handleSubmitMemo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form",
          variant: "destructive",
        })
        return
      }

      setLoading(true)

      try {
        const url = mode === "edit" ? `/api/expenses/${expense?.id}` : "/api/expenses"
        const method = mode === "edit" ? "PUT" : "POST"

        console.log(`${mode === "edit" ? "Updating" : "Creating"} expense:`, {
          url,
          method,
          expenseId: expense?.id,
          data: formData,
        })

        const requestBody = {
          ...formData,
          amount: Number.parseFloat(formData.amount),
          recorded_by: "Admin",
        }

        console.log("Request body:", requestBody)

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        const responseData = await response.json()
        console.log("Response:", { status: response.status, data: responseData })

        if (response.ok) {
          toast({
            title: "Success",
            description: `Expense ${mode === "edit" ? "updated" : "created"} successfully`,
          })

          setOpen(false)
          onExpenseAdded?.()
        } else {
          console.error("API Error:", responseData)
          toast({
            title: "Error",
            description: responseData.error || `Failed to ${mode} expense`,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error submitting expense:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [formData, mode, expense, toast, onExpenseAdded],
  )

  const handleCancelMemo = useCallback(() => {
    setErrors({})
    setOpen(false)
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setErrors({})
    }
  }

  const defaultTrigger =
    mode === "edit" ? (
      <Button variant="outline" size="sm">
        <Edit className="mr-1 h-3 w-3" />
        Edit
      </Button>
    ) : (
      <Button style={{ backgroundColor: "#A9E000" }} className="hover:opacity-90" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add New Expense
      </Button>
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>
        <FormContent
          formData={formData}
          errors={errors}
          loading={loading}
          mode={mode}
          onInputChange={handleInputChangeMemo}
          onSubmit={handleSubmitMemo}
          onCancel={handleCancelMemo}
        />
      </DialogContent>
    </Dialog>
  )
}
