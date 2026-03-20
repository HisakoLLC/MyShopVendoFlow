"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { updateReceiptSettings } from "./actions"
import { Toaster } from "sonner"
import { ReceiptPreview } from "./receipt-preview"
import { CURRENCY_OPTIONS } from "@/lib/format-currency"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type BusinessSettings = {
  logo_url: string | null
  logo_on_receipt: boolean | null
  receipt_header: string | null
  receipt_footer: string | null
  return_policy: string | null
  currency: string | null
  tax_inclusive: boolean | null
}

type ReceiptCustomizationTabProps = {
  businessSettings: BusinessSettings | null
  businessName: string
}

const receiptSettingsSchema = z.object({
  logo_on_receipt: z.boolean().optional(),
  receipt_header: z.string().max(500).optional(),
  receipt_footer: z.string().max(500).optional(),
  return_policy: z.string().max(1000).optional(),
  currency: z.string().min(1).optional(),
  tax_inclusive: z.boolean().optional(),
})

type ReceiptFormValues = z.infer<typeof receiptSettingsSchema>

export function ReceiptCustomizationTab({
  businessSettings,
  businessName,
}: ReceiptCustomizationTabProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSettingsSchema),
    defaultValues: {
      logo_on_receipt: businessSettings?.logo_on_receipt ?? false,
      receipt_header: businessSettings?.receipt_header || "",
      receipt_footer: businessSettings?.receipt_footer || "",
      return_policy: businessSettings?.return_policy || "",
      currency: businessSettings?.currency || "KES",
      tax_inclusive: businessSettings?.tax_inclusive ?? false,
    },
    mode: "onChange",
  })

  const watchedValues = form.watch()

  const onSubmit = async (values: ReceiptFormValues) => {
    setIsSubmitting(true)
    try {
      await updateReceiptSettings({
        ...values,
        logo_url: businessSettings?.logo_url || undefined,
        currency: values.currency || "KES",
        tax_inclusive: values.tax_inclusive ?? false,
      })
      toast.success("Receipt settings updated successfully!")
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update receipt settings.")
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Customization Form */}
        <div className="rounded-lg border border-zinc-200 bg-background-card-light p-6 dark:border-border-dark dark:bg-background-card-dark">
          <h2 className="mb-6 font-editorial text-xl font-bold text-zinc-50">
            Receipt Customization
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="logo_on_receipt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Logo on Receipt</FormLabel>
                      <FormDescription>
                        Display your business logo at the top of receipts
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "KES"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Used on receipts and across the app</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_inclusive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Tax inclusive of price</FormLabel>
                      <FormDescription>
                        When on, displayed prices include tax; when off, tax is added on top
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt_header"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Header Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Thank you for shopping with us!"
                        rows={3}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>Text displayed at the top of the receipt</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt_footer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Footer Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Returns within 30 days with receipt"
                        rows={3}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>Text displayed at the bottom of the receipt</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="return_policy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Return Policy</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Items can be returned within 30 days of purchase with original receipt..."
                        rows={4}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>Detailed return policy text</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Receipt Preview */}
        <div className="rounded-lg border border-zinc-200 bg-background-card-light p-6 dark:border-border-dark dark:bg-background-card-dark">
          <h2 className="mb-6 font-editorial text-xl font-bold text-zinc-50">
            Receipt Preview
          </h2>
          <ReceiptPreview
            businessName={businessName}
            logoUrl={watchedValues.logo_on_receipt ? businessSettings?.logo_url || null : null}
            header={watchedValues.receipt_header || ""}
            footer={watchedValues.receipt_footer || ""}
            returnPolicy={watchedValues.return_policy || ""}
          />
        </div>
      </div>
    </>
  )
}
