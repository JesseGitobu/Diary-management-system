import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"

const buttonVariants = cva(
  // Base button styles - matching your CSS
  "inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-md border outline-none cursor-pointer transition-all duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:translate-y-0.5",
  {
    variants: {
      variant: {
        // Default button - matches .button class
        default: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-blue-500 focus-visible:border-blue-500 active:bg-gray-100",
        
        // Primary button - matches .primary-button class  
        primary: "bg-blue-500 text-white border-blue-500 hover:bg-blue-600 hover:border-blue-600 focus-visible:ring-blue-500 focus-visible:border-blue-800 active:bg-blue-800",
        
        // Additional variants for flexibility
        destructive: "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600 focus-visible:ring-red-500 active:bg-red-700",
        
        outline: "bg-transparent text-blue-600 border-blue-500 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-blue-500 active:bg-blue-100",
        
        secondary: "bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200 hover:border-gray-400 focus-visible:ring-gray-500 active:bg-gray-300",
        
        ghost: "bg-transparent text-gray-700 border-transparent hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500 active:bg-gray-200",
        
        link: "bg-transparent text-blue-600 border-transparent hover:text-blue-700 hover:underline focus-visible:ring-blue-500 active:text-blue-800",
      },
      size: {
        default: "px-6 py-3 text-sm",
        sm: "px-3 py-2 text-xs",
        lg: "px-8 py-4 text-base",
        icon: "w-10 h-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  primary?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, primary, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // If primary prop is true, override the variant
    const finalVariant = primary ? "primary" : variant
    
    return (
      <Comp
        className={cn(buttonVariants({ variant: finalVariant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }