/**
 * Centralized Toast Helper
 * Provides consistent toast notifications across the app
 */

import { toast as sonnerToast } from "sonner"

type ToastOptions = {
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Show success toast (green, auto-dismiss after 3s)
 */
export function toastSuccess(message: string, options?: ToastOptions) {
  return sonnerToast.success(message, {
    duration: options?.duration || 3000,
    action: options?.action,
  })
}

/**
 * Show error toast (red, requires manual dismiss)
 */
export function toastError(message: string, options?: ToastOptions) {
  return sonnerToast.error(message, {
    duration: options?.duration || Infinity, // Manual dismiss
    action: options?.action,
  })
}

/**
 * Show info toast (blue, auto-dismiss after 5s)
 */
export function toastInfo(message: string, options?: ToastOptions) {
  return sonnerToast.info(message, {
    duration: options?.duration || 5000,
    action: options?.action,
  })
}

/**
 * Show warning toast (yellow, auto-dismiss after 4s)
 */
export function toastWarning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(message, {
    duration: options?.duration || 4000,
    action: options?.action,
  })
}

/**
 * Show loading toast (returns dismiss function)
 */
export function toastLoading(message: string) {
  return sonnerToast.loading(message)
}

/**
 * Show promise toast (shows loading, then success/error)
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) {
  return sonnerToast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  })
}
