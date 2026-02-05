# Tasks: Admin Settings SaaS Multitenancy Implementation

**Feature**: audit-admin-settings-saas  
**Status**: Ready for Implementation  
**Created**: 2026-02-05

---

## Phase 1: Database Migration

- [x] 1. Create database migration script
  - [x] 1.1 Add organization_id column to settings table (nullable)
  - [x] 1.2 Create data migration to assign existing configs to organizations
  - [x] 1.3 Make organization_id NOT NULL after migration
  - [x] 1.4 Update unique constraint to (organization_id, key)
  - [x] 1.5 Create indexes on organization_id columns

- [x] 2. Create RLS policies for settings table
  - [x] 2.1 Create is_super_admin() helper function
  - [x] 2.2 Create get_my_org_ids() helper function
  - [x] 2.3 Create SELECT policy for organization isolation
  - [x] 2.4 Create INSERT policy for admins
  - [x] 2.5 Create UPDATE policy for admins
  - [x] 2.6 Create DELETE policy for admins
  - [x] 2.7 Enable RLS on settings table

- [x] 3. Execute and verify migration
  - [x] 3.1 Backup settings table before migration
  - [x] 3.2 Run migration script in development
  - [x] 3.3 Verify data integrity after migration
  - [x] 3.4 Test RLS policies with different users
  - [x] 3.5 Verify indexes are created and used

---

## Phase 2: API Endpoint Updates

- [x] 4. Update /api/business-config/route.ts
  - [x] 4.1 Replace old assertAdmin format with new format
  - [x] 4.2 Extract organizationId using getUserOrganizationId()
  - [x] 4.3 Support super admin organization override via query param
  - [x] 4.4 Replace createAdminClient() with createClient()
  - [x] 4.5 Add organization_id filter to all queries
  - [x] 4.6 Implement per-organization caching
  - [x] 4.7 Update GET endpoint with organization filtering
  - [x] 4.8 Update PUT endpoint with organization filtering
  - [x] 4.9 Add organization context to audit logs
  - [x] 4.10 Add error handling for missing organization

- [x] 5. Update /api/business-config/reset/route.ts
  - [x] 5.1 Replace old assertAdmin format with new format
  - [x] 5.2 Extract organizationId using getUserOrganizationId()
  - [x] 5.3 Support super admin organization override
  - [x] 5.4 Replace createAdminClient() with createClient()
  - [x] 5.5 Add organization_id to reset operation
  - [x] 5.6 Add organization context to audit logs
  - [x] 5.7 Clear organization-specific cache on reset

- [x] 6. Deprecate business-config utility
  - [x] 6.1 Move validateBusinessConfig() to separate validation file
  - [x] 6.2 Mark business-config.ts as deprecated with comments
  - [x] 6.3 Update all imports to use route handlers directly
  - [x] 6.4 Remove global cache functions
  - [x] 6.5 Remove createAdminClient() usage

---

## Phase 3: Frontend Updates

- [ ] 7. Update settings page UI
  - [ ] 7.1 Add state for organization name and super admin flag
  - [ ] 7.2 Fetch organization info on component mount
  - [ ] 7.3 Display organization name in page header
  - [ ] 7.4 Add visual indicator for organization context
  - [ ] 7.5 Update error messages to be organization-aware

- [ ] 8. Update BusinessConfigContext
  - [ ] 8.1 Ensure API calls are organization-aware
  - [ ] 8.2 Handle organization-scoped caching in context
  - [ ] 8.3 Add error handling for organization context issues
  - [ ] 8.4 Update updateConfig to handle organization context

---

## Phase 4: Testing

- [ ] 9. Write unit tests
  - [ ] 9.1 Test organization isolation in API endpoints
  - [ ] 9.2 Test super admin can access any organization
  - [ ] 9.3 Test regular admin cannot access other organizations
  - [ ] 9.4 Test RLS policies enforce organization boundaries
  - [ ] 9.5 Test cache isolation between organizations

- [ ] 10. Write integration tests
  - [ ] 10.1 Test end-to-end settings flow for single organization
  - [ ] 10.2 Test settings isolation between multiple organizations
  - [ ] 10.3 Test super admin organization switching
  - [ ] 10.4 Test audit logging captures organization context
  - [ ] 10.5 Test error handling for missing organization

- [ ] 11. Manual testing
  - [ ] 11.1 Create 2 test organizations with different configs
  - [ ] 11.2 Test as admin of organization 1
  - [ ] 11.3 Test as admin of organization 2
  - [ ] 11.4 Verify settings isolation between organizations
  - [ ] 11.5 Test as super admin with organization override
  - [ ] 11.6 Verify audit logs contain organization context
  - [ ] 11.7 Test performance with organization filtering

---

## Phase 5: Documentation and Deployment

- [ ] 12. Update documentation
  - [ ] 12.1 Document new organization-scoped settings model
  - [ ] 12.2 Document super admin organization override feature
  - [ ] 12.3 Update API documentation with organization parameters
  - [ ] 12.4 Document migration process for existing deployments
  - [ ] 12.5 Create troubleshooting guide for common issues

- [ ] 13. Deployment preparation
  - [ ] 13.1 Review all changes for production readiness
  - [ ] 13.2 Prepare rollback plan
  - [ ] 13.3 Create deployment checklist
  - [ ] 13.4 Schedule deployment window
  - [ ] 13.5 Notify stakeholders of changes

- [ ] 14. Deploy to production
  - [ ] 14.1 Deploy database migration
  - [ ] 14.2 Deploy API changes
  - [ ] 14.3 Deploy frontend changes
  - [ ] 14.4 Monitor error logs for issues
  - [ ] 14.5 Verify settings work correctly in production
  - [ ] 14.6 Test with real organizations
  - [ ] 14.7 Confirm audit logs are working

---

## Phase 6: Post-Deployment Verification

- [ ] 15. Production verification
  - [ ] 15.1 Verify all organizations can access their settings
  - [ ] 15.2 Verify organization isolation is working
  - [ ] 15.3 Verify super admin functionality works
  - [ ] 15.4 Check performance metrics
  - [ ] 15.5 Review audit logs for anomalies
  - [ ] 15.6 Gather user feedback
  - [ ] 15.7 Address any issues found

---

## Summary

**Total Tasks**: 15 main tasks, 87 subtasks  
**Estimated Time**: 3.5 hours  
**Priority**: High  
**Dependencies**: Previous multitenancy migrations must be applied

**Critical Path**:
1. Database Migration (Tasks 1-3)
2. API Updates (Tasks 4-6)
3. Frontend Updates (Tasks 7-8)
4. Testing (Tasks 9-11)
5. Deployment (Tasks 12-14)
6. Verification (Task 15)

**Risk Areas**:
- Data migration for existing settings
- RLS policy configuration
- Cache invalidation across organizations
- Super admin organization switching

**Success Criteria**:
- ✅ All settings queries filter by organization_id
- ✅ RLS policies enforce organization isolation
- ✅ No use of createAdminClient() for org-scoped data
- ✅ Settings page shows organization context
- ✅ All tests pass
- ✅ Production deployment successful
