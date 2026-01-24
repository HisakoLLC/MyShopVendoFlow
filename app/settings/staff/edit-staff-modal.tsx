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

const staffSchema = z
  .object({
    first_name: z.string().min(1, "First name is required.").max(100, "First name is too long."),
    last_name: z.string().min(1, "Last name is required.").max(100, "Last name is too long."),
    role: z.enum(["cashier", "manager", "owner"], {
      errorMap: () => ({ message: "Role must be cashier, manager, or owner." }),
    }),
    assigned_store_id: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      if ((data.role === "cashier" || data.role === "manager") && !data.assigned_store_id) {
        return false
      }
      return true
    },
    {
      message: "Assigned store is required for cashier and manager roles.",
      path: ["assigned_store_id"],
    }
  )

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
      assigned_store_id: staff.assigned_store_id || "",
    },
    mode: "onChange",
  })

  const watchedRole = form.watch("role")

  const onSubmit = async (values: StaffFormValues) => {
    setIsSubmitting(true)
    try {
      const data: UpdateStaffData = {
        staff_id: staff.staff_id,
        first_name: values.first_name,
        last_name: values.last_name,
        role: values.role,
        assigned_store_id: values.assigned_store_id || undefined,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>Update staff information and role.</DialogDescription>
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

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Email</div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{staff.email}</div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Email cannot be changed
              </p>
            </div>

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

            {(watchedRole === "cashier" || watchedRole === "manager") && (
              <FormField
                control={form.control}
                name="assigned_store_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Store *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.store_id} value={store.store_id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedRole === "owner" && stores.length > 0 && (
              <FormField
                control={form.control}
                name="assigned_store_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Store (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {stores.map((store) => (
                          <SelectItem key={store.store_id} value={store.store_id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
