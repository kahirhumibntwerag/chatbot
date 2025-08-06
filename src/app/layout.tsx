import { Toaster } from "@/components/ui/sonner";
import { ThreadProvider } from "@/context/ThreadContext";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
