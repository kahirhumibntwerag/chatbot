import React from "react";

const MODEL_LABEL: Record<string, string> = {
  "chatgpt-5": "chatgpt-5",
  "chatgpt-5-mini": "5-mini",
  "chatgpt-5-nano": "5-nano",
  "chatgpt-4o": "chatgpt-4o",
};

export function ModelIndicator({ modelName }: { modelName: string }) {
  const label = MODEL_LABEL[modelName] ?? modelName;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      {/* Masked mono icon recolors with theme (requires /chatgpt-4.svg in /public) */}
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 bg-foreground/80 dark:bg-foreground/80
                   [mask:url(/chatgpt-4.svg)_center/contain_no-repeat]
                   [webkit-mask:url(/chatgpt-4.svg)_center/contain_no-repeat"
      />
      <span className="truncate max-w-[120px]">{label}</span>
    </span>
  );
}