"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit, Trash2, Key, Users, Crown, BarChart2, ShoppingCart, UserPlus, Trash, ArrowLeft } from "lucide-react"

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
import { cn } from "@/lib/utils"

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
  owner: "bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-sm",
  manager: "bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-sm",
  cashier: "bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-sm",
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="mr-2 h-3 w-3" />,
  manager: <BarChart2 className="mr-2 h-3 w-3" />,
  cashier: <ShoppingCart className="mr-2 h-3 w-3" />,
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
      <Toaster 
        position="top-right"
        toastOptions={{
          className: "bg-zinc-900 border border-emerald-400/20 rounded-lg px-4 py-3 flex items-center gap-3 shadow-none",
          style: {
            background: "#18181b", // zinc-900
            border: "1px solid rgba(52, 211, 153, 0.2)", // emerald-400/20
          },
        }}
      />
      <div className="flex items-start justify-between pb-6 mb-6 border-b border-zinc-800">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
            Manage staff accounts and permissions ({currentCount}/{maxStaff === 999999 ? "∞" : maxStaff} used)
          </p>
          <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
            Staff Management
          </h1>
        </div>
        {canAddMore ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
          >
            Add Staff Member
          </button>
        ) : (
          <div className="rounded-sm border border-yellow-500/20 bg-yellow-500/10 px-4 py-2">
            <p className="text-xs font-semibold tracking-wide text-yellow-500 uppercase">
              Staff limit reached
            </p>
          </div>
        )}
      </div>

      {/* Role Definitions Card */}
      <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-6 mb-6">
        <h3 className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-4">
          ROLE DEFINITIONS
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-1">
            <span className="text-sm font-semibold text-zinc-100 block">Cashier</span>
            <p className="text-sm text-zinc-500 mt-1">POS only. Can process sales at the register. No back-office access.</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-semibold text-zinc-100 block">Manager</span>
            <p className="text-sm text-zinc-500 mt-1">Cashier + inventory management, sales reports, and customer list.</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-semibold text-zinc-100 block">Owner</span>
            <p className="text-sm text-zinc-500 mt-1">Full access to all features, settings, and staff management.</p>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      {staff.length === 0 ? (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="mb-4 font-editorial text-xl font-bold text-zinc-50">
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
        <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-zinc-700 hover:bg-transparent transition-none">
                <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3">Staff Member</TableHead>
                <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3">Role</TableHead>
                <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3">Assigned Store</TableHead>
                <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3">Status</TableHead>
                <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3">Last Login</TableHead>
                <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 px-4 py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow
                  key={member.staff_id}
                  className="border-b border-zinc-700/40 hover:bg-zinc-800/40 transition-colors duration-100 last:border-0"
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-100">
                        {`${member.first_name || ""} ${member.last_name || ""}`.trim() || "—"}
                      </span>
                      <span className="text-sm text-zinc-400 mt-0.5">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {member.role ? (
                      <div className={cn(
                        "inline-flex items-center text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 border border-zinc-700",
                        roleColors[member.role]
                      )}>
                        {roleIcons[member.role]}
                        {member.role}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="text-sm text-zinc-400">
                      {member.stores?.name || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-sm border",
                      member.active !== false 
                        ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" 
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    )}>
                      {member.active !== false ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-zinc-500 tabular-nums">
                    {member.last_login_at
                      ? new Date(member.last_login_at).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                        title="Edit details"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPinModalStaff(member)}
                        className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                        title="Manage PIN"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      {member.active !== false ? (
                        <button
                          onClick={() => setDeactivatingStaff(member)}
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                          title="Deactivate staff"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setReactivatingStaff(member)}
                            className="text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                            title="Reactivate staff"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStaff(member)}
                            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-sm h-7 w-7 flex items-center justify-center transition-colors"
                            title="Delete permanently"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
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

      {/* Recent Activity Section */}
      <div className="mt-12">
        <h2 className="font-editorial text-2xl font-bold text-zinc-50 mb-6">
          Recent Activity
        </h2>
        <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-12 text-center">
          <p className="text-sm text-zinc-500">
            Activity log coming soon. This will show recent staff actions and audit trails.
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

      {/* PIN Management Dialog */}
      <Dialog open={!!pinModalStaff} onOpenChange={(open) => !open && setPinModalStaff(null)}>
        <DialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-md text-zinc-100">
          <DialogHeader>
            <DialogTitle className="font-editorial text-xl font-bold text-zinc-50 mb-1">
              Manage PIN
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 mb-6">
              Manage security credentials for {pinModalStaff ? `${pinModalStaff.first_name} ${pinModalStaff.last_name}` : "this staff member"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-zinc-400">
            <p>
              {pinModalStaff?.has_pin
                ? "A 6-digit PIN is currently set for this account."
                : "No PIN is currently set for this account."}
            </p>
            <p>
              For security, the current PIN cannot be viewed. Resetting the PIN will generate a new 6-digit code for POS login.
            </p>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setPinModalStaff(null)}
              className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors"
            >
              Close
            </button>
            <button
              onClick={openResetConfirm}
              className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
            >
              Reset PIN
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deactivatingStaff}
        onOpenChange={(open) => !open && setDeactivatingStaff(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-editorial text-xl font-bold text-zinc-50 mb-2">Deactivate Staff?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-400 mb-6">
              Deactivate {deactivatingStaff ? `${deactivatingStaff.first_name} ${deactivatingStaff.last_name}` : "this staff member"}? They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase">
              Deactivate
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!reactivatingStaff}
        onOpenChange={(open) => !open && setReactivatingStaff(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-editorial text-xl font-bold text-zinc-50 mb-2">Reactivate Staff?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-400 mb-6">
              Reactivate {reactivatingStaff ? `${reactivatingStaff.first_name} ${reactivatingStaff.last_name}` : "this staff member"}? They will be able to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase">
              Reactivate
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingStaff}
        onOpenChange={(open) => !open && setDeletingStaff(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-editorial text-xl font-bold text-zinc-50 mb-2">Delete Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-400 mb-6">
              This will permanently remove {deletingStaff ? `${deletingStaff.first_name} ${deletingStaff.last_name}` : "this staff member"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white hover:bg-red-600 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset PIN Confirmation */}
      <AlertDialog
        open={!!resettingPIN}
        onOpenChange={(open) => !open && setResettingPIN(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-editorial text-xl font-bold text-zinc-50 mb-2">Reset PIN?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-400 mb-6">
              Generate a new 6-digit PIN for {resettingPIN ? `${resettingPIN.first_name} ${resettingPIN.last_name}` : "this staff member"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPIN} className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase">
              Reset PIN
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Display Dialog */}
      <AlertDialog open={!!generatedPIN} onOpenChange={(open) => !open && setGeneratedPIN(null)}>
        <AlertDialogContent className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-editorial text-xl font-bold text-zinc-50 mb-1">New PIN Generated</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-400 mb-6">
              Copy this PIN and share it with the staff member. It will not be shown again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 text-center mb-6">
            <div className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">PIN</div>
            <div className="font-mono text-4xl font-bold text-zinc-50 tabular-nums tracking-[0.3em]">
              {generatedPIN}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                if (generatedPIN) {
                  navigator.clipboard.writeText(generatedPIN)
                  toast.success("PIN copied to clipboard")
                }
              }}
              className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase bg-transparent transition-colors"
            >
              Copy PIN
            </button>
            <AlertDialogAction onClick={() => setGeneratedPIN(null)} className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase">
              Done
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
