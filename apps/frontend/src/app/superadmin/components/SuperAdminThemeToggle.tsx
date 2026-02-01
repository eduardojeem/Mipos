"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function SuperAdminThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);

    const getCurrentIcon = () => {
        switch (theme) {
            case "light":
                return Sun;
            case "dark":
                return Moon;
            default:
                return Monitor;
        }
    };

    const Icon = getCurrentIcon();

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-200"
                >
                    <Icon className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                    <span className="hidden sm:inline capitalize">{theme || "Sistema"}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-white/20 dark:border-slate-700/50 shadow-2xl"
            >
                <DropdownMenuItem
                    onClick={() => {
                        setTheme("light");
                        setOpen(false);
                    }}
                    className={cn(
                        "gap-2 cursor-pointer transition-all duration-200",
                        theme === "light" &&
                        "bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20"
                    )}
                >
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Modo Claro</span>
                    {theme === "light" && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse" />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => {
                        setTheme("dark");
                        setOpen(false);
                    }}
                    className={cn(
                        "gap-2 cursor-pointer transition-all duration-200",
                        theme === "dark" &&
                        "bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20"
                    )}
                >
                    <Moon className="h-4 w-4 text-indigo-500" />
                    <span>Modo Oscuro</span>
                    {theme === "dark" && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse" />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => {
                        setTheme("system");
                        setOpen(false);
                    }}
                    className={cn(
                        "gap-2 cursor-pointer transition-all duration-200",
                        theme === "system" &&
                        "bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20"
                    )}
                >
                    <Monitor className="h-4 w-4 text-slate-500" />
                    <span>Sistema</span>
                    {theme === "system" && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse" />
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
