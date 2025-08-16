"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
	className,
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				// Base
				"peer relative overflow-hidden inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent outline-none transition-all",
				// Unchecked
				"data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
				// Focus ring (mauve/blue to match animation palette)
				"focus-visible:ring-[3px] focus-visible:ring-[color:rgb(124_91_242)] focus-visible:border-[color:rgb(124_91_242)]",
				// Checked: gradient interior + mauve/blue glow (no animations)
				"data-[state=checked]:bg-transparent",
				"data-[state=checked]:shadow-[0_0_6px_rgb(124_91_242),0_0_12px_rgb(170_91_242),0_0_20px_rgb(88_101_242)]",
				// Static conic gradient layer (no animation)
				"before:content-[''] before:absolute before:inset-0 before:rounded-full before:opacity-0 before:transition-opacity before:duration-200 before:ease-out before:blur-[2px]",
				"data-[state=checked]:before:opacity-100",
				"data-[state=checked]:before:bg-[conic-gradient(from_0deg,rgb(88_101_242),rgb(124_91_242),rgb(170_91_242),rgb(124_91_242),rgb(88_101_242))]",
				// Smooth interactions (transitions ok)
				"transition-[background-color,box-shadow,transform] duration-200 ease-out",
				className
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"relative z-10 pointer-events-none block size-4 rounded-full ring-0 transition-transform",
					"data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
					"bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground",
					// Thumb halo in mauve/blue
					"data-[state=checked]:shadow-[0_0_4px_rgb(124_91_242),0_0_8px_rgb(88_101_242)]"
				)}
			/>
		</SwitchPrimitive.Root>
	)
}

export { Switch }