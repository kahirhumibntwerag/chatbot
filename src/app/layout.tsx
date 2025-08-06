import { Toaster } from "@/components/ui/sonner";
import { ThreadProvider } from "@/context/ThreadContext";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
