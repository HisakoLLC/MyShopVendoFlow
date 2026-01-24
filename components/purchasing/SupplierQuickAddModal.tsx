"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { createSupplier, type CreateSupplierData } from "@/app/purchasing/actions"

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required.").max(200, "Name is too long."),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
  phone: z.string().max(50, "Phone number is too long.").optional(),
  payment_terms: z.string().max(200, "Payment terms are too long.").optional(),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

type SupplierQuickAddModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: (supplier: { supplier_id: string; name: string }) => void
}

export function SupplierQuickAddModal({
  open,
  onClose,
  onSuccess,
}: SupplierQuickAddModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      payment_terms: "",
    },
    mode: "onChange",
  })

  const onSubmit = async (values: SupplierFormValues) => {
    setIsSubmitting(true)
    try {
      const data: CreateSupplierData = {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        payment_terms: values.payment_terms || null,
      }

      const supplier = await createSupplier(data)
      toast.success("Supplier added successfully!")
      form.reset()
      onSuccess(supplier)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add supplier.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>Add a new supplier to your vendor list.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="supplier@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Net 30, COD, 2/10 Net 30"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
