'use client';

import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface InformativeEmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    suggestions: string[];
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function InformativeEmptyState({
    icon: Icon,
    title,
    description,
    suggestions,
    action
}: InformativeEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6 shadow-sm">
                <Icon className="w-10 h-10 text-muted-foreground" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold mb-2 text-center">{title}</h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                {description}
            </p>

            {/* Suggestions Box */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 max-w-md mb-6">
                <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">💡</span>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Sugerencias:
                    </p>
                </div>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 ml-7">
                    {suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{suggestion}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Action Button */}
            {action && (
                <Button
                    onClick={action.onClick}
                    variant="default"
                    className="shadow-md"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
}
