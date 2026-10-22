import * as React from "react";
import { DesignTypeTabs } from "@/components/design-type-tabs";

export function DesignShell({
	breadcrumb,
	title,
	params,
	children,
}: {
	breadcrumb: string;
	title: string;
	params: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-8 px-6 py-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex min-h-0 flex-col gap-4 lg:min-h-[640px]">
				<div>
					<div className="text-xs text-muted-foreground">
						{breadcrumb}
					</div>
					<h2 className="mt-1 mb-0">{title}</h2>
				</div>
				<DesignTypeTabs />
				{children}
			</div>
			<div className="lg:sticky lg:top-[70px] lg:h-[720px]">{params}</div>
		</div>
	);
}
