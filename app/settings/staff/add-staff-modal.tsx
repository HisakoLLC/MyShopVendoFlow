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
import type { CreateStaffData } from "./actions"

const staffSchema = z.object({
  first_name: z.string().min(1, "First name is required.").max(100, "First name is too long."),
  last_name: z.string().min(1, "Last name is required.").max(100, "Last name is too long."),
  email: z.string().email("Invalid email address.").max(200, "Email is too long."),
  role: z.enum(["cashier", "manager", "owner"], {
    errorMap: () => ({ message: "Role must be cashier, manager, or owner." }),
  }),
  assigned_store_id: z.string().optional(),
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
  const [pendingNewStaff, setPendingNewStaff] = React.useState<NewStaffForList | null>(null)

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      role: "cashier",
      assigned_store_id: stores[0]?.store_id ?? "",
      generate_pin: false,
    },
    mode: "onChange",
  })

  const watchedGeneratePIN = form.watch("generate_pin")

  const onSubmit = async (values: StaffFormValues) => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          role: values.role,
          assigned_store_id: values.assigned_store_id,
          generate_pin: values.generate_pin,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || "Failed to create staff member.")
      }
      setIsSubmitting(false)
      form.reset()
      const store =
        stores.find((s) => s.store_id === values.assigned_store_id) ??
        stores[0] ??
        null
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

      toast.success("New staff created. Share the PIN with them below.")
      if (result.pin) {
        setGeneratedPIN(result.pin)
        setPendingNewStaff(newStaff)
      } else {
        onSuccess(newStaff)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create staff member.")
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-md text-zinc-100">
          <DialogHeader>
            <DialogTitle className="font-editorial text-xl font-bold text-zinc-50 mb-1">Add Staff Member</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 mb-6">
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
                      <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 transition-all" />
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
                      <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 transition-all" />
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
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 transition-all" />
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
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 transition-all">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border border-zinc-800 text-zinc-100">
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
                name="assigned_store_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Assigned Store *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-9 px-3 w-full focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 transition-all">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border border-zinc-800 text-zinc-100">
                        {stores.map((store) => (
                          <SelectItem key={store.store_id} value={store.store_id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-zinc-600 mt-1">
                      Cashiers will only see and sell from this store in POS.
                    </FormDescription>
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
                        className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-zinc-950"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-semibold text-zinc-300">Generate PIN</FormLabel>
                      <FormDescription className="text-xs text-zinc-600 mt-1">
                        Auto-generate a 6-digit PIN for POS login.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
                >
                  {isSubmitting ? "Creating..." : "Create Staff Member"}
                </button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* PIN Display Dialog - call onSuccess only when Done so list update doesn't trigger revalidation during success message */}
      {generatedPIN && (
        <Dialog
          open={!!generatedPIN}
          onOpenChange={(open) => {
            if (!open) {
              if (pendingNewStaff) {
                onSuccess(pendingNewStaff)
                setPendingNewStaff(null)
              }
              setGeneratedPIN(null)
            }
          }}
        >
          <DialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-editorial text-xl font-bold text-zinc-50 mb-1">New staff created</DialogTitle>
              <DialogDescription className="text-sm text-zinc-400 mb-6">
                Copy this PIN and share it with the staff member. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 text-center mb-6">
              <div className="text-center">
                <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">PIN</div>
                <div className="font-mono text-4xl font-bold text-zinc-50 tabular-nums tracking-[0.3em]">
                  {generatedPIN}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPIN)
                  toast.success("PIN copied to clipboard")
                }}
                className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors"
              >
                Copy PIN
              </button>
              <button
                onClick={() => {
                  if (pendingNewStaff) {
                    onSuccess(pendingNewStaff)
                    setPendingNewStaff(null)
                  }
                  setGeneratedPIN(null)
                }}
                className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
              >
                Done
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
