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
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateStaff, type UpdateStaffData } from "./actions"

// Single store per account: no store selection; server keeps/assigns the account's store
const staffSchema = z.object({
  first_name: z.string().min(1, "First name is required.").max(100, "First name is too long."),
  last_name: z.string().min(1, "Last name is required.").max(100, "Last name is too long."),
  role: z.enum(["cashier", "manager", "owner"], {
    errorMap: () => ({ message: "Role must be cashier, manager, or owner." }),
  }),
})

type StaffFormValues = z.infer<typeof staffSchema>

type Staff = {
  staff_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  assigned_store_id: string | null
  active: boolean | null
}

type Store = {
  store_id: string
  name: string
}

type EditStaffModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  staff: Staff
  stores: Store[]
}

export function EditStaffModal({
  open,
  onClose,
  onSuccess,
  staff,
  stores,
}: EditStaffModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      first_name: staff.first_name || "",
      last_name: staff.last_name || "",
      role: (staff.role as "cashier" | "manager" | "owner") || "cashier",
    },
    mode: "onChange",
  })

  const onSubmit = async (values: StaffFormValues) => {
    setIsSubmitting(true)
    try {
      const data: UpdateStaffData = {
        staff_id: staff.staff_id,
        first_name: values.first_name,
        last_name: values.last_name,
        role: values.role,
      }
      await updateStaff(data)
      toast.success("Staff member updated successfully!")
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update staff member.")
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-background border border-border rounded-xl p-6 w-full max-w-md text-foreground">
        <DialogHeader>
          <DialogTitle className="font-sans text-xl font-bold tracking-tight text-foreground mb-1">Edit Staff Member</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mb-6">Update staff information and role.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2 block">First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 w-full placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] transition-all" />
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
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2 block">Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 w-full placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] transition-all" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">Email</div>
              <div className="font-mono text-sm text-foreground">{staff.email}</div>
              <p className="mt-2 text-[0.6rem] text-muted-foreground/60 uppercase tracking-widest">
                Email cannot be changed
              </p>
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2 block">Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border border-border rounded-md text-sm text-foreground h-9 px-3 w-full focus:outline-none focus:ring-1 focus:ring-[#E8400C] focus:border-[#E8400C] transition-all">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border border-border text-foreground">
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="border border-border text-foreground hover:bg-accent rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#E8400C] text-white hover:bg-[#c73508] rounded-md h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors border-none"
              >
                {isSubmitting ? "Updating..." : "Update Staff Member"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
