'use client';

import { Building2, Check, ChevronDown, Loader2, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBranchContext, type BranchOption } from '@/hooks/use-branch-context';

interface BranchSelectorProps {
  compact?: boolean;
}

export function BranchSelector({ compact = false }: BranchSelectorProps) {
  const { branchId, branchName, branches, isLoading, selectBranch, clearBranch, isMultiBranch } = useBranchContext();

  // Don't render if there's only one or no branches (no switching needed)
  if (!isMultiBranch && !isLoading) return null;

  const label = branchName ?? 'Sucursal';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className={cn(
            'gap-2 border-slate-200/70 bg-slate-50/80 dark:border-slate-700/50 dark:bg-slate-800/50',
            'hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
            'text-slate-700 dark:text-slate-300 transition-all',
            compact ? 'h-8 px-2 text-xs' : 'h-9 px-3 text-sm'
          )}
          aria-label="Cambiar sucursal activa"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          ) : (
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          )}
          <span className="hidden sm:inline max-w-[120px] truncate font-medium">
            {branchId ? label : 'Todas'}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          Sucursal activa
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* All branches option */}
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => clearBranch()}
        >
          <span className="flex h-5 w-5 items-center justify-center">
            {!branchId && <Check className="h-3.5 w-3.5 text-primary" />}
          </span>
          <span className="text-sm">Todas las sucursales</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {branches.map((branch: BranchOption) => (
          <DropdownMenuItem
            key={branch.id}
            className={cn('gap-2 cursor-pointer', !branch.is_active && 'opacity-50')}
            disabled={!branch.is_active}
            onClick={() => selectBranch(branch)}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {branchId === branch.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </span>
            <span className="flex-1 truncate text-sm">{branch.name}</span>
            {!branch.is_active && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">Inactiva</Badge>
            )}
          </DropdownMenuItem>
        ))}

        {branchId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-muted-foreground text-xs"
              onClick={() => clearBranch()}
            >
              <X className="h-3.5 w-3.5" />
              Limpiar selección
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
