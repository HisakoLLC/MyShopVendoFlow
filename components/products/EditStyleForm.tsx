"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Package } from "lucide-react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { v4 as uuidv4 } from "uuid"
import { toast, Toaster } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { updateProductStyle } from "@/app/products/actions"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Tables } from "@/types/database"

type StyleRow = Tables<"product_styles">
type CategoryOption = { category_id: string; name: string }
type SeasonOption = { season_id: string; name: string }

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"]

function createStyleSchema(categoryIds: Set<string>, seasonIds: Set<string>) {
  return z
    .object({
      name: z
        .string()
        .min(3, "Style name must be at least 3 characters.")
        .max(100, "Style name must be 100 characters or less.")
        .trim(),
      category_id: z
        .string()
        .uuid("Invalid category.")
        .refine((id) => categoryIds.has(id), "Invalid category selected."),
      season_id: z
        .union([z.string().uuid(), z.literal("none"), z.null()])
        .optional()
        .nullable()
        .refine(
          (id) => !id || id === "none" || seasonIds.has(id as string),
          "Invalid season selected."
        ),
      description: z
        .string()
        .max(500, "Description must be 500 characters or less.")
        .trim()
        .optional()
        .nullable(),
      base_price: z.coerce
        .number({
          required_error: "Base price is required.",
          invalid_type_error: "Base price must be a number.",
        })
        .min(0.01, "Base price must be greater than 0.")
        .max(999999999, "Base price is too large."),
      cost: z.coerce
        .number({
          required_error: "Cost is required.",
          invalid_type_error: "Cost must be a number.",
        })
        .min(0.01, "Cost must be greater than 0.")
        .max(999999999, "Cost is too large."),
      image: z
        .custom<File | null>()
        .nullable()
        .optional()
        .refine(
          (file) => !file || file.size <= MAX_IMAGE_BYTES,
          "Image must be 2MB or smaller."
        )
        .refine(
          (file) => !file || ALLOWED_IMAGE_TYPES.includes(file.type),
          "Image must be PNG or JPG format."
        ),
    })
    .refine((v) => v.cost < v.base_price, {
      message: "Cost must be less than Base Price.",
      path: ["cost"],
    })
}

