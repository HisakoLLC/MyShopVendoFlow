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
import { Button } from "@/components/ui/button"
import { createCustomer, updateCustomer, type CreateCustomerData, type UpdateCustomerData } from "./actions"

const customerSchema = z
  .object({
    first_name: z.string().max(100, "First name is too long.").optional(),
    last_name: z.string().max(100, "Last name is too long.").optional(),
    email: z.string().email("Invalid email address.").max(200, "Email is too long.").optional(),
    phone: z.string().max(50, "Phone number is too long.").optional(),
  })
  .refine((data) => data.email?.trim() || data.phone?.trim(), {
    message: "At least email or phone is required.",
    path: ["email"],
  })

type CustomerFormValues = z.infer<typeof customerSchema>

type Customer = {
  customer_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  is_vip: boolean | null
  total_spend: number | null
  transaction_count: number | null
  first_purchase_date: string | null
  last_purchase_date: string | null
  notes: string | null
}

type AddCustomerModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  customer?: Customer | null
}

export function AddCustomerModal({
  open,
  onClose,
  onSuccess,
  customer,
}: AddCustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const isEditing = !!customer

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: customer?.first_name || "",
      last_name: customer?.last_name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
    },
    mode: "onChange",
  })

  // Reset form when customer changes
  React.useEffect(() => {
    if (customer) {
      form.reset({
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
      })
    } else {
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
      })
    }
  }, [customer, form])

  const onSubmit = async (values: CustomerFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEditing && customer) {
        const data: UpdateCustomerData = {
          customer_id: customer.customer_id,
          first_name: values.first_name || undefined,
          last_name: values.last_name || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
        }
        await updateCustomer(data)
        toast.success("Customer updated successfully!")
      } else {
        const data: CreateCustomerData = {
          first_name: values.first_name || undefined,
          last_name: values.last_name || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
        }
        await createCustomer(data)
        toast.success("Customer added successfully!")
      }
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save customer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="font-editorial text-xl font-bold text-zinc-50">{isEditing ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isEditing
              ? "Update customer information."
              : "Add a new customer to your database."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm" />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">
                    At least email or phone is required
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+254 700 000 000" {...field} className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 mt-6">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-100">
                {isSubmitting ? "Saving..." : isEditing ? "Update Customer" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
