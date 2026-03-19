"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit, Trash2, Key, Users, Shield, UserCog, ShoppingCart, UserPlus, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddStaffModal } from "./add-staff-modal"
import { EditStaffModal } from "./edit-staff-modal"
import { deactivateStaff, reactivateStaff, deleteStaff, resetStaffPIN } from "./actions"
import { toast, Toaster } from "sonner"

type Staff = {
  staff_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  assigned_store_id: string | null
  active: boolean | null
  has_pin: boolean
  last_login_at: string | null
  stores: {
    name: string
  } | null
}

type Store = {
  store_id: string
  name: string
}

type StaffListProps = {
  initialStaff: Staff[]
  planTier: string
  stores: Store[]
}

const planLimits: Record<string, number> = {
  starter: 2,
  core: 10,
  scale: 999999, // Unlimited
}

const roleColors: Record<string, string> = {
  owner: "bg-purple-500 text-white hover:bg-purple-600",
  manager: "bg-blue-500 text-white hover:bg-blue-600",
  cashier: "bg-zinc-500 text-white hover:bg-zinc-600",
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Shield className="mr-1 h-3 w-3" />,
  manager: <UserCog className="mr-1 h-3 w-3" />,
  cashier: <ShoppingCart className="mr-1 h-3 w-3" />,
}