function formatKesInput(value: string | number) {
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""))
  if (!Number.isFinite(num) || num <= 0) return "0"
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function EditStyleForm(props: {
  styleId: string
  style: StyleRow
  categories: CategoryOption[]
  seasons: SeasonOption[]
}) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { styleId, style, categories, seasons } = props

  const categoryIds = React.useMemo(() => new Set(categories.map((c) => c.category_id)), [categories])
  const seasonIds = React.useMemo(() => new Set(seasons.map((s) => s.season_id)), [seasons])
  const schema = React.useMemo(() => createStyleSchema(categoryIds, seasonIds), [categoryIds, seasonIds])

  type FormValues = z.infer<typeof schema>

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(style.image_url ?? null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [removeImage, setRemoveImage] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: style.name ?? "",
      category_id: style.category_id ?? "",
      season_id: style.season_id ?? null,
      description: style.description ?? "",
      base_price: Number(style.base_price) || 1,
      cost: Number(style.cost) || 1,
      image: null,
    },
    mode: "onChange",
  })

  const selectedImage = form.watch("image")
  React.useEffect(() => {
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage)
      setPreviewUrl(url)
      setRemoveImage(false)
      return () => URL.revokeObjectURL(url)
    }
    if (!removeImage) setPreviewUrl(style.image_url ?? null)
  }, [selectedImage, style.image_url, removeImage])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
      if (accountIdError || !accountId) {
        throw new Error(accountIdError?.message ?? "Unable to resolve account.")
      }
      let imageUrl: string | null | undefined = undefined

      if (values.image) {
        const ext = values.image.name.split(".").pop()?.toLowerCase() || "jpg"
        const filePath = `${accountId}/${uuidv4()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, values.image, {
            cacheControl: "3600",
            upsert: false,
            contentType: values.image.type,
          })

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`)
        }

        const { data: publicData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath)

        imageUrl = publicData.publicUrl
      } else if (removeImage) {
        // Best-effort delete from storage if this was a stored object URL.
        const currentUrl = style.image_url ?? ""
        const match = currentUrl.match(/product-images\/(.+?)(\?|$)/)
        const path = match?.[1] ? decodeURIComponent(match[1]) : null
        if (path) {
          await supabase.storage.from("product-images").remove([path]).catch(() => {})
        }
        imageUrl = null
      }

      const payload: Record<string, unknown> = {
        name: values.name,
        category_id: values.category_id,
        season_id: values.season_id === "none" || !values.season_id ? null : values.season_id,
        description: values.description ?? null,
        base_price: values.base_price,
        cost: values.cost,
      }
      if (imageUrl !== undefined) {
        payload.image_url = imageUrl
      }

      await updateProductStyle(styleId, payload as any)

      toast.success("Style updated.")
      router.push("/products")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update style.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Style Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Linen Midi Dress" maxLength={100} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 w-full bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-white/20">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border border-zinc-800 text-zinc-100">
                        {categories.map((c) => (
                          <SelectItem key={c.category_id} value={c.category_id} className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-50">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="season_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Season (optional)</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-11 w-full bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-white/20">
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border border-zinc-800 text-zinc-100">
                        <SelectItem value="none" className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-50">No season</SelectItem>
                        {seasons.map((s) => (
                          <SelectItem key={s.season_id} value={s.season_id} className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-50">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes, fabric, fit, etc."
                      maxLength={500}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Base Price (KES)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        type="number"
                        min={1}
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <div className="text-xs text-zinc-500">
                      Preview: KES {formatKesInput(String(field.value ?? ""))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Cost (KES)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        type="number"
                        min={1}
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <div className="text-xs text-zinc-500">
                      Preview: KES {formatKesInput(String(field.value ?? ""))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-9 items-center justify-center rounded-sm bg-white px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-950 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => router.push("/products")}
                className="inline-flex h-9 items-center justify-center rounded-sm border border-zinc-700 bg-transparent px-5 text-xs font-semibold tracking-[0.12em] uppercase text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-sm border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Image</div>
                <button
                  type="button"
                  disabled={isSubmitting || (!style.image_url && !previewUrl) || removeImage}
                  onClick={() => {
                    setRemoveImage(true)
                    form.setValue("image", null, { shouldValidate: true })
                    setPreviewUrl(null)
                  }}
                  className="inline-flex h-7 items-center justify-center rounded-sm border border-zinc-700 bg-transparent px-3 text-xs font-semibold uppercase text-zinc-400 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Remove image
                </button>
              </div>
              <div className="mt-3 overflow-hidden rounded-md bg-zinc-800 flex items-center justify-center aspect-square w-full">
                {previewUrl ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={previewUrl}
                      alt="Style image"
                      fill
                      className="object-cover"
                      unoptimized={
                        !previewUrl ||
                        previewUrl.startsWith("blob:") ||
                        previewUrl.startsWith("http")
                      }
                    />
                  </div>
                ) : (
                  <Package className="h-12 w-12 text-zinc-700" />
                )}
              </div>

              <div className="mt-3">
                <FormField
                  control={form.control}
                  name="image"
                  render={() => (
                    <FormItem>
                      <FormLabel className="sr-only">Change image (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-500 h-9 px-3 w-full file:hidden cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            if (file) {
                              if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                                form.setError("image", {
                                  type: "manual",
                                  message: "Image must be PNG or JPG format.",
                                })
                                return
                              }
                              if (file.size > MAX_IMAGE_BYTES) {
                                form.setError("image", {
                                  type: "manual",
                                  message: "Image must be 2MB or smaller.",
                                })
                                return
                              }
                            }
                            form.setValue("image", file, { shouldValidate: true })
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="mt-1 text-xs text-zinc-600">
                        PNG/JPG only. Max 2MB. Leave empty to keep current image.
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </form>
      </Form>
    </>
  )
}
