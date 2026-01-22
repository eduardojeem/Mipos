'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, LucideIcon } from 'lucide-react';

export interface Step {
    id: number;
    title: string;
    icon: LucideIcon;
    optional?: boolean;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
    className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
    return (
        <div className={cn("w-full", className)}>
            {/* Desktop: Horizontal stepper */}
            <div className="hidden md:block">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        const isUpcoming = currentStep < step.id;

                        return (
                            <React.Fragment key={step.id}>
                                {/* Step */}
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    {/* Circle */}
                                    <div
                                        className={cn(
                                            "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300",
                                            isCompleted && "bg-primary border-primary shadow-lg shadow-primary/20",
                                            isCurrent && "bg-primary/10 border-primary border-4 scale-110 shadow-xl shadow-primary/30",
                                            isUpcoming && "bg-muted border-muted-foreground/30"
                                        )}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-6 h-6 text-white" />
                                        ) : (
                                            <step.icon
                                                className={cn(
                                                    "w-6 h-6 transition-colors",
                                                    isCurrent && "text-primary",
                                                    isUpcoming && "text-muted-foreground"
                                                )}
                                            />
                                        )}

                                        {/* Pulse animation for current step */}
                                        {isCurrent && (
                                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className="text-center">
                                        <p
                                            className={cn(
                                                "text-sm font-medium transition-colors",
                                                isCurrent && "text-primary font-semibold",
                                                isCompleted && "text-foreground",
                                                isUpcoming && "text-muted-foreground"
                                            )}
                                        >
                                            {step.title}
                                        </p>
                                        {step.optional && (
                                            <p className="text-xs text-muted-foreground">(Opcional)</p>
                                        )}
                                    </div>
                                </div>

                                {/* Connector line */}
                                {index < steps.length - 1 && (
                                    <div className="flex-1 h-0.5 mx-2 mb-8">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-500",
                                                currentStep > step.id
                                                    ? "bg-primary"
                                                    : "bg-muted-foreground/30"
                                            )}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Mobile: Compact stepper */}
            <div className="md:hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {steps.map((step, index) => {
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;

                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Mini circle */}
                                    <div
                                        className={cn(
                                            "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                                            isCompleted && "bg-primary border-primary",
                                            isCurrent && "bg-primary/10 border-primary border-4",
                                            !isCurrent && !isCompleted && "bg-muted border-muted-foreground/30"
                                        )}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-4 h-4 text-white" />
                                        ) : (
                                            <span
                                                className={cn(
                                                    "text-xs font-bold",
                                                    isCurrent && "text-primary",
                                                    !isCurrent && "text-muted-foreground"
                                                )}
                                            >
                                                {step.id}
                                            </span>
                                        )}
                                    </div>

                                    {/* Label (only for current step on mobile) */}
                                    {isCurrent && (
                                        <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                            {step.title}
                                        </span>
                                    )}
                                </div>

                                {/* Connector */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={cn(
                                            "h-0.5 w-8 flex-shrink-0 transition-all",
                                            currentStep > step.id
                                                ? "bg-primary"
                                                : "bg-muted-foreground/30"
                                        )}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
