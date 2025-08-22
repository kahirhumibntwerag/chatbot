"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Script from "next/script";

export default function Home() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  return (
    <main
      className="bg-neon min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden w-full"
      style={{
        // Align landing accent with switch/input blue
        // rgb(124 91 242) matches the switch glow/palette
        // Also align focus ring hue for consistency
        ["--neon-accent" as any]: "rgb(124 91 242)",
        ["--ring" as any]: "rgb(124 91 242)",
      }}
    >
      <Script
        id="ld-json-website"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Invento",
            url:
              (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") +
              "/",
            potentialAction: {
              "@type": "SearchAction",
              target:
                (process.env.NEXT_PUBLIC_SITE_URL ??
                  "http://localhost:3000") +
                "/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />

      <Script
        id="ld-json-organization"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Invento",
            url:
              (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") +
              "/",
            logo:
              (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") +
              "/logo.svg",
          }),
        }}
      />
      {/* Subtle overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.05),transparent_60%)]" />

      <section className="relative max-w-3xl mx-auto text-center space-y-8 sm:space-y-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
          <span className="block">
            <span className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <motion.img
                src="/logo.svg"
                alt="Logo"
                className="h-12 w-12 md:h-14 md:w-14 drop-shadow-[0_0_18px_var(--neon-accent)]"
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              <span
                className="drop-shadow-[0_0_12px_var(--neon-accent)]"
                style={{ color: "var(--neon-accent)" }}
              >
                AI Chat Assistant
              </span>
            </span>
          </span>
          <span className="mt-3 block text-gray-300 text-base sm:text-lg md:text-xl">
            Faster conversations. Smarter context.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Upload files, ask questions, and explore insights with a real‑time
          conversational interface powered by your data.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center px-4">
          <button
            onClick={() => {
              if (isStarting) return;
              setIsStarting(true);
              router.push("/chat");
            }}
            disabled={isStarting}
            aria-busy={isStarting}
            className="neon-border relative inline-flex items-center justify-center px-10 py-4 sm:px-12 font-semibold rounded-full text-sm tracking-wide transition group bg-[#0c0f19]/70 backdrop-blur-md disabled:opacity-70 w-full sm:w-auto"
            style={{
              color: "var(--neon-accent)",
            }}
          >
            {isStarting ? (
              <span className="relative flex items-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                <span>Starting…</span>
              </span>
            ) : (
              <span className="relative flex items-center">
                Start Chatting
                <span className="ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            )}
          </button>
        </div>
      </section>

      <footer className="mt-16 sm:mt-24 text-xs text-gray-500 px-4 text-center">
        © {new Date().getFullYear()} Your Project. All rights reserved.
      </footer>
    </main>
  );
}
