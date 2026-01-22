'use client';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface MetricTooltipProps {
    title: string;
    explanation: string;
}

export function MetricTooltip({ title, explanation }: MetricTooltipProps) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button className="ml-1.5 inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full p-0.5">
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    className="max-w-xs bg-popover text-popover-foreground border shadow-md"
                    side="top"
                >
                    <p className="font-semibold text-sm mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
