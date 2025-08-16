"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="bg-neon min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden w-full">
      {/* Subtle overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.05),transparent_60%)]" />

      <section className="relative max-w-3xl mx-auto text-center space-y-10">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
          <span
            className="block drop-shadow-[0_0_12px_var(--neon-accent)]"
            style={{ color: "var(--neon-accent)" }}
          >
            AI Chat Assistant
          </span>
          <span className="mt-3 block text-gray-300">
            Faster conversations. Smarter context.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Upload files, ask questions, and explore insights with a real‑time
          conversational interface powered by your data.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 justify-center">
          <button
            onClick={() => router.push("/chat")}
            className="neon-border relative inline-flex items-center justify-center px-12 py-4 font-semibold rounded-full text-sm tracking-wide transition group bg-[#0c0f19]/70 backdrop-blur-md"
            style={{
              color: "var(--neon-accent)",
            }}
          >
            <span className="relative flex items-center">
              Start Chatting
              <span className="ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </button>

          <a
            href="#features"
            className="relative inline-flex items-center justify-center px-12 py-4 font-medium rounded-full text-sm tracking-wide border border-white/15 text-gray-300 hover:text-white hover:border-white/35 transition bg-white/5 backdrop-blur"
          >
            Learn More
          </a>
        </div>

        <div
          id="features"
          className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left"
        >
          <Feature
            title="Context Aware"
            desc="Understands prior messages & uploaded docs."
          />
          <Feature
            title="Fast Retrieval"
            desc="Vector + structured search (extensible)."
          />
          <Feature
            title="Markdown & Files"
            desc="Upload, parse and render enriched answers."
          />
        </div>
      </section>

      <footer className="mt-24 text-xs text-gray-500">
        © {new Date().getFullYear()} Your Project. All rights reserved.
      </footer>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="neon-card p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/25 transition">
      <h3
        className="text-lg font-semibold mb-1 drop-shadow-[0_0_6px_var(--neon-accent)]"
        style={{ color: "var(--neon-accent)" }}
      >
        {title}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
