import { cn } from "@/lib/utils"
import type React from "react"

function Header({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-foreground dark:text-gray-200 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        "shadow-lg dark:shadow-gray-700/50 p-4 rounded-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function Typography({
  variant,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { variant: "h1" | "h2" | "h3" | "h4" | "p" }) {
  if (variant === "h1") {
    return (
      <Header className={className} {...props}>
        {children}
      </Header>
    )
  }

  const Comp = variant

  return (
    <Comp
      className={cn(
        "text-foreground",
        variant === "h2" && "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        variant === "h3" && "scroll-m-20 text-2xl font-semibold tracking-tight",
        variant === "h4" && "scroll-m-20 text-xl font-semibold tracking-tight",
        variant === "p" && "leading-7 [&:not(:first-child)]:mt-6",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

