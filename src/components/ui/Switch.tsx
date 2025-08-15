// Switch.tsx - Mobile-Optimized Switch Component
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils/cn"

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  size?: 'sm' | 'md' | 'lg'
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    sm: {
      root: "h-5 w-9",
      thumb: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
    },
    md: {
      root: "h-6 w-11", 
      thumb: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
    },
    lg: {
      root: "h-7 w-12",
      thumb: "h-6 w-6 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
    }
  }

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        "hover:data-[state=checked]:bg-primary/90 hover:data-[state=unchecked]:bg-input/80",
        "active:scale-95 transition-transform duration-100",
        sizeClasses[size].root,
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
          "data-[state=checked]:bg-background data-[state=unchecked]:bg-background",
          sizeClasses[size].thumb
        )}
      />
    </SwitchPrimitives.Root>
  )
})

Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }