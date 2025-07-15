import * as React from "react"
import { cn } from "@/lib/utils/cn"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'top' | 'right';
    iconClassName?: string;
  }
>(({ className, icon, iconPosition = 'top', iconClassName, children, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "flex space-y-1.5 p-6",
      iconPosition === 'left' ? "flex-row items-center space-x-4 space-y-0" : 
      iconPosition === 'right' ? "flex-row-reverse items-center space-x-reverse space-x-4 space-y-0" : 
      "flex-col"
    )} 
    {...props}
  >
    {icon && (
      <div className={cn(
        "flex-shrink-0",
        iconPosition === 'top' ? "mb-2" : "",
        iconClassName
      )}>
        {icon}
      </div>
    )}
    <div className={iconPosition !== 'top' ? "flex-1" : ""}>
      {children}
    </div>
  </div>
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    iconClassName?: string;
  }
>(({ className, icon, iconPosition = 'left', iconClassName, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      icon ? "flex items-center" : "",
      iconPosition === 'right' ? "flex-row-reverse" : "",
      className
    )}
    {...props}
  >
    {icon && (
      <span className={cn(
        "flex-shrink-0",
        iconPosition === 'left' ? "mr-2" : "ml-2",
        iconClassName
      )}>
        {icon}
      </span>
    )}
    <span>{children}</span>
  </h3>
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

// New specialized card components for common use cases
const IconCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon: React.ReactNode;
    title: string;
    description?: string;
    iconPosition?: 'top' | 'left' | 'right';
    iconClassName?: string;
    variant?: 'default' | 'feature' | 'stat' | 'action';
  }
>(({ 
  className, 
  icon, 
  title, 
  description, 
  iconPosition = 'top', 
  iconClassName,
  variant = 'default',
  children,
  ...props 
}, ref) => {
  return (
    <div 
      ref={ref} 
      className={cn(
        // Base card styles matching your CSS
        "w-[300px] border border-gray-300 bg-white rounded-lg p-5 text-center",
        "shadow-sm flex flex-col items-center min-w-[250px]",
        "transition-all duration-300 ease-in-out",
        // Hover effects
        "hover:-translate-y-1 hover:shadow-md",
        // Mobile responsive
        "max-[768px]:min-w-full",
        className
      )} 
      {...props}
    >
      {/* Icon Container */}
      <div className={cn(
        // Desktop icon container
        "inline-flex justify-center items-center w-[70px] h-[70px] rounded-full mb-4",
        "bg-blue-500/15", // Equivalent to #007bff27
        // Mobile icon container
        "max-[768px]:w-[55px] max-[768px]:h-[55px]",
        iconClassName
      )}>
        <div className={cn(
          // Desktop icon
          "text-[2.5rem] text-blue-500",
          // Mobile icon  
          "max-[768px]:text-[2.1rem]"
        )}>
          {icon}
        </div>
      </div>
      
      {/* Title */}
      <h3 className={cn(
        "text-xl mb-2.5 font-medium text-gray-800",
        "max-[768px]:text-xl" // Same size on mobile per your CSS
      )}>
        {title}
      </h3>
      
      {/* Description */}
      {description && (
        <p className={cn(
          "text-base text-gray-600 leading-relaxed",
          "max-[768px]:text-base" // Same size on mobile per your CSS
        )}>
          {description}
        </p>
      )}
      
      {/* Additional content */}
      {children}
    </div>
  );
})
IconCard.displayName = "IconCard"


// Simple card without icon for comparison
const SimpleCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title: string;
    description?: string;
    variant?: 'default' | 'minimal' | 'elevated';
  }
>(({ 
  className, 
  title, 
  description, 
  variant = 'default',
  children,
  ...props 
}, ref) => {
  const variantStyles = {
    default: "hover:shadow-md transition-shadow",
    minimal: "border-0 shadow-none bg-gray-50",
    elevated: "shadow-lg hover:shadow-xl transition-shadow"
  };

  return (
    <Card 
      ref={ref} 
      className={cn(variantStyles[variant], className)} 
      {...props}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
})
SimpleCard.displayName = "SimpleCard"

const ResultCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title: string;
    description: string;
  }
>(({ className, title, description, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("result-card", className)}
    {...props}
  >
    <h3 className="result-card-title">
      {title}
    </h3>
    <p className="result-card-description">
      {description}
    </p>
  </div>
))
ResultCard.displayName = "ResultCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  IconCard,
  SimpleCard,
  ResultCard
}