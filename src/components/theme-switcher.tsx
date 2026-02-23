"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeSwitcher() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-zinc-600 hover:bg-black/5 dark:border-white/15 dark:text-zinc-400 dark:hover:bg-white/10"
                aria-label="Toggle theme"
            >
                <span className="h-4 w-4" />
            </button>
        );
    }

    return (
        <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-zinc-600 hover:bg-black/5 dark:border-white/15 dark:text-zinc-400 dark:hover:bg-white/10"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
        >
            {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
            ) : (
                <Moon className="h-4 w-4" />
            )}
        </button>
    );
}