export function StaffList({ initialStaff, planTier, stores }: StaffListProps) {
  const router = useRouter()
  const [staff, setStaff] = React.useState<Staff[]>(initialStaff)
  React.useEffect(() => {
    setStaff(initialStaff)
  }, [initialStaff])
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [editingStaff, setEditingStaff] = React.useState<Staff | null>(null)
  const [deactivatingStaff, setDeactivatingStaff] = React.useState<Staff | null>(null)
  const [reactivatingStaff, setReactivatingStaff] = React.useState<Staff | null>(null)
  const [deletingStaff, setDeletingStaff] = React.useState<Staff | null>(null)
  const [pinModalStaff, setPinModalStaff] = React.useState<Staff | null>(null)
  const [resettingPIN, setResettingPIN] = React.useState<Staff | null>(null)
  const [generatedPIN, setGeneratedPIN] = React.useState<string | null>(null)

  const maxStaff = planLimits[planTier] || 2
  const currentCount = staff.filter((s) => s.active !== false).length
  const canAddMore = currentCount < maxStaff

  const handleStaffCreated = (newStaff?: Staff) => {
    if (newStaff) {
      React.startTransition(() => {
        setShowAddModal(false)
        setStaff((prev) => [...prev, newStaff])
      })
    } else {
      setShowAddModal(false)
      router.refresh()
    }
  }

  const handleStaffUpdated = () => {
    setEditingStaff(null)
    router.refresh()
  }

  const handleDeactivate = async () => {
    if (!deactivatingStaff) return

    try {
      await deactivateStaff(deactivatingStaff.staff_id)
      toast.success("Staff member deactivated successfully")
      setDeactivatingStaff(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to deactivate staff.")
    }
  }

  const handleReactivate = async () => {
    if (!reactivatingStaff) return

    try {
      await reactivateStaff(reactivatingStaff.staff_id)
      toast.success("Staff member reactivated successfully")
      setReactivatingStaff(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reactivate staff.")
    }
  }

  const handleDelete = async () => {
    if (!deletingStaff) return

    try {
      await deleteStaff(deletingStaff.staff_id)
      toast.success("Staff member removed permanently")
      setDeletingStaff(null)
      router.refresh()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete staff."
      toast.error(message)
      setDeletingStaff(null)
      // Don't rethrow so the error boundary doesn't show the generic Server Components error
    }
  }

  const handleResetPIN = async () => {
    if (!resettingPIN) return

    try {
      const result = await resetStaffPIN(resettingPIN.staff_id)
      setGeneratedPIN(result.pin)
      setResettingPIN(null)
      toast.success("PIN reset. Share the new PIN with the staff member.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reset PIN.")
      setResettingPIN(null)
    }
  }

  const openResetConfirm = () => {
    if (pinModalStaff) {
      setResettingPIN(pinModalStaff)
      setPinModalStaff(null)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
            Manage staff accounts and permissions ({currentCount}/{maxStaff === 999999 ? "∞" : maxStaff} used)
          </p>
          <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
            Staff Management
          </h1>
        </div>
        {canAddMore ? (
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Staff Member
          </Button>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 dark:border-yellow-900/40 dark:bg-yellow-950/30">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              Staff limit reached.{" "}
              {planTier === "starter" ? (
                <span>Upgrade to Core to add more staff.</span>
              ) : planTier === "core" ? (
                <span>Upgrade to Scale for unlimited staff.</span>
              ) : (
                <span>Maximum staff reached.</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Role Info Box */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
        <h3 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
          Role Definitions
        </h3>
        <div className="grid gap-2 text-sm text-blue-800 dark:text-blue-200 md:grid-cols-3">
          <div>
            <strong>Cashier:</strong> POS only. Can process sales at the register. No other pages.
          </div>
          <div>
            <strong>Manager:</strong> Cashier permissions + edit inventory, view reports, manage
            customers.
          </div>
          <div>
            <strong>Owner:</strong> Full access to all features.
          </div>
        </div>
      </div>

      {/* Staff Table */}
      {staff.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-background-card-light p-12 text-center dark:border-border-dark dark:bg-background-card-dark">
          <Users className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No staff members yet
          </h3>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Add staff members to manage your store operations.
          </p>
          {canAddMore && (
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Staff Member
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-background-card-light dark:border-border-dark dark:bg-background-card-dark">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Store</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow
                  key={member.staff_id}
                  className={member.active === false ? "opacity-60" : ""}
                >
                  <TableCell>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {`${member.first_name || ""} ${member.last_name || ""}`.trim() || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">{member.email}</div>
                  </TableCell>
                  <TableCell>
                    {member.role ? (
                      <Badge className={roleColors[member.role] || "bg-zinc-500"}>
                        {roleIcons[member.role]}
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {member.stores?.name || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.active !== false ? "default" : "secondary"}>
                      {member.active !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {member.last_login_at
                        ? new Date(member.last_login_at).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingStaff(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPinModalStaff(member)}
                        title="Manage PIN"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      {member.active !== false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeactivatingStaff(member)}
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReactivatingStaff(member)}
                            title="Reactivate"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingStaff(member)}
                            title="Delete permanently"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Activity Log Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Activity
        </h2>
        <div className="rounded-lg border border-zinc-200 bg-background-card-light p-8 text-center dark:border-border-dark dark:bg-background-card-dark">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Activity log coming soon. This will show recent staff actions.
          </p>
        </div>
      </div>

      <AddStaffModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleStaffCreated}
        stores={stores}
      />

      {editingStaff && (
        <EditStaffModal
          open={!!editingStaff}
          staff={editingStaff}
          stores={stores}
          onClose={() => setEditingStaff(null)}
          onSuccess={handleStaffUpdated}
        />
      )}

      {/* PIN management modal: show status + Reset PIN */}
      <Dialog open={!!pinModalStaff} onOpenChange={(open) => !open && setPinModalStaff(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              PIN for {pinModalStaff ? `${(pinModalStaff.first_name || "").trim()} ${(pinModalStaff.last_name || "").trim()}`.trim() || pinModalStaff.email : ""}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  {pinModalStaff?.has_pin
                    ? "A 6-digit PIN is set for this staff. They can sign in with PIN at the login page when this device has the store saved."
                    : "No PIN is set. Use Reset PIN to generate a 6-digit PIN for POS login."}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400">
                  For security, the current PIN cannot be displayed. Use Reset PIN to generate a new one and share it with the staff member.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPinModalStaff(null)}>
              Close
            </Button>
            <Button onClick={openResetConfirm}>
              Reset PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deactivatingStaff}
        onOpenChange={(open) => !open && setDeactivatingStaff(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              {deactivatingStaff
                ? `${deactivatingStaff.first_name || ""} ${deactivatingStaff.last_name || ""}`.trim()
                : "this staff member"}
              ? They will lose access immediately. You can reactivate them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-red-600 hover:bg-red-500">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!reactivatingStaff}
        onOpenChange={(open) => !open && setReactivatingStaff(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Reactivate{" "}
              {reactivatingStaff
                ? `${reactivatingStaff.first_name || ""} ${reactivatingStaff.last_name || ""}`.trim()
                : "this staff member"}
              ? They will be able to sign in with their PIN again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate}>Reactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingStaff}
        onOpenChange={(open) => !open && setDeletingStaff(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              {deletingStaff
                ? `${deletingStaff.first_name || ""} ${deletingStaff.last_name || ""}`.trim()
                : "this staff member"}
              {" "}from your account. Their PIN and record cannot be recovered. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset PIN Confirmation */}
      <AlertDialog
        open={!!resettingPIN}
        onOpenChange={(open) => !open && setResettingPIN(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset PIN?</AlertDialogTitle>
            <AlertDialogDescription>
              Generate a new 6-digit PIN for{" "}
              {resettingPIN
                ? `${resettingPIN.first_name || ""} ${resettingPIN.last_name || ""}`.trim()
                : "this staff member"}
              . The old PIN will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPIN}>Reset PIN</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Display Dialog */}
      <AlertDialog open={!!generatedPIN} onOpenChange={(open) => !open && setGeneratedPIN(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New PIN Generated</AlertDialogTitle>
            <AlertDialogDescription>
              Copy this PIN and share it with the staff member. It will not be shown again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 rounded-lg border-2 border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-center">
              <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">PIN</div>
              <div className="font-mono text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                {generatedPIN}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (generatedPIN) {
                  navigator.clipboard.writeText(generatedPIN)
                  toast.success("PIN copied to clipboard")
                }
              }}
            >
              Copy PIN
            </Button>
            <AlertDialogAction onClick={() => setGeneratedPIN(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
