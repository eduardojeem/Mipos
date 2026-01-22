'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { roleService, type RoleHierarchy, type Role } from '@/lib/services/role-service'
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Shield, 
  Crown,
  Settings,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoleHierarchyTreeProps {
  className?: string
  onRoleSelect?: (role: Role) => void
}

interface TreeNodeProps {
  node: RoleHierarchy
  onToggle: (nodeId: string) => void
  onRoleSelect?: (role: Role) => void
  onParentChange: (roleId: string, parentId: string | null) => void
  expandedNodes: Set<string>
  allRoles: Role[]
}

function TreeNode({ 
  node, 
  onToggle, 
  onRoleSelect, 
  onParentChange,
  expandedNodes, 
  allRoles 
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.role.id)
  const hasChildren = node.children.length > 0

  const handleParentChange = (newParentId: string) => {
    const parentId = newParentId === 'none' ? null : newParentId
    onParentChange(node.role.id, parentId)
  }

  const availableParents = allRoles.filter(role => 
    role.id !== node.role.id && 
    role.priority > (node.role.priority || 0) &&
    !role.parentRoleId // Solo roles raíz pueden ser padres por simplicidad
  )

  return (
    <div className="space-y-2">
      <div 
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg border transition-colors",
          "hover:bg-muted/50 cursor-pointer",
          node.role.isSystem && "bg-purple-50 border-purple-200"
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onToggle(node.role.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex items-center gap-2">
            {node.role.isSystem ? (
              <Crown className="h-4 w-4 text-purple-600" />
            ) : (
              <Shield className="h-4 w-4 text-blue-600" />
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span 
                  className="font-medium cursor-pointer hover:text-primary"
                  onClick={() => onRoleSelect?.(node.role)}
                >
                  {node.role.displayName}
                </span>
                <Badge variant={node.role.isActive ? "default" : "secondary"}>
                  {node.role.isActive ? "Activo" : "Inactivo"}
                </Badge>
                {node.role.userCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {node.role.userCount}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {node.role.permissions.length} permisos • Nivel {node.level} • Prioridad {node.role.priority}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={node.role.parentRoleId || 'none'}
            onValueChange={handleParentChange}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Sin padre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin padre</SelectItem>
              {availableParents.map(parent => (
                <SelectItem key={parent.id} value={parent.id}>
                  {parent.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-6 space-y-2 border-l-2 border-muted pl-4">
          {node.children.map(child => (
            <TreeNode
              key={child.role.id}
              node={child}
              onToggle={onToggle}
              onRoleSelect={onRoleSelect}
              onParentChange={onParentChange}
              expandedNodes={expandedNodes}
              allRoles={allRoles}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function RoleHierarchyTree({ className, onRoleSelect }: RoleHierarchyTreeProps) {
  const [hierarchy, setHierarchy] = useState<RoleHierarchy[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadHierarchy()
    loadAllRoles()
  }, [])

  const loadHierarchy = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await roleService.getRoleHierarchy()
      setHierarchy(data)
      
      // Expandir nodos raíz por defecto
      const rootNodes = new Set(data.map(node => node.role.id))
      setExpandedNodes(rootNodes)
    } catch (err: any) {
      setError(err.message || 'Error al cargar jerarquía')
    } finally {
      setLoading(false)
    }
  }

  const loadAllRoles = async () => {
    try {
      const roles = await roleService.getRoles(true)
      setAllRoles(roles)
    } catch (err) {
      console.error('Error loading all roles:', err)
    }
  }

  const handleToggle = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleParentChange = async (roleId: string, parentId: string | null) => {
    try {
      await roleService.setParentRole(roleId, parentId)
      await loadHierarchy() // Recargar jerarquía
    } catch (err: any) {
      console.error('Error updating parent role:', err)
      // Aquí podrías mostrar un toast de error
    }
  }

  const expandAll = () => {
    const allNodeIds = new Set<string>()
    const collectIds = (nodes: RoleHierarchy[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.role.id)
        collectIds(node.children)
      })
    }
    collectIds(hierarchy)
    setExpandedNodes(allNodeIds)
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Jerarquía de Roles</CardTitle>
          <CardDescription>
            Estructura organizacional de roles y permisos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <div className="ml-6">
                  <Skeleton className="h-12 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error en Jerarquía
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadHierarchy} variant="outline" size="sm">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Jerarquía de Roles
            </CardTitle>
            <CardDescription>
              Estructura organizacional de roles y permisos
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={expandAll} variant="outline" size="sm">
              Expandir Todo
            </Button>
            <Button onClick={collapseAll} variant="outline" size="sm">
              Contraer Todo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hierarchy.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay roles configurados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {hierarchy.map(node => (
              <TreeNode
                key={node.role.id}
                node={node}
                onToggle={handleToggle}
                onRoleSelect={onRoleSelect}
                onParentChange={handleParentChange}
                expandedNodes={expandedNodes}
                allRoles={allRoles}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}