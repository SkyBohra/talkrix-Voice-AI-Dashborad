import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "link" | "glass" | "glass-primary" | "destructive" | "neon"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        const Comp = "button"
        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-0",
                    variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
                    variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                    variant === "outline" && "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                    variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
                    variant === "link" && "text-primary underline-offset-4 hover:underline",
                    variant === "glass" && "glass-panel hover:bg-white/10 text-white border-white/10 hover:border-white/20 transition-all",
                    variant === "glass-primary" && "glass-button-primary text-white",
                    variant === "neon" && "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all",

                    size === "default" && "h-11 px-5 py-2.5",
                    size === "sm" && "h-9 rounded-md px-3",
                    size === "lg" && "h-12 rounded-md px-8 text-base",
                    size === "icon" && "h-10 w-10",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
