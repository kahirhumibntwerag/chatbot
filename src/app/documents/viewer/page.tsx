"use client";

import dynamic from "next/dynamic";
import { Worker } from "@react-pdf-viewer/core";
import { useMemo } from "react";

const Viewer = dynamic(
  async () => (await import("@react-pdf-viewer/core")).Viewer,
  { ssr: false }
);

export default function PdfViewerPage() {
  // Keep the worker version in sync with installed pdfjs-dist
  const workerUrl = useMemo(
    () => `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`,
    []
  );

  return (
    <div className="h-screen w-full p-4">
      <div className="mx-auto h-[85vh] max-w-5xl rounded-md border bg-background">
        <Worker workerUrl={workerUrl}>
          <Viewer fileUrl="/Space Weather - 2020 - Upendran - Solar Wind Prediction Using Deep Learning (1).pdf" />
        </Worker>
      </div>
    </div>
  );
}


