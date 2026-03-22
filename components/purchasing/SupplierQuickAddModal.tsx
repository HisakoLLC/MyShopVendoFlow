"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { createSupplier, updateSupplier, type CreateSupplierData } from "@/app/purchasing/actions"

type Supplier = {
  supplier_id: string
  name: string
  email?: string | null
  phone?: string | null
  payment_terms?: string | null
}

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
  supplier?: Supplier // Optional for edit mode
}

export function SupplierQuickAddModal({
  open,
  onClose,
  onSuccess,
  supplier,
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

  // Reset form when supplier changes or modal opens
  React.useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          name: supplier.name,
          email: supplier.email || "",
          phone: supplier.phone || "",
          payment_terms: supplier.payment_terms || "",
        })
      } else {
        form.reset({
          name: "",
          email: "",
          phone: "",
          payment_terms: "",
        })
      }
    }
  }, [open, supplier, form])

  const onSubmit = async (values: SupplierFormValues) => {
    setIsSubmitting(true)
    try {
      const data: CreateSupplierData = {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        payment_terms: values.payment_terms || null,
      }

      let result
      if (supplier) {
        result = await updateSupplier(supplier.supplier_id, data)
        toast.success("Supplier updated successfully!")
      } else {
        result = await createSupplier(data)
        toast.success("Supplier added successfully!")
      }
      
      form.reset()
      onSuccess(result)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save supplier.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        overlayClassName="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg p-0 [&>button]:hidden"
      >
        <DialogHeader className="px-6 py-5 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0 text-left">
          <div className="flex flex-col">
            <DialogTitle className="font-editorial text-lg font-bold text-zinc-50">
              {supplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400 mt-1">
              {supplier ? "Update supplier contact information." : "Add a new supplier to your vendor list."}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button className="w-8 h-8 rounded-sm hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogClose>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <div className="px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-1.5 block">Supplier Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter supplier name" 
                        className="bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 h-9 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400 mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-1.5 block">Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="supplier@example.com" 
                        className="bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 h-9 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400 mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-1.5 block">Phone</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="+1 (555) 123-4567" 
                        className="bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 h-9 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400 mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 mb-1.5 block">Payment Terms</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Net 30, COD, 2/10 Net 30"
                        className="bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 min-h-[80px] px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400 mt-1" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="px-6 py-4 border-t border-zinc-800 flex flex-row gap-3 justify-end sm:justify-end space-x-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isSubmitting}
                className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold uppercase tracking-[0.12em] bg-transparent"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold uppercase tracking-[0.12em] border-none"
              >
                {isSubmitting ? "Saving..." : supplier ? "Update Supplier" : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
