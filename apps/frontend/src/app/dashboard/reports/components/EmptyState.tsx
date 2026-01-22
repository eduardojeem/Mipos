'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed dark:bg-slate-900/40 dark:border-slate-800/50">
      <CardContent className="p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center"
        >
          <div className="p-4 rounded-full bg-muted dark:bg-slate-900/50 mb-4">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
          {action && (
            <Button onClick={action.onClick} className="gap-2 dark:bg-slate-900/50 dark:border-slate-800/50">
              {action.label}
            </Button>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}
