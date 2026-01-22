"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = exports.PERMISSIONS = exports.getRoleManager = exports.RoleManager = void 0;
exports.getCurrentUserPermissions = getCurrentUserPermissions;
exports.checkCurrentUserPermission = checkCurrentUserPermission;
exports.checkCurrentUserRole = checkCurrentUserRole;
const client_1 = require("@prisma/client");
const auth_helpers_nextjs_1 = require("@supabase/auth-helpers-nextjs");
const headers_1 = require("next/headers");
const react_1 = require("react");
const prisma = new client_1.PrismaClient();
class RoleManager {
    constructor() { }
    static getInstance() {
        if (!RoleManager.instance) {
            RoleManager.instance = new RoleManager();
        }
        return RoleManager.instance;
    }
    async getCurrentUser() {
        try {
            const supabase = (0, auth_helpers_nextjs_1.createServerComponentClient)({ cookies: headers_1.cookies });
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                return null;
            }
            return await this.getUserWithRoles(session.user.id);
        }
        catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }
    async getUserWithRoles(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    userRoles: {
                        where: {
                            isActive: true,
                            OR: [
                                { expiresAt: null },
                                { expiresAt: { gt: new Date() } }
                            ]
                        },
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
            if (!user) {
                return null;
            }
            const roles = user.userRoles.map(ur => ({
                id: ur.role.id,
                name: ur.role.name,
                displayName: ur.role.displayName,
                description: ur.role.description || undefined,
                permissions: ur.role.permissions.map(rp => ({
                    name: rp.permission.name,
                    displayName: rp.permission.displayName,
                    resource: rp.permission.resource,
                    action: rp.permission.action
                }))
            }));
            const allPermissions = new Map();
            roles.forEach(role => {
                role.permissions.forEach(permission => {
                    allPermissions.set(permission.name, permission);
                });
            });
            return {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                roles,
                permissions: Array.from(allPermissions.values()),
                legacyRole: user.role
            };
        }
        catch (error) {
            console.error('Error getting user with roles:', error);
            return null;
        }
    }
    async hasPermission(userId, permissionName) {
        try {
            const result = await prisma.$queryRaw `
        SELECT check_user_permission(${userId}, ${permissionName}) as has_permission
      `;
            return result[0]?.has_permission || false;
        }
        catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }
    async hasAnyPermission(userId, permissions) {
        try {
            for (const permission of permissions) {
                if (await this.hasPermission(userId, permission)) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            console.error('Error checking any permission:', error);
            return false;
        }
    }
    async hasAllPermissions(userId, permissions) {
        try {
            for (const permission of permissions) {
                if (!(await this.hasPermission(userId, permission))) {
                    return false;
                }
            }
            return true;
        }
        catch (error) {
            console.error('Error checking all permissions:', error);
            return false;
        }
    }
    async hasRole(userId, roleName) {
        try {
            const userRole = await prisma.userRole_New.findFirst({
                where: {
                    userId,
                    isActive: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ],
                    role: {
                        name: roleName,
                        isActive: true
                    }
                }
            });
            return !!userRole;
        }
        catch (error) {
            console.error('Error checking role:', error);
            return false;
        }
    }
    async assignRole(userId, roleName, assignedBy, expiresAt) {
        try {
            const role = await prisma.role.findUnique({
                where: { name: roleName, isActive: true }
            });
            if (!role) {
                throw new Error(`Role ${roleName} not found`);
            }
            const existingUserRole = await prisma.userRole_New.findUnique({
                where: {
                    userId_roleId: {
                        userId,
                        roleId: role.id
                    }
                }
            });
            if (existingUserRole) {
                await prisma.userRole_New.update({
                    where: { id: existingUserRole.id },
                    data: {
                        isActive: true,
                        assignedBy,
                        expiresAt,
                        assignedAt: new Date()
                    }
                });
            }
            else {
                await prisma.userRole_New.create({
                    data: {
                        userId,
                        roleId: role.id,
                        assignedBy,
                        expiresAt,
                        isActive: true
                    }
                });
            }
            await this.createAuditLog(userId, 'ROLE_ASSIGNED', 'user_roles', undefined, { roleName }, assignedBy);
            return true;
        }
        catch (error) {
            console.error('Error assigning role:', error);
            return false;
        }
    }
    async removeRole(userId, roleName, removedBy) {
        try {
            const role = await prisma.role.findUnique({
                where: { name: roleName }
            });
            if (!role) {
                throw new Error(`Role ${roleName} not found`);
            }
            const userRole = await prisma.userRole_New.findUnique({
                where: {
                    userId_roleId: {
                        userId,
                        roleId: role.id
                    }
                }
            });
            if (userRole) {
                await prisma.userRole_New.update({
                    where: { id: userRole.id },
                    data: { isActive: false }
                });
                await this.createAuditLog(userId, 'ROLE_REMOVED', 'user_roles', userRole.id, { roleName }, removedBy);
            }
            return true;
        }
        catch (error) {
            console.error('Error removing role:', error);
            return false;
        }
    }
    async getAllRoles() {
        try {
            const roles = await prisma.role.findMany({
                where: { isActive: true },
                include: {
                    permissions: {
                        include: {
                            permission: {
                                where: { isActive: true }
                            }
                        }
                    }
                },
                orderBy: { displayName: 'asc' }
            });
            return roles.map(role => ({
                id: role.id,
                name: role.name,
                displayName: role.displayName,
                description: role.description || undefined,
                permissions: role.permissions.map(rp => ({
                    name: rp.permission.name,
                    displayName: rp.permission.displayName,
                    resource: rp.permission.resource,
                    action: rp.permission.action
                }))
            }));
        }
        catch (error) {
            console.error('Error getting all roles:', error);
            return [];
        }
    }
    async getAllPermissions() {
        try {
            const permissions = await prisma.permission.findMany({
                where: { isActive: true },
                orderBy: [{ resource: 'asc' }, { action: 'asc' }]
            });
            return permissions.map(p => ({
                name: p.name,
                displayName: p.displayName,
                resource: p.resource,
                action: p.action
            }));
        }
        catch (error) {
            console.error('Error getting all permissions:', error);
            return [];
        }
    }
    async createRole(name, displayName, description, permissions = [], createdBy) {
        try {
            const role = await prisma.role.create({
                data: {
                    name,
                    displayName,
                    description,
                    isSystemRole: false,
                    isActive: true
                }
            });
            if (permissions.length > 0) {
                await this.assignPermissionsToRole(role.id, permissions, createdBy);
            }
            await this.createAuditLog(createdBy || 'system', 'ROLE_CREATED', 'roles', role.id, { name, displayName, description, permissions }, createdBy);
            return role.id;
        }
        catch (error) {
            console.error('Error creating role:', error);
            return null;
        }
    }
    async assignPermissionsToRole(roleId, permissionNames, grantedBy) {
        try {
            const permissions = await prisma.permission.findMany({
                where: {
                    name: { in: permissionNames },
                    isActive: true
                }
            });
            const rolePermissions = permissions.map(permission => ({
                roleId,
                permissionId: permission.id,
                grantedBy
            }));
            await prisma.rolePermission.createMany({
                data: rolePermissions,
                skipDuplicates: true
            });
            return true;
        }
        catch (error) {
            console.error('Error assigning permissions to role:', error);
            return false;
        }
    }
    async createAuditLog(userId, action, resourceType, resourceId, values, performedBy) {
        try {
            await prisma.roleAuditLog.create({
                data: {
                    userId,
                    action,
                    resourceType,
                    resourceId,
                    newValues: values ? JSON.parse(JSON.stringify(values)) : null,
                    performedBy
                }
            });
        }
        catch (error) {
            console.error('Error creating audit log:', error);
        }
    }
    async updateSessionActivity(userId, sessionId) {
        try {
            const session = await prisma.userSession.findFirst({
                where: {
                    userId,
                    isActive: true,
                    ...(sessionId && { supabaseSessionId: sessionId })
                }
            });
            if (session) {
                await prisma.userSession.update({
                    where: { id: session.id },
                    data: { lastActivity: new Date() }
                });
            }
        }
        catch (error) {
            console.error('Error updating session activity:', error);
        }
    }
    async cleanupExpired() {
        try {
            await prisma.userSession.updateMany({
                where: {
                    isActive: true,
                    expiresAt: { lt: new Date() }
                },
                data: { isActive: false }
            });
            await prisma.userRole_New.updateMany({
                where: {
                    isActive: true,
                    expiresAt: { lt: new Date() }
                },
                data: { isActive: false }
            });
        }
        catch (error) {
            console.error('Error cleaning up expired data:', error);
        }
    }
}
exports.RoleManager = RoleManager;
exports.getRoleManager = (0, react_1.cache)(() => RoleManager.getInstance());
async function getCurrentUserPermissions() {
    const roleManager = (0, exports.getRoleManager)();
    const user = await roleManager.getCurrentUser();
    return user?.permissions.map(p => p.name) || [];
}
async function checkCurrentUserPermission(permission) {
    const roleManager = (0, exports.getRoleManager)();
    const user = await roleManager.getCurrentUser();
    if (!user)
        return false;
    return roleManager.hasPermission(user.id, permission);
}
async function checkCurrentUserRole(roleName) {
    const roleManager = (0, exports.getRoleManager)();
    const user = await roleManager.getCurrentUser();
    if (!user)
        return false;
    return roleManager.hasRole(user.id, roleName);
}
exports.PERMISSIONS = {
    USERS_CREATE: 'users.create',
    USERS_READ: 'users.read',
    USERS_UPDATE: 'users.update',
    USERS_DELETE: 'users.delete',
    PRODUCTS_CREATE: 'products.create',
    PRODUCTS_READ: 'products.read',
    PRODUCTS_UPDATE: 'products.update',
    PRODUCTS_DELETE: 'products.delete',
    SALES_CREATE: 'sales.create',
    SALES_READ: 'sales.read',
    SALES_UPDATE: 'sales.update',
    SALES_DELETE: 'sales.delete',
    INVENTORY_READ: 'inventory.read',
    INVENTORY_UPDATE: 'inventory.update',
    REPORTS_READ: 'reports.read',
    REPORTS_EXPORT: 'reports.export',
    SYSTEM_CONFIG: 'system.config',
    SYSTEM_BACKUP: 'system.backup',
    ROLES_MANAGE: 'roles.manage'
};
exports.ROLES = {
    ADMIN: 'ADMIN',
    CASHIER: 'CASHIER',
    MANAGER: 'MANAGER',
    INVENTORY_MANAGER: 'INVENTORY_MANAGER',
    VIEWER: 'VIEWER'
};
