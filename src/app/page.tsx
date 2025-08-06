"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { getUser } from "@/helpers";
import FileUploader from "@/components/ui/fileUploader";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Welcome</h1>
      <FileUploader storeName="test" />
      <MarkdownRenderer># Hello, World!</MarkdownRenderer>
    </div>
  );
}
