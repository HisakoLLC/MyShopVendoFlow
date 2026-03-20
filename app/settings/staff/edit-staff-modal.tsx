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
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="font-editorial text-xl font-bold text-zinc-50">Edit Staff Member</DialogTitle>
          <DialogDescription className="text-zinc-400">Update staff information and role.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm" />
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
                    <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
              <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Email</div>
              <div className="font-mono text-sm text-zinc-300 mt-1">{staff.email}</div>
              <p className="mt-2 text-[0.65rem] text-zinc-500 uppercase tracking-wider">
                Email cannot be changed
              </p>
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500">Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-10 rounded-sm">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 mt-6">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-100">
                {isSubmitting ? "Updating..." : "Update Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
