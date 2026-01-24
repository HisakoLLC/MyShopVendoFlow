/**
 * Form Validation Helpers
 * Provides consistent validation patterns and error messages
 */

import { z } from "zod"

/**
 * Common validation schemas
 */
export const validationSchemas = {
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^254\d{9}$/, "Phone must be 12 digits starting with 254"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU is too long"),
  price: z.number().min(0.01, "Price must be greater than 0"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  percentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
}

/**
 * Check if field has error and return error message
 */
export function getFieldError(errors: any, fieldName: string): string | undefined {
  return errors?.[fieldName]?.message
}

/**
 * Check if field is invalid
 */
export function isFieldInvalid(errors: any, fieldName: string): boolean {
  return !!errors?.[fieldName]
}

/**
 * Get error class for input field
 */
export function getErrorClass(errors: any, fieldName: string): string {
  return isFieldInvalid(errors, fieldName)
    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
    : ""
}
