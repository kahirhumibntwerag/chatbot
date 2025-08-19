"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

function Collapsible(
  props: React.ComponentProps<typeof CollapsiblePrimitive.Root>
) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger(
  props: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>
) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>
>(function CollapsibleContent({ className, children, ...rest }, ref) {
  // Animate using Radix CSS var for content height
  const cls = [
    "overflow-hidden",
    // Transition height 0 -> content-height
    "transition-[height] duration-200 ease-out",
    "data-[state=closed]:h-0",
    "data-[state=open]:h-[var(--radix-collapsible-content-height)]",
    className || "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cls}
      {...rest}
      ref={ref as any}
    >
      {children}
    </CollapsiblePrimitive.CollapsibleContent>
  )
})

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
