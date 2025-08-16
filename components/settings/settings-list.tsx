"use client"

import { useState } from "react"
import { useSettings, type Setting } from "./settings-data-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"

export function SettingsList() {
  const { settings, isLoading, createSetting, updateSetting, deleteSetting } = useSettings()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSetting, setSelectedSetting] = useState<Setting | null>(null)
  const [newSetting, setNewSetting] = useState({ key: "", value: "", description: "" })
  const [editedSetting, setEditedSetting] = useState({ key: "", value: "", description: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredSettings = settings.filter(
    (setting) =>
      setting.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleCreateSetting = async () => {
    try {
      setIsSubmitting(true)
      await createSetting(newSetting)
      setNewSetting({ key: "", value: "", description: "" })
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error("Failed to create setting:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateSetting = async () => {
    if (!selectedSetting) return

    try {
      setIsSubmitting(true)
      await updateSetting(selectedSetting.id, editedSetting)
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Failed to update setting:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSetting = async () => {
    if (!selectedSetting) return

    try {
      setIsSubmitting(true)
      await deleteSetting(selectedSetting.id)
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete setting:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (setting: Setting) => {
    setSelectedSetting(setting)
    setEditedSetting({
      key: setting.key,
      value: setting.value,
      description: setting.description,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (setting: Setting) => {
    setSelectedSetting(setting)
    setIsDeleteDialogOpen(true)
  }

  const columns: ColumnDef<Setting>[] = [
    {
      accessorKey: "key",
      header: "Key",
      cell: ({ row }) => <div className="font-medium">{row.original.key}</div>,
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => <div className="max-w-[300px] truncate">{row.original.value}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <div className="max-w-[300px] truncate">{row.original.description}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(row.original)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Manage your application settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Setting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Setting</DialogTitle>
                <DialogDescription>
                  Create a new system setting. Settings are used to configure various aspects of the application.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    placeholder="e.g., tax_rate, company_name"
                    value={newSetting.key}
                    onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    placeholder="Setting value"
                    value={newSetting.value}
                    onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this setting is used for"
                    value={newSetting.description}
                    onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSetting} disabled={isSubmitting || !newSetting.key || !newSetting.value}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSettings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery
              ? "No settings match your search"
              : "No settings found. Add your first setting to get started."}
          </div>
        ) : (
          <DataTable columns={columns} data={filteredSettings} />
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Setting</DialogTitle>
            <DialogDescription>Update the details for this setting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-key">Key</Label>
              <Input
                id="edit-key"
                value={editedSetting.key}
                onChange={(e) => setEditedSetting({ ...editedSetting, key: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-value">Value</Label>
              <Input
                id="edit-value"
                value={editedSetting.value}
                onChange={(e) => setEditedSetting({ ...editedSetting, value: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editedSetting.description}
                onChange={(e) => setEditedSetting({ ...editedSetting, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSetting} disabled={isSubmitting || !editedSetting.key || !editedSetting.value}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the setting "{selectedSetting?.key}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSetting}
              disabled={isSubmitting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
