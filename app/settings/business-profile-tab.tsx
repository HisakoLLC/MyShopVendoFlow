"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Upload, X } from "lucide-react"

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
import { StorageImage } from "@/components/StorageImage"
import { updateBusinessProfile, uploadLogo } from "./actions"
import { Toaster } from "sonner"

const businessProfileSchema = z.object({
  business_name: z.string().min(1, "Business name is required.").max(200),
  business_address: z.string().max(500).optional(),
  business_phone: z.string().max(50).optional(),
  tax_id: z.string().max(100).optional(),
})

type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>

type Account = {
  account_id: string
  business_name: string
}

type BusinessSettings = {
  logo_url: string | null
  business_address: string | null
  business_phone: string | null
  tax_id: string | null
}

type BusinessProfileTabProps = {
  account: Account
  businessSettings: BusinessSettings | null
}

export function BusinessProfileTab({ account, businessSettings }: BusinessProfileTabProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [logoUrl, setLogoUrl] = React.useState<string | null>(businessSettings?.logo_url || null)
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      business_name: account.business_name || "",
      business_address: businessSettings?.business_address || "",
      business_phone: businessSettings?.business_phone || "",
      tax_id: businessSettings?.tax_id || "",
    },
    mode: "onChange",
  })

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (200KB max)
    if (file.size > 200 * 1024) {
      toast.error("File size must be less than 200KB.")
      return
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg"]
    if (!validTypes.includes(file.type)) {
      toast.error("File must be PNG or JPG.")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadLogo(formData)
      setLogoUrl(result.logo_url)
      toast.success("Logo uploaded successfully!")
      // Refresh to get updated settings
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload logo.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl(null)
    toast.success("Logo removed.")
  }

  const onSubmit = async (values: BusinessProfileFormValues) => {
    setIsSubmitting(true)
    try {
      await updateBusinessProfile(values)
      toast.success("Business profile updated successfully!")
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update business profile.")
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="rounded-lg border border-zinc-200 bg-background-card-light p-6 dark:border-border-dark dark:bg-background-card-dark">
        <h2 className="mb-6 font-editorial text-xl font-bold text-zinc-50">
          Business Profile
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <FormLabel>Business Logo</FormLabel>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative">
                    <StorageImage
                      src={logoUrl}
                      alt="Business logo"
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700">
                    <Upload className="h-8 w-8 text-zinc-400" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Max 200KB, PNG or JPG
                  </p>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="My Fashion Boutique" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Main Street, Nairobi, Kenya"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="business_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+254 700 000 000" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="P051234567K" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  )
}
