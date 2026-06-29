"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import { adminToast } from "@/lib/admin/toast"
import { 
  ShieldCheck, 
  Mail, 
  MoreVertical, 
  UserPlus, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Lock,
  Loader2
} from "lucide-react"
import InviteAdminModal from "../../_components/staff/InviteAdminModal"
import PermissionGate from "../../_components/PermissionGate"

interface AdminUserRow {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  last_login_at: string | null
}

interface StaffClientProps {
  initialStaff: AdminUserRow[]
}

export default function StaffClient({ initialStaff }: StaffClientProps) {
  const router = useRouter()
  const currentUser = useAdminUser()
  const isSuperAdmin = currentUser.role === "super_admin"
  
  const [showInvite, setShowInvite] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const toggleStatus = async (user: AdminUserRow) => {
    if (user.id === currentUser.id) return adminToast.error("Self-deactivation protected")
    
    setPendingId(user.id)
    const toastId = adminToast.loading("Updating status...")
    try {
      const res = await fetch(`/api/admin/staff/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active })
      })
      if (!res.ok) throw new Error("Update failed")
      adminToast.success(`User ${user.is_active ? 'deactivated' : 'reactivated'}`)
      router.refresh()
    } catch (err) {
      adminToast.error("Administrative update failed")
    } finally {
      adminToast.dismiss(toastId)
      setPendingId(null)
    }
  }

  const updateRole = async (userId: string, newRole: string) => {
    const toastId = adminToast.loading("Modifying role...")
    try {
      const res = await fetch(`/api/admin/staff/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      })
      if (!res.ok) throw new Error("Update failed")
      adminToast.success("System role modified")
      setEditingUser(null)
      router.refresh()
    } catch (err) {
      adminToast.error("Role modification failed")
    } finally {
      adminToast.dismiss(toastId)
    }
  }

  const getRoleStyle = (role: string) => {
    switch(role) {
      case 'super_admin': return 'bg-primary/10 text-primary border-primary/20'
      case 'finance': return 'bg-blue-400/10 text-blue-400 border-blue-400/20'
      case 'reporting': return 'bg-purple-400/10 text-purple-400 border-purple-400/20'
      default: return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
    }
  }

  const formatLastLogin = (date: string | null) => {
    if (!date) return "Never"
    const d = new Date(date)
    return d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {!isSuperAdmin && (
        <div className="flex items-center gap-3 p-4 bg-muted/50 border border-border rounded-xl text-[10px] text-muted-foreground uppercase font-black tracking-widest">
           <Lock className="w-4 h-4" />
           View only — contact a super admin to make changes
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <div className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mb-1">System Permissions</div>
          <h1 className="font-editorial text-foreground text-4xl font-bold tracking-tight uppercase">Admin Staff</h1>
        </div>
        <PermissionGate permission="staff_manage">
          <button 
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Invite Admin User
          </button>
        </PermissionGate>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b border-border">
              <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider">User</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider">Role</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider">Status</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initialStaff.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50 transition-colors group">
                <td className="px-6 py-5">
                   <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${getRoleStyle(user.role)} border shadow-inner`}>
                         {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-foreground text-xs font-semibold">{user.full_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono lowercase">{user.email}</div>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getRoleStyle(user.role)}`}>
                      {user.role.replace('_', ' ')}
                   </span>
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                     <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-[#22c55e]' : 'bg-muted'}`} />
                     <span className={`text-[10px] font-bold uppercase tracking-widest ${user.is_active ? 'text-[#22c55e]' : 'text-muted-foreground'}`}>
                       {user.is_active ? 'Active' : 'Inactive'}
                     </span>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                     <Clock className="w-3.5 h-3.5 opacity-30" />
                     {formatLastLogin(user.last_login_at)}
                   </div>
                </td>
                 <td className="px-6 py-5 text-right">
                   <PermissionGate permission="staff_manage">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => setEditingUser(user)}
                           className="p-2 text-muted-foreground hover:text-foreground bg-background rounded-lg border border-input hover:bg-accent transition-all"
                         >
                           <Edit2 className="w-3.5 h-3.5" />
                         </button>
                         <button 
                           disabled={user.id === currentUser.id || pendingId === user.id}
                           onClick={() => toggleStatus(user)}
                           className={`p-2 rounded-lg border border-input transition-all ${
                             user.is_active ? 'text-muted-foreground hover:text-red-400 bg-background hover:bg-accent' : 'text-muted-foreground hover:text-primary bg-background hover:bg-accent'
                           } disabled:opacity-20`}
                         >
                           {pendingId === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                         </button>
                      </div>
                   </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <InviteAdminModal 
          onClose={() => setShowInvite(false)}
          onSuccess={() => router.refresh()}
        />
      )}      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex justify-end">
           <div className="w-full max-w-sm bg-background border-l border-border h-full p-8 animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-foreground text-xl font-bold tracking-tight">Modify Role</h2>
                 <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2 block">Staff Member</label>
                    <div className="text-foreground font-semibold">{editingUser.full_name}</div>
                    <div className="text-xs text-muted-foreground">{editingUser.email}</div>
                 </div>
 
                 <div className="space-y-3">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Select New Role</label>
                    {['support', 'finance', 'reporting', 'super_admin'].map((role) => (
                      <button
                        key={role}
                        onClick={() => updateRole(editingUser.id, role)}
                        className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all ${
                          editingUser.role === role 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:bg-accent'
                        }`}
                      >
                         <div className="text-left">
                            <div className="text-xs font-bold text-foreground uppercase tracking-wider">{role.replace('_', ' ')}</div>
                            <div className="text-[10px] text-muted-foreground">System permissions for this role</div>
                         </div>
                         {editingUser.role === role && <ShieldCheck className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
