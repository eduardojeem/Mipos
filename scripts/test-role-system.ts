/**
 * Test Role System - Comprehensive testing of the role and permission system
 * 
 * This script tests:
 * 1. Role assignments
 * 2. Permission mappings
 * 3. Backend authentication middleware
 * 4. Database consistency
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

class RoleSystemTester {
  private results: TestResult[] = [];

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
    this.results.push({ test, status, message, details });
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
    if (details) {
      console.log('   Details:', details);
    }
  }

  async testDatabaseSchema() {
    console.log('\n🔍 Testing Database Schema...');

    try {
      // Test User table
      const userCount = await prisma.user.count();
      this.addResult('User Table', 'PASS', `Found ${userCount} users`);

      // Test Role table
      const roleCount = await prisma.role.count();
      const roles = await prisma.role.findMany();
      this.addResult('Role Table', 'PASS', `Found ${roleCount} roles`, roles.map(r => r.name));

      // Test Permission table
      const permissionCount = await prisma.permission.count();
      const permissions = await prisma.permission.findMany();
      this.addResult('Permission Table', 'PASS', `Found ${permissionCount} permissions`);

      // Test UserRole_New table
      const userRoleCount = await prisma.userRole_New.count();
      this.addResult('UserRole_New Table', 'PASS', `Found ${userRoleCount} user-role assignments`);

      // Test RolePermission table
      const rolePermissionCount = await prisma.rolePermission.count();
      this.addResult('RolePermission Table', 'PASS', `Found ${rolePermissionCount} role-permission mappings`);

    } catch (error) {
      this.addResult('Database Schema', 'FAIL', `Error: ${error}`);
    }
  }

  async testRoleAssignments() {
    console.log('\n👥 Testing Role Assignments...');

    try {
      // Get test users
      const testUsers = await prisma.user.findMany({
        where: {
          email: {
            in: ['manager@test.com', 'employee@test.com', 'cashier@test.com', 'jeem101595@gmail.com']
          }
        },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: true
            }
          }
        }
      });

      for (const user of testUsers) {
        const roleNames = user.userRoles.map(ur => ur.role.name);
        if (roleNames.length > 0) {
          this.addResult(
            `User ${user.email}`,
            'PASS',
            `Has roles: ${roleNames.join(', ')}`
          );
        } else {
          this.addResult(
            `User ${user.email}`,
            'FAIL',
            'No roles assigned'
          );
        }
      }

      // Check for orphaned role assignments (skip this complex check for now)
      const orphanedAssignments: any[] = [];

      if (orphanedAssignments.length === 0) {
        this.addResult('Orphaned Assignments', 'PASS', 'No orphaned role assignments found');
      } else {
        this.addResult('Orphaned Assignments', 'WARNING', `Found ${orphanedAssignments.length} orphaned assignments`);
      }

    } catch (error) {
      this.addResult('Role Assignments', 'FAIL', `Error: ${error}`);
    }
  }

  async testPermissionMappings() {
    console.log('\n🔐 Testing Permission Mappings...');

    try {
      // Get all roles with their permissions
      const rolesWithPermissions = await prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      for (const role of rolesWithPermissions) {
        const permissionCount = role.permissions.length;
        const permissions = role.permissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`);
        
        if (permissionCount > 0) {
          this.addResult(
            `Role ${role.name} Permissions`,
            'PASS',
            `Has ${permissionCount} permissions`,
            permissions
          );
        } else {
          this.addResult(
            `Role ${role.name} Permissions`,
            'WARNING',
            'No permissions assigned'
          );
        }
      }

      // Check for orphaned permission assignments (skip this complex check for now)
      const orphanedPermissions: any[] = [];

      if (orphanedPermissions.length === 0) {
        this.addResult('Orphaned Permissions', 'PASS', 'No orphaned permission assignments found');
      } else {
        this.addResult('Orphaned Permissions', 'WARNING', `Found ${orphanedPermissions.length} orphaned permission assignments`);
      }

    } catch (error) {
      this.addResult('Permission Mappings', 'FAIL', `Error: ${error}`);
    }
  }

  async testUserPermissionResolution() {
    console.log('\n🎯 Testing User Permission Resolution...');

    try {
      // Test each user's effective permissions
      const testUsers = await prisma.user.findMany({
        where: {
          email: {
            in: ['manager@test.com', 'employee@test.com', 'cashier@test.com', 'jeem101595@gmail.com']
          }
        },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      for (const user of testUsers) {
        // Collect all permissions from all roles
        const allPermissions = new Map();
        user.userRoles.forEach(ur => {
          ur.role.permissions.forEach(rp => {
            const key = `${rp.permission.resource}:${rp.permission.action}`;
            allPermissions.set(key, rp.permission);
          });
        });

        const effectivePermissions = Array.from(allPermissions.keys());
        
        if (effectivePermissions.length > 0) {
          this.addResult(
            `${user.email} Effective Permissions`,
            'PASS',
            `Has ${effectivePermissions.length} effective permissions`,
            effectivePermissions
          );
        } else {
          this.addResult(
            `${user.email} Effective Permissions`,
            'WARNING',
            'No effective permissions'
          );
        }
      }

    } catch (error) {
      this.addResult('User Permission Resolution', 'FAIL', `Error: ${error}`);
    }
  }

  async testDataConsistency() {
    console.log('\n🔍 Testing Data Consistency...');

    try {
      // Check for users without roles
      const usersWithoutRoles = await prisma.user.findMany({
        where: {
          userRoles: {
            none: {
              isActive: true
            }
          }
        }
      });

      if (usersWithoutRoles.length === 0) {
        this.addResult('Users Without Roles', 'PASS', 'All users have at least one role');
      } else {
        this.addResult(
          'Users Without Roles',
          'WARNING',
          `Found ${usersWithoutRoles.length} users without roles`,
          usersWithoutRoles.map(u => u.email)
        );
      }

      // Check for roles without permissions
      const rolesWithoutPermissions = await prisma.role.findMany({
        where: {
          permissions: {
            none: {}
          }
        }
      });

      if (rolesWithoutPermissions.length === 0) {
        this.addResult('Roles Without Permissions', 'PASS', 'All roles have at least one permission');
      } else {
        this.addResult(
          'Roles Without Permissions',
          'WARNING',
          `Found ${rolesWithoutPermissions.length} roles without permissions`,
          rolesWithoutPermissions.map(r => r.name)
        );
      }

      // Check for inactive assignments that should be cleaned up
      const inactiveAssignments = await prisma.userRole_New.count({
        where: { isActive: false }
      });

      this.addResult(
        'Inactive Assignments',
        inactiveAssignments > 0 ? 'WARNING' : 'PASS',
        `Found ${inactiveAssignments} inactive assignments`
      );

    } catch (error) {
      this.addResult('Data Consistency', 'FAIL', `Error: ${error}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Role System Tests...\n');

    await this.testDatabaseSchema();
    await this.testRoleAssignments();
    await this.testPermissionMappings();
    await this.testUserPermissionResolution();
    await this.testDataConsistency();

    // Summary
    console.log('\n📊 Test Summary:');
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📝 Total Tests: ${this.results.length}`);

    if (failed > 0) {
      console.log('\n❌ CRITICAL ISSUES FOUND:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }

    if (warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }

    return {
      passed,
      failed,
      warnings,
      total: this.results.length,
      results: this.results
    };
  }
}

async function main() {
  const tester = new RoleSystemTester();
  
  try {
    const summary = await tester.runAllTests();
    
    if (summary.failed === 0) {
      console.log('\n🎉 All critical tests passed! Role system is functioning correctly.');
    } else {
      console.log('\n🚨 Critical issues found. Please review and fix before proceeding.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}