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
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-6 mb-6">
        <h2 className="font-editorial text-xl font-bold text-zinc-50 mb-1">
          Business Profile
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Manage your public business information and branding.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-4">
              <label className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">
                Business Logo
              </label>
              <div className="flex items-center gap-6">
                {logoUrl ? (
                  <div className="relative">
                    <StorageImage
                      src={logoUrl}
                      alt="Business logo"
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-md object-cover bg-zinc-800"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-sm p-0 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex w-16 h-16 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700/50">
                    <Upload className="h-6 w-6 text-zinc-500" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent"
                  >
                    {isUploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-zinc-500 mt-1">
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
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">
                    Business Name <span className="text-red-400">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="My Fashion Boutique" 
                      {...field} 
                      className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 px-3 py-2 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 h-9"
                    />
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
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">
                    Business Address
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Main Street, Nairobi, Kenya"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 px-3 py-2 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="business_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">
                      Business Phone
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="+254 700 000 000" 
                        {...field} 
                        value={field.value || ""} 
                        className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                      />
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
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">
                      Tax ID
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="P051234567K" 
                        {...field} 
                        value={field.value || ""} 
                        className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  )
}
