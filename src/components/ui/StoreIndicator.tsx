'use client'
import { Database as LucideDatabase } from "lucide-react";

interface StoreIndicatorProps {
  storeName: string | null;
}

export const StoreIndicator = ({ storeName }: StoreIndicatorProps) => {
  if (!storeName) return null;
  return (
    <div
      className="flex items-center gap-2 rounded-full px-3 py-1 bg-transparent border border-none text-sm select-none"
      aria-label={`Store: ${storeName}`}
    >
      <LucideDatabase className="text-primary h-4 w-4" />
      <span className="text-primary font-medium">{storeName}</span>
    </div>
  );
};