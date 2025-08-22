import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeProvider";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://invento.it.com";

export const metadata: Metadata = {
	title: {
		default: "Invento — AI Chat Assistant",
		template: "%s | Invento",
	},
	description:
		"AI chat assistant for faster conversations and smarter context. Upload files, ask questions, and explore insights in real time.",
	keywords: [
		"AI chat",
		"chat assistant",
		"file Q&A",
		"context aware",
		"real-time chat",
	],
	authors: [{ name: "Invento" }],
	creator: "Invento",
	publisher: "Invento",
	metadataBase: new URL(siteUrl),
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: "Invento — AI Chat Assistant",
		description:
			"Faster conversations. Smarter context. Upload files and chat in real time.",
		url: siteUrl,
		siteName: "Invento",
		images: [
			{
				url: "/logo.svg",
				width: 512,
				height: 512,
				alt: "Invento",
			},
		],
		type: "website",
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: "Invento — AI Chat Assistant",
		description:
			"Faster conversations. Smarter context. Upload files and chat in real time.",
		images: ["/logo.svg"],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-snippet": -1,
			"max-image-preview": "large",
			"max-video-preview": -1,
		},
	},
	icons: {
		icon: "/logo.svg",
		shortcut: "/logo.svg",
		apple: "/logo.svg",
	},
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-svh">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="h-svh overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
