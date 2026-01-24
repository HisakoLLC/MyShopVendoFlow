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
import { Checkbox } from "@/components/ui/checkbox"
import { createStore, updateStore, type CreateStoreData, type UpdateStoreData } from "./actions"

const storeSchema = z.object({
  name: z.string().min(1, "Store name is required.").max(200, "Name is too long."),
  address: z.string().max(500, "Address is too long.").optional(),
  tax_rate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative.")
    .max(100, "Tax rate cannot exceed 100%.")
    .optional(),
  timezone: z.string().max(100, "Timezone is too long.").optional(),
  active: z.boolean().optional(),
})

type StoreFormValues = z.infer<typeof storeSchema>

type Store = {
  store_id: string
  name: string
  address: string | null
  tax_rate: number | null
  timezone: string | null
  active: boolean | null
}

type StoreFormModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  store?: Store | null
}

// Common timezones
const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
]

export function StoreFormModal({ open, onClose, onSuccess, store }: StoreFormModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const isEditing = !!store

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: store?.name || "",
      address: store?.address || "",
      tax_rate: store?.tax_rate ?? undefined,
      timezone: store?.timezone || "",
      active: store?.active ?? true,
    },
    mode: "onChange",
  })

  // Reset form when store changes
  React.useEffect(() => {
    if (store) {
      form.reset({
        name: store.name,
        address: store.address || "",
        tax_rate: store.tax_rate ?? undefined,
        timezone: store.timezone || "",
        active: store.active ?? true,
      })
    } else {
      form.reset({
        name: "",
        address: "",
        tax_rate: undefined,
        timezone: "",
        active: true,
      })
    }
  }, [store, form])

  const onSubmit = async (values: StoreFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEditing && store) {
        const data: UpdateStoreData = {
          store_id: store.store_id,
          name: values.name,
          address: values.address || undefined,
          tax_rate: values.tax_rate,
          timezone: values.timezone || undefined,
          active: values.active,
        }
        await updateStore(data)
        toast.success("Store updated successfully!")
      } else {
        const data: CreateStoreData = {
          name: values.name,
          address: values.address || undefined,
          tax_rate: values.tax_rate,
          timezone: values.timezone || undefined,
          active: values.active,
        }
        await createStore(data)
        toast.success("Store created successfully!")
      }
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save store.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Store" : "Add New Store"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update store information and settings."
              : "Create a new store location for your business."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Main St, City, State ZIP"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="16.00"
                        {...field}
                        value={field.value === undefined || field.value === null ? "" : field.value}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value === "" ? undefined : value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-2 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-100/10"
                      >
                        <option value="">Select timezone...</option>
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Active stores are available in POS and reports
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update Store" : "Create Store"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
