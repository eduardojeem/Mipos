# Implementation Plan: Fix ProductEditModal Type Errors

## Overview

This implementation plan addresses TypeScript type errors and ESLint warnings in the ProductEditModal component. The tasks are organized to fix type safety issues first, then remove unused code, and finally implement the Next.js Image optimization. Each task is focused on a specific error or group of related errors.

## Tasks

- [ ] 1. Fix Supabase query type annotations
  - [ ] 1.1 Add OrganizationMember type and fix organization members query
    - Replace `any` type with proper `OrganizationMember` interface in `loadCategoriesAndSuppliers` function
    - Define `interface OrganizationMember { organization_id: string; }` at the top of the file
    - Update the map function: `(mem || []).map((m: OrganizationMember) => String(m.organization_id))`
    - _Requirements: 1.1_

  - [ ] 1.2 Fix product SKU query type inference
    - Change `.single()` to `.maybeSingle()` in the `generateSku` function to properly handle null case
    - This fixes the type inference issue where `existingProduct.id` was typed as `never`
    - Update the condition to properly check `if (existingProduct && existingProduct.id !== product?.id)`
    - _Requirements: 1.3_

  - [ ] 1.3 Add proper types for category and supplier insert operations
    - Define `CategoryInsertData` interface with fields: name, description, is_active, organization_id
    - Define `SupplierInsertData` interface with fields: name, contact_info, is_active, organization_id
    - Update `handleCreateCategory` to use typed insert data object
    - Update `handleCreateSupplier` to use typed insert data object
    - _Requirements: 1.4, 1.5_

- [ ] 2. Fix type-safe property deletion
  - [ ] 2.1 Replace `any` type assertion with proper destructuring
    - In the `onSubmit` function, replace `delete (productData as any).has_offer;` with destructuring
    - Use: `const { has_offer, ...productDataWithoutHasOffer } = productData as ProductFormData & { has_offer?: boolean };`
    - Assign to properly typed variable: `const finalProductData: Partial<Product> = productDataWithoutHasOffer;`
    - Update the `onSave` call to use `finalProductData` instead of `productData`
    - _Requirements: 1.2_

- [ ] 3. Fix variable declarations and remove unused code
  - [ ] 3.1 Change `baseSku` from `let` to `const`
    - In the `generateSku` function around line 505, change `let baseSku` to `const baseSku`
    - _Requirements: 2.1_

  - [ ] 3.2 Remove unused functions
    - Remove the `handleImageUrlChange` function (line 387-391)
    - Remove the `getCategoryName` function (line 393-397)
    - _Requirements: 3.1, 3.2_

- [ ] 4. Implement Next.js Image optimization
  - [ ] 4.1 Import Next.js Image component
    - Add `import Image from 'next/image';` at the top of the file
    - _Requirements: 4.1_

  - [ ] 4.2 Replace `<img>` tag with Next.js `<Image />` component
    - Replace the `<img>` tag around line 767 with Next.js `<Image />` component
    - Use `fill` prop instead of width/height for responsive sizing
    - Add `sizes="(max-width: 768px) 100vw, 400px"` for responsive optimization
    - Add `unoptimized={imagePreview.startsWith('data:')}` to handle base64 images
    - Keep the same `className="object-cover"` for styling
    - Ensure the parent div maintains `relative` positioning for the `fill` prop to work
    - _Requirements: 4.1, 4.2_

- [ ] 5. Verify all fixes
  - Run TypeScript compiler to verify no type errors remain
  - Run ESLint to verify no warnings remain
  - Manually test the component to ensure functionality is preserved
  - Test image upload with both external URLs and base64 data
  - Test category and supplier creation
  - Test SKU generation

## Notes

- All tasks are required for complete error resolution
- Tasks should be completed in order as some depend on previous changes
- The changes are focused on type safety and code quality without altering functionality
- After completion, the component should compile without errors and pass all ESLint checks
