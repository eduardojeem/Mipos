# Requirements Document

## Introduction

This specification addresses TypeScript type errors and ESLint warnings in the ProductEditModal component. The component currently has multiple type safety issues including improper use of `any` types, type inference problems with Supabase queries, and ESLint violations. These issues compromise code quality, type safety, and maintainability.

## Glossary

- **ProductEditModal**: React component for creating and editing product information
- **Supabase_Client**: Database client for querying and mutating data
- **Type_Inference**: TypeScript's ability to automatically determine types from context
- **ESLint**: JavaScript/TypeScript linting tool for code quality
- **Type_Assertion**: Explicit type annotation to override TypeScript's inference

## Requirements

### Requirement 1: Fix Type Safety Issues

**User Story:** As a developer, I want proper TypeScript types throughout the component, so that type errors are caught at compile time and code is more maintainable.

#### Acceptance Criteria

1. WHEN querying organization members from Supabase, THE System SHALL use proper type annotations instead of `any` type
2. WHEN deleting the `has_offer` property from productData, THE System SHALL use a type-safe approach instead of type assertion with `any`
3. WHEN querying products by SKU, THE System SHALL properly type the response to avoid `never` type inference errors
4. WHEN inserting categories into Supabase, THE System SHALL properly type the insert payload to match the database schema
5. WHEN inserting suppliers into Supabase, THE System SHALL properly type the insert payload to match the database schema

### Requirement 2: Fix Variable Declaration Issues

**User Story:** As a developer, I want variables to use appropriate declaration keywords, so that code follows best practices and prevents accidental reassignment.

#### Acceptance Criteria

1. WHEN declaring the `baseSku` variable that is not reassigned, THE System SHALL use `const` instead of `let`

### Requirement 3: Remove Unused Code

**User Story:** As a developer, I want to remove unused variables and functions, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN the `handleImageUrlChange` function is defined but not used, THE System SHALL remove it from the component
2. WHEN the `getCategoryName` function is defined but not used, THE System SHALL remove it from the component
3. WHEN the `onCheckedChange` callback receives a `checked` parameter, THE System SHALL use the parameter or mark it as intentionally unused

### Requirement 4: Fix Next.js Image Optimization

**User Story:** As a developer, I want to use Next.js optimized Image component, so that images are automatically optimized for performance.

#### Acceptance Criteria

1. WHEN displaying the product image preview, THE System SHALL use Next.js `Image` component instead of native `<img>` tag
2. WHEN using the Next.js Image component, THE System SHALL handle both external URLs and base64 data URLs appropriately
3. WHEN the image fails to load, THE System SHALL provide appropriate fallback handling
