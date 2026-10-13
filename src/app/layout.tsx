import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const barlow = Barlow({
	variable: "--font-body",
	subsets: ["latin"],
	weight: ["400", "500", "700"],
});

const barlowCondensed = Barlow_Condensed({
	variable: "--font-heading",
	subsets: ["latin"],
	weight: ["400", "600"],
});

export const metadata: Metadata = {
	title: "Tactoread",
	description:
		"3D-printable micro models and lithophanes for teachers, built so vision-impaired students can learn by touch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col bg-background text-foreground">
				<AppHeader />
				<main className="flex-1">{children}</main>
			</body>
		</html>
	);
}
