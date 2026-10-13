import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
	"group/button inline-flex shrink-0 items-center justify-center gap-1.5 border font-heading font-semibold text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					"border-primary bg-primary text-primary-foreground hover:bg-accent-600 active:bg-accent-700",
				outline:
					"border-border bg-transparent hover:bg-foreground/7 active:bg-foreground/14",
				secondary:
					"border-border bg-transparent hover:bg-foreground/7 active:bg-foreground/14",
				ghost: "border-transparent text-primary px-1 hover:bg-primary/10 active:bg-primary/18",
				destructive:
					"border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
				link: "border-transparent text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 gap-1.5 px-4",
				xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-11 gap-1.5 px-5 text-base",
				icon: "size-9",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-7",
				"icon-lg": "size-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	blueprint = false,
	children,
	...props
}: ButtonPrimitive.Props &
	VariantProps<typeof buttonVariants> & { blueprint?: boolean }) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(
				buttonVariants({ variant, size, className }),
				blueprint && "blueprint",
			)}
			{...props}
		>
			{blueprint && (
				<>
					<i className="corner tl" aria-hidden="true" />
					<i className="corner tr" aria-hidden="true" />
					<i className="corner bl" aria-hidden="true" />
					<i className="corner br" aria-hidden="true" />
				</>
			)}
			{children}
		</ButtonPrimitive>
	);
}

export { Button, buttonVariants };
