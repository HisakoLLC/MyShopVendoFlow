"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { v4 as uuidv4 } from "uuid"
import { toast, Toaster } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { createProductStyle } from "@/app/products/actions"
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

type CategoryOption = { category_id: string; name: string }
type SeasonOption = { season_id: string; name: string }

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"]

function createStyleSchema(categoryIds: Set<string>) {
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
      season_name: z
        .string()
        .max(100, "Season must be 100 characters or less.")
        .trim()
        .optional()
        .nullable(),
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

export function CreateStyleForm(props: {
  categories: CategoryOption[]
  seasons: SeasonOption[]
}) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const categoryIds = React.useMemo(() => new Set(props.categories.map((c) => c.category_id)), [props.categories])

  const schema = React.useMemo(() => createStyleSchema(categoryIds), [categoryIds])

  type CreateStyleValues = z.infer<typeof schema>

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<CreateStyleValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category_id: "",
      season_name: "",
      description: "",
      base_price: 1,
      cost: 1,
      image: null,
    },
    mode: "onChange",
  })

  const selectedImage = form.watch("image")
  React.useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(selectedImage)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedImage])

  async function onSubmit(values: CreateStyleValues) {
    setIsSubmitting(true)
    try {
      // Resolve account id for storage upload
      const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
      if (accountIdError || !accountId) {
        throw new Error(accountIdError?.message ?? "Unable to resolve account.")
      }

      let imageUrl = "/placeholder-product.png"

      // Upload image to Supabase Storage if provided
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
      }

      // Use server action for validation and insertion
      const { style_id } = await createProductStyle({
        name: values.name,
        category_id: values.category_id,
        season_name: values.season_name?.trim() || null,
        description: values.description ?? null,
        base_price: values.base_price,
        cost: values.cost,
        image_url: imageUrl,
      })

      toast.success("Style created successfully!")
      router.push(`/products/${style_id}/variants`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create style.")
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
                  <FormLabel>Style Name</FormLabel>
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
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {props.categories.map((c) => (
                          <SelectItem key={c.category_id} value={c.category_id}>
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
                name="season_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Fall 2025, Summer, SS24"
                        maxLength={100}
                        className="h-11"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
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
                  <FormLabel>Description (optional)</FormLabel>
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
                    <FormLabel>Base Price (KES)</FormLabel>
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
                    <FormLabel>Cost (KES)</FormLabel>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Style"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => router.push("/products")}
              >
                Cancel
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Image
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="relative aspect-square w-full">
                  <Image
                    src={previewUrl ?? "/placeholder-product.png"}
                    alt="Style image preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="mt-3">
                <FormField
                  control={form.control}
                  name="image"
                  render={() => (
                    <FormItem>
                      <FormLabel className="sr-only">Image Upload</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            if (file) {
                              // Validate file type immediately
                              if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                                form.setError("image", {
                                  type: "manual",
                                  message: "Image must be PNG or JPG format.",
                                })
                                return
                              }
                              // Validate file size immediately
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
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        PNG/JPG only. Max 2MB.
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

