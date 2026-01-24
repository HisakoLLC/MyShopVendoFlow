"use client"

import * as React from "react"
import { Plus, Edit, Trash2, Key, Users, Shield, UserCog, ShoppingCart } from "lucide-react"

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
import { deactivateStaff, resetStaffPIN } from "./actions"
import { toast, Toaster } from "sonner"

type Staff = {
  staff_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  assigned_store_id: string | null
  active: boolean | null
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
  const [staff, setStaff] = React.useState<Staff[]>(initialStaff)
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [editingStaff, setEditingStaff] = React.useState<Staff | null>(null)
  const [deactivatingStaff, setDeactivatingStaff] = React.useState<Staff | null>(null)
  const [resettingPIN, setResettingPIN] = React.useState<Staff | null>(null)
  const [generatedPIN, setGeneratedPIN] = React.useState<string | null>(null)

  const maxStaff = planLimits[planTier] || 2
  const currentCount = staff.filter((s) => s.active !== false).length
  const canAddMore = currentCount < maxStaff

  const handleStaffCreated = () => {
    setShowAddModal(false)
    window.location.reload()
  }

  const handleStaffUpdated = () => {
    setEditingStaff(null)
    window.location.reload()
  }

  const handleDeactivate = async () => {
    if (!deactivatingStaff) return

    try {
      await deactivateStaff(deactivatingStaff.staff_id)
      toast.success("Staff member deactivated successfully")
      setDeactivatingStaff(null)
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to deactivate staff.")
    }
  }

  const handleResetPIN = async () => {
    if (!resettingPIN) return

    try {
      const result = await resetStaffPIN(resettingPIN.staff_id)
      setGeneratedPIN(result.pin)
      setResettingPIN(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reset PIN.")
      setResettingPIN(null)
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Staff Management
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage staff accounts and permissions ({currentCount}/{maxStaff === 999999 ? "∞" : maxStaff} used)
          </p>
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
            <strong>Cashier:</strong> Can process sales, returns. Cannot edit inventory or view
            reports.
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
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
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
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
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
                    <span className="text-sm text-zinc-400">—</span>
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
                        onClick={() => setResettingPIN(member)}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      {member.active !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeactivatingStaff(member)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
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
              ? They will lose access immediately.
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

      {/* Reset PIN Confirmation */}
      <AlertDialog
        open={!!resettingPIN}
        onOpenChange={(open) => !open && setResettingPIN(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset PIN?</AlertDialogTitle>
            <AlertDialogDescription>
              Generate a new 4-digit PIN for{" "}
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
