import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface UploadBarProps {
	filename: string;
	meta: string;
	onReplace?: () => void;
	onAnalyze?: () => void;
	analyzeLabel?: string;
}

export function UploadBar({
	filename,
	meta,
	onReplace,
	onAnalyze,
	analyzeLabel = "Analyze & load",
}: UploadBarProps) {
	return (
		<div className="flex items-center gap-3 border border-dashed border-primary px-3 py-2.5">
			<Badge variant="accent">Uploaded</Badge>
			<span className="font-mono text-sm font-medium">{filename}</span>
			<span className="text-xs text-muted-foreground">{meta}</span>
			<Button
				variant="ghost"
				size="sm"
				className="ml-auto"
				onClick={onReplace}
			>
				Replace
			</Button>
			{onAnalyze && (
				<Button blueprint size="sm" onClick={onAnalyze}>
					{analyzeLabel}
				</Button>
			)}
		</div>
	);
}
