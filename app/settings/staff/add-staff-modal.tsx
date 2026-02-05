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
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createStaff, type CreateStaffData } from "./actions"

// Single store per account: no store selection; server assigns the account's store
const staffSchema = z.object({
  first_name: z.string().min(1, "First name is required.").max(100, "First name is too long."),
  last_name: z.string().min(1, "Last name is required.").max(100, "Last name is too long."),
  email: z.string().email("Invalid email address.").max(200, "Email is too long."),
  role: z.enum(["cashier", "manager", "owner"], {
    errorMap: () => ({ message: "Role must be cashier, manager, or owner." }),
  }),
  generate_pin: z.boolean().optional(),
})

type StaffFormValues = z.infer<typeof staffSchema>

type Store = {
  store_id: string
  name: string
}

type NewStaffForList = {
  staff_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  assigned_store_id: string | null
  active: boolean | null
  has_pin: boolean
  last_login_at: string | null
  stores: { name: string } | null
}

type AddStaffModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: (newStaff?: NewStaffForList) => void
  stores: Store[]
}

export function AddStaffModal({ open, onClose, onSuccess, stores }: AddStaffModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [generatedPIN, setGeneratedPIN] = React.useState<string | null>(null)

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      role: "cashier",
      generate_pin: false,
    },
    mode: "onChange",
  })

  const watchedGeneratePIN = form.watch("generate_pin")

  const onSubmit = async (values: StaffFormValues) => {
    setIsSubmitting(true)
    try {
      const data: CreateStaffData = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        role: values.role,
        generate_pin: values.generate_pin,
      }

      const result = await createStaff(data)
      if (result.pin) {
        setGeneratedPIN(result.pin)
      }
      toast.success(`Staff created. ${result.pin ? "Share the PIN with them." : ""}`)
      setIsSubmitting(false)
      form.reset()
      const store = stores[0] ?? null
      const newStaff: NewStaffForList = {
        staff_id: result.staff_id,
        email: result.email,
        first_name: values.first_name.trim() || null,
        last_name: values.last_name.trim() || null,
        role: values.role,
        assigned_store_id: store?.store_id ?? null,
        active: true,
        has_pin: !!result.pin,
        last_login_at: null,
        stores: store ? { name: store.name } : null,
      }
      // Defer so any post–server-action behavior runs first and we avoid Server Components render error
      queueMicrotask(() => {
        onSuccess(newStaff)
        // Refresh the page data after a short delay to ensure server action completes
        setTimeout(() => {
          window.location.reload()
        }, 500)
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create staff member.")
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a new staff account. An invitation email will be sent.
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
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
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
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="generate_pin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Generate PIN</FormLabel>
                      <FormDescription>
                        Auto-generate a 6-digit PIN for POS login (easy to remember, e.g. 33xxxx or xxxx00)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Staff Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* PIN Display Dialog */}
      {generatedPIN && (
        <Dialog open={!!generatedPIN} onOpenChange={(open) => !open && setGeneratedPIN(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>PIN Generated</DialogTitle>
              <DialogDescription>
                Copy this PIN and share it with the staff member. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 rounded-lg border-2 border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-center">
                <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">PIN</div>
                <div className="font-mono text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                  {generatedPIN}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPIN)
                  toast.success("PIN copied to clipboard")
                }}
              >
                Copy PIN
              </Button>
              <Button onClick={() => setGeneratedPIN(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
