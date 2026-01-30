"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { AlertCircle, ArrowRight, ImagePlus } from "lucide-react"

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
import { cn } from "@/lib/utils"

type CategoryOption = { category_id: string; name: string }
type SeasonOption = { season_id: string; name: string }

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"]
const DESCRIPTION_MAX = 500

function createStyleSchema(categoryIds: Set<string>, seasonIds: Set<string>) {
  return z
    .object({
      name: z
        .string()
        .min(3, "Product name must be at least 3 characters.")
        .max(100, "Product name must be 100 characters or less.")
        .trim(),
      category_id: z
        .string()
        .min(1, "Category is required.")
        .refine((id) => categoryIds.has(id), "Please select a valid category."),
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
        .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or less.`)
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
      message: "Cost must be less than base price.",
      path: ["cost"],
    })
}

function marginPercent(basePrice: number, cost: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0
  return ((basePrice - cost) / basePrice) * 100
}

export function CreateStyleForm(props: {
  categories: CategoryOption[]
  seasons: SeasonOption[]
}) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const categoryIds = React.useMemo(() => new Set(props.categories.map((c) => c.category_id)), [props.categories])
  const seasonIds = React.useMemo(() => new Set(props.seasons.map((s) => s.season_id)), [props.seasons])
  const schema = React.useMemo(() => createStyleSchema(categoryIds, seasonIds), [categoryIds, seasonIds])

  type CreateStyleValues = z.infer<typeof schema>

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)

  const form = useForm<CreateStyleValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category_id: "",
      season_id: null,
      description: "",
      base_price: undefined as unknown as number,
      cost: undefined as unknown as number,
      image: null,
    },
    mode: "onBlur",
  })

  const name = form.watch("name")
  const basePrice = form.watch("base_price")
  const cost = form.watch("cost")
  const description = form.watch("description")
  const selectedImage = form.watch("image")

  const margin = React.useMemo(() => {
    const b = Number(basePrice)
    const c = Number(cost)
    if (!Number.isFinite(b) || b <= 0) return null
    return marginPercent(b, c)
  }, [basePrice, cost])

  const marginColorClass =
    margin == null
      ? "text-slate-500"
      : margin >= 40
        ? "text-success-600 dark:text-success-400"
        : margin >= 25
          ? "text-warning-600 dark:text-warning-500"
          : "text-danger-600 dark:text-danger-400"

  React.useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(selectedImage)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedImage])

  const isValid =
    !!name?.trim() &&
    !!form.watch("category_id") &&
    Number(basePrice) > 0 &&
    Number(cost) > 0 &&
    Number(cost) < Number(basePrice)

  async function onSubmit(values: CreateStyleValues) {
    setIsSubmitting(true)
    try {
      const { data: accountId, error: accountIdError } = await supabase.rpc("get_account_id")
      if (accountIdError || !accountId) {
        throw new Error(accountIdError?.message ?? "Unable to resolve account.")
      }

      let imageUrl = "/placeholder-product.png"

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

      const { style_id } = await createProductStyle({
        name: values.name,
        category_id: values.category_id,
        season_id: values.season_id === "none" || !values.season_id ? null : values.season_id,
        description: values.description ?? null,
        base_price: values.base_price,
        cost: values.cost,
        image_url: imageUrl,
      })

      toast.success("Product created successfully!")
      router.push(`/products/${style_id}/variants`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create product.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleFileSelect(file: File | null) {
    if (!file) {
      form.setValue("image", null, { shouldValidate: true })
      return
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      form.setError("image", { message: "Image must be PNG or JPG format." })
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      form.setError("image", { message: "Image must be 2MB or smaller." })
      return
    }
    form.clearErrors("image")
    form.setValue("image", file, { shouldValidate: true })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="relative">
        {isSubmitting && (
          <div
            className="absolute inset-0 z-10 rounded-xl bg-white/60 backdrop-blur-[2px] dark:bg-slate-900/60"
            aria-hidden
          />
        )}

        {/* Section 1: Basic Information */}
        <section className="mb-6 rounded-lg bg-slate-50 p-6 dark:bg-slate-900/50">
          <h2 className="mb-4 border-l-4 border-primary-600 pl-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Basic Information
          </h2>

          <FormField
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <FormItem className="mb-4">
                <FormLabel className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Product Name <span className="text-danger-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Oversized Linen Shirt"
                    className={cn(
                      "h-11 rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-primary-500 dark:focus:ring-primary-500",
                      fieldState.error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500 dark:border-danger-500"
                    )}
                    maxLength={100}
                    aria-required
                    aria-describedby={fieldState.error ? "name-error" : "name-helper"}
                  />
                </FormControl>
                <p id="name-helper" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  This will be visible to customers
                </p>
                {fieldState.error && (
                  <p id="name-error" className="mt-1 flex items-center gap-1.5 text-sm text-danger-600 dark:text-danger-400" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {fieldState.error.message}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Category <span className="text-danger-500">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          "h-11 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900",
                          fieldState.error && "border-danger-500"
                        )}
                        aria-required
                      >
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {props.categories.map((c) => (
                        <SelectItem key={c.category_id} value={c.category_id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-danger-600 dark:text-danger-400" role="alert">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {fieldState.error.message}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="season_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Season
                  </FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          "h-11 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900",
                          fieldState.error && "border-danger-500"
                        )}
                      >
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No season</SelectItem>
                      {props.seasons.map((s) => (
                        <SelectItem key={s.season_id} value={s.season_id}>
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
              <FormItem className="mt-4">
                <FormLabel className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Description
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Describe this product..."
                      maxLength={DESCRIPTION_MAX}
                      rows={4}
                      className="rounded-lg border-slate-300 pr-14 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                      aria-describedby="description-counter"
                    />
                    <span
                      id="description-counter"
                      className="absolute bottom-3 right-3 text-xs text-slate-500 dark:text-slate-400"
                    >
                      {(field.value ?? "").length}/{DESCRIPTION_MAX}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Section 2: Pricing */}
        <section className="mb-6 rounded-lg bg-slate-50 p-6 dark:bg-slate-900/50">
          <h2 className="mb-4 border-l-4 border-primary-600 pl-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Pricing
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="base_price"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Base Price (KES) <span className="text-danger-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                        KES
                      </span>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        placeholder="0.00"
                        className={cn(
                          "h-11 rounded-lg border-slate-300 pl-12 text-lg focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-primary-500 dark:focus:ring-primary-500",
                          fieldState.error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500 dark:border-danger-500"
                        )}
                        aria-required
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Cost (KES) <span className="text-danger-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                        KES
                      </span>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        placeholder="0.00"
                        className={cn(
                          "h-11 rounded-lg border-slate-300 pl-12 text-lg focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-primary-500 dark:focus:ring-primary-500",
                          fieldState.error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500 dark:border-danger-500"
                        )}
                        aria-required
                        aria-describedby={fieldState.error ? "cost-error" : "cost-helper"}
                      />
                    </div>
                  </FormControl>
                  <p id="cost-helper" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Your cost from supplier
                  </p>
                  {fieldState.error && (
                    <p id="cost-error" className="mt-1 flex items-center gap-1.5 text-sm text-danger-600 dark:text-danger-400" role="alert">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {fieldState.error.message}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Calculated Margin */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Calculated Margin</p>
            <p className={cn("mt-1 text-2xl font-bold", marginColorClass)}>
              {margin != null ? `${margin.toFixed(1)}%` : "—"}
            </p>
          </div>
        </section>

        {/* Section 3: Product Image */}
        <section className="mb-6 rounded-lg bg-slate-50 p-6 dark:bg-slate-900/50">
          <h2 className="mb-4 border-l-4 border-primary-600 pl-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Product Image
          </h2>

          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Product image</FormLabel>
                <FormControl>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="sr-only"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                    aria-describedby="image-helper"
                  />
                </FormControl>

                {previewUrl ? (
                  <div className="space-y-3">
                    <div className="relative h-[200px] w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      <Image
                        src={previewUrl}
                        alt="Product preview"
                        fill
                        className="object-cover"
                      />
                      {isSubmitting && (
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/90 dark:bg-slate-900/90"
                          aria-live="polite"
                        >
                          <div className="h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className="h-full w-2/5 animate-pulse rounded-full bg-primary-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Uploading…
                          </span>
                        </div>
                      )}
                    </div>
                    {!isSubmitting && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:hover:bg-danger-950/30 dark:hover:text-danger-400"
                          onClick={() => handleFileSelect(null)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ) : isSubmitting ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 dark:border-slate-600 dark:bg-slate-900"
                    aria-live="polite"
                  >
                    <div className="mb-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-primary-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Saving…
                    </p>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      const file = e.dataTransfer.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 transition-colors dark:border-slate-600 dark:bg-slate-900",
                      isDragging && "border-primary-400 bg-primary-50 dark:bg-primary-950/30",
                      !isDragging && "hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/20"
                    )}
                  >
                    <ImagePlus className="mb-2 h-12 w-12 text-slate-400 dark:text-slate-500" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Click to upload or drag and drop
                    </p>
                    <p id="image-helper" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      PNG, JPG up to 2MB
                    </p>
                  </div>
                )}

                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Form actions: sticky on mobile, inline on desktop */}
        <div className="sticky bottom-0 left-0 right-0 z-20 -mx-8 -mb-8 mt-8 flex flex-col-reverse gap-4 border-t border-slate-200 bg-white px-8 pb-6 pt-6 dark:border-slate-800 dark:bg-slate-900 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:justify-between sm:items-center sm:pb-0">
          <Button
            type="button"
            variant="outline"
            className="h-12 px-6 text-slate-700 dark:text-slate-300"
            disabled={isSubmitting}
            onClick={() => router.push("/products")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className={cn(
              "h-12 gap-2 px-8 text-lg bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700",
              (!isValid || isSubmitting) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                Next: Add Variants
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
