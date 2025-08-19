"use client";

import React from "react";
import {
  File as FileGeneric,
  FileText,
  FileArchive,
  FileAudio,
  FileVideo,
  FileImage,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

export function truncateFileName(name: string, maxLength = 24): string {
  if (name.length <= maxLength) return name;
  if (maxLength <= 3) return name.slice(0, maxLength);
  return name.slice(0, maxLength - 3) + "...";
}

export function FileIcon({ fileName, className }: { fileName: string; className?: string }) {
  const ext = getExtension(fileName);
  const common = className || "h-4 w-4";

  switch (ext) {
    case "pdf":
      return <FileText className={`${common} text-red-600 dark:text-red-400`} />;
    case "csv":
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className={`${common} text-emerald-600 dark:text-emerald-400`} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return <FileImage className={`${common} text-yellow-600 dark:text-yellow-400`} />;
    case "mp4":
    case "mov":
    case "avi":
      return <FileVideo className={`${common} text-violet-600 dark:text-violet-400`} />;
    case "mp3":
    case "wav":
    case "flac":
      return <FileAudio className={`${common} text-indigo-600 dark:text-indigo-400`} />;
    case "zip":
    case "gz":
    case "tar":
    case "rar":
      return <FileArchive className={`${common} text-orange-600 dark:text-orange-400`} />;
    case "json":
    case "js":
    case "ts":
    case "tsx":
    case "py":
    case "go":
    case "java":
    case "rb":
      return <FileCode className={`${common} text-blue-600 dark:text-blue-400`} />;
    case "txt":
    case "md":
    case "doc":
    case "docx":
      return <FileText className={`${common} text-slate-600 dark:text-slate-300`} />;
    default:
      return <FileGeneric className={`${common} text-muted-foreground`} />;
  }
}


