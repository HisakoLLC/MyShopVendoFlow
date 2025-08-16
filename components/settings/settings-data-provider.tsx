"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

export type Setting = {
  id: string
  key: string
  value: string
  description: string
  created_at: string
  updated_at: string
}

type SettingsContextType = {
  settings: Setting[]
  isLoading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
  createSetting: (setting: Omit<Setting, "id" | "created_at" | "updated_at">) => Promise<void>
  updateSetting: (id: string, setting: Partial<Omit<Setting, "id" | "created_at" | "updated_at">>) => Promise<void>
  deleteSetting: (id: string) => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsDataProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Setting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  const refreshSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase.from("settings").select("*").order("key")

      if (error) {
        throw error
      }

      setSettings(data || [])
    } catch (err: any) {
      setError(err.message || "Failed to fetch settings")
      toast({
        title: "Error",
        description: `Failed to fetch settings: ${err.message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createSetting = async (setting: Omit<Setting, "id" | "created_at" | "updated_at">) => {
    try {
      setError(null)

      // Check if setting with same key already exists
      const { data: existingSettings } = await supabase.from("settings").select("*").eq("key", setting.key).limit(1)

      if (existingSettings && existingSettings.length > 0) {
        throw new Error(`Setting with key '${setting.key}' already exists`)
      }

      const { error } = await supabase.from("settings").insert([setting])

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Setting created successfully",
      })

      await refreshSettings()
    } catch (err: any) {
      setError(err.message || "Failed to create setting")
      toast({
        title: "Error",
        description: `Failed to create setting: ${err.message}`,
        variant: "destructive",
      })
      throw err
    }
  }

  const updateSetting = async (id: string, setting: Partial<Omit<Setting, "id" | "created_at" | "updated_at">>) => {
    try {
      setError(null)

      // If key is being updated, check if new key already exists
      if (setting.key) {
        const { data: existingSettings } = await supabase
          .from("settings")
          .select("*")
          .eq("key", setting.key)
          .neq("id", id)
          .limit(1)

        if (existingSettings && existingSettings.length > 0) {
          throw new Error(`Setting with key '${setting.key}' already exists`)
        }
      }

      const { error } = await supabase.from("settings").update(setting).eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Setting updated successfully",
      })

      await refreshSettings()
    } catch (err: any) {
      setError(err.message || "Failed to update setting")
      toast({
        title: "Error",
        description: `Failed to update setting: ${err.message}`,
        variant: "destructive",
      })
      throw err
    }
  }

  const deleteSetting = async (id: string) => {
    try {
      setError(null)

      const { error } = await supabase.from("settings").delete().eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Setting deleted successfully",
      })

      await refreshSettings()
    } catch (err: any) {
      setError(err.message || "Failed to delete setting")
      toast({
        title: "Error",
        description: `Failed to delete setting: ${err.message}`,
        variant: "destructive",
      })
      throw err
    }
  }

  useEffect(() => {
    refreshSettings()
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        error,
        refreshSettings,
        createSetting,
        updateSetting,
        deleteSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsDataProvider")
  }
  return context
}
