import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS, type MovementType } from '../utils/movementTypes';

interface MovementTypeBadgeProps {
    type: string;
    showPOSBadge?: boolean;
    referenceType?: string;
}

export function MovementTypeBadge({ type, showPOSBadge = false, referenceType }: MovementTypeBadgeProps) {
    const label = MOVEMENT_TYPE_LABELS[type as MovementType] || type;
    const variant = MOVEMENT_TYPE_COLORS[type as MovementType] || 'secondary';

    return (
        <div className="flex items-center gap-2">
            <Badge variant={variant}>{label}</Badge>
            {showPOSBadge && referenceType === 'SALE' && (
                <Badge variant="outline" className="text-xs">
                    POS
                </Badge>
            )}
        </div>
    );
}
