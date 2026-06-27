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
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-sans text-xl font-bold tracking-tight text-foreground mb-1">
            Receipt Customization
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Configure how your printed and digital receipts look for your customers.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="logo_on_receipt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-accent/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold text-foreground">Logo on Receipt</FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        Display your business logo at the top of receipts
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                        className="data-[state=checked]:bg-[#E8400C]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Currency
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "KES"}>
                      <FormControl>
                        <SelectTrigger className="bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 w-full focus:ring-1 focus:ring-[#E8400C]">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border border-border text-foreground">
                        {CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="focus:bg-accent focus:text-foreground">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-muted-foreground mt-1">Used on receipts and across the app</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_inclusive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-accent/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold text-foreground">Tax inclusive of price</FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        When on, displayed prices include tax; when off, tax is added on top
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                        className="data-[state=checked]:bg-[#E8400C]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt_header"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Header Text
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Thank you for shopping with us!"
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        className="bg-background border border-border rounded-md text-sm text-foreground px-3 py-2 w-full placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] min-h-[80px]"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground mt-1">Text displayed at the top of the receipt</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt_footer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Footer Text
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Returns within 30 days with receipt"
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        className="bg-background border border-border rounded-md text-sm text-foreground px-3 py-2 w-full placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] min-h-[80px]"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground mt-1">Text displayed at the bottom of the receipt</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="return_policy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Return Policy
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Items can be returned within 30 days of purchase with original receipt..."
                        rows={4}
                        {...field}
                        value={field.value || ""}
                        className="bg-background border border-border rounded-md text-sm text-foreground px-3 py-2 w-full placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] min-h-[100px]"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground mt-1">Detailed return policy text</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#E8400C] text-white hover:bg-[#c73508] rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors border-none"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Receipt Preview */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-6 font-sans text-xl font-bold tracking-tight text-foreground">
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
