import { type DiscountType } from '@/lib/pos/calculations'

/**
 * Normalizes discount input values to safe numbers
 * 
 * Handles invalid inputs (NaN, Infinity, undefined, null, non-numeric strings)
 * by converting them to 0. Valid numbers are returned as-is.
 * 
 * @param input - Input value of any type (typically from user input)
 * @returns Normalized number (0 if invalid)
 * 
 * @example
 * ```typescript
 * normalizeDiscountInput(10) // 10
 * normalizeDiscountInput("15") // 15
 * normalizeDiscountInput(NaN) // 0
 * normalizeDiscountInput(Infinity) // 0
 * normalizeDiscountInput(undefined) // 0
 * normalizeDiscountInput("invalid") // 0
 * ```
 * 
 * @remarks
 * This function is essential for handling user input safely,
 * preventing NaN or Infinity from breaking calculations
 */
export function normalizeDiscountInput(input: unknown): number {
  const n = Number(input)
  if (!isFinite(n) || isNaN(n)) return 0
  return n
}

/**
 * Validates a discount value against business rules
 * 
 * Validation rules:
 * - Discount must be non-negative
 * - Percentage discounts must be 0-100
 * - Fixed amount discounts must not exceed subtotal
 * 
 * @param rawValue - Discount value to validate
 * @param discountType - Type of discount (PERCENTAGE or FIXED_AMOUNT)
 * @param subtotalWithIva - Cart subtotal with IVA included
 * 
 * @returns Array of error messages (empty if valid)
 * 
 * @example
 * ```typescript
 * // Valid percentage discount
 * validateDiscount(10, 'PERCENTAGE', 1000) // []
 * 
 * // Invalid percentage discount
 * validateDiscount(150, 'PERCENTAGE', 1000) 
 * // ['El descuento porcentual no puede superar el 100%.']
 * 
 * // Invalid fixed discount
 * validateDiscount(1500, 'FIXED_AMOUNT', 1000)
 * // ['El descuento fijo no puede superar el subtotal con IVA.']
 * 
 * // Negative discount
 * validateDiscount(-10, 'PERCENTAGE', 1000)
 * // ['El descuento debe ser un número positivo.']
 * ```
 * 
 * @remarks
 * - Input is normalized before validation
 * - Multiple errors can be returned
 * - Error messages are in Spanish for user display
 * 
 * @see {@link normalizeDiscountInput} for input normalization
 * @see {@link isValidDiscount} for boolean validation
 */
export function validateDiscount(
  rawValue: number,
  discountType: DiscountType,
  subtotalWithIva: number
): string[] {
  const errors: string[] = []
  const value = normalizeDiscountInput(rawValue)

  if (value < 0) {
    errors.push('El descuento debe ser un número positivo.')
  }

  if (discountType === 'PERCENTAGE' && value > 100) {
    errors.push('El descuento porcentual no puede superar el 100%.')
  }

  if (discountType === 'FIXED_AMOUNT' && value > subtotalWithIva) {
    errors.push('El descuento fijo no puede superar el subtotal con IVA.')
  }

  return errors
}

/**
 * Checks if a discount value is valid (boolean version)
 * 
 * Convenience function that returns true if discount is valid,
 * false otherwise. Equivalent to checking if validateDiscount
 * returns an empty array.
 * 
 * @param rawValue - Discount value to validate
 * @param discountType - Type of discount (PERCENTAGE or FIXED_AMOUNT)
 * @param subtotalWithIva - Cart subtotal with IVA included
 * 
 * @returns true if valid, false if invalid
 * 
 * @example
 * ```typescript
 * if (isValidDiscount(discount, type, subtotal)) {
 *   // Apply discount
 * } else {
 *   // Show error
 * }
 * ```
 * 
 * @see {@link validateDiscount} for detailed error messages
 */
export function isValidDiscount(
  rawValue: number,
  discountType: DiscountType,
  subtotalWithIva: number
): boolean {
  return validateDiscount(rawValue, discountType, subtotalWithIva).length === 0
}