import { useEffect, RefObject } from "react";

interface UseAutoResizeOptions {
  maxHeight?: number;
  minHeight?: number;
}

export function useAutoResize(
  textareaRef: RefObject<HTMLTextAreaElement>,
  value: string,
  options: UseAutoResizeOptions = {}
) {
  const { maxHeight = 200, minHeight = 0 } = options;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    // Defer to next frame so DOM has updated (esp. when value appended quickly)
    let frame = requestAnimationFrame(() => {
      // Temporarily reset to auto to get natural scrollHeight
      const prev = el.style.height;
      el.style.height = "auto";

      // Read
      const raw = el.scrollHeight;

      // Clamp
      const targetPx = Math.min(Math.max(raw, minHeight), maxHeight);
      const target = targetPx + "px";

      // Only write if changed to avoid extra layout
      if (prev !== target) {
        el.style.height = target;
      } else {
        // Restore previous if unchanged
        el.style.height = prev;
      }

      // Toggle overflow only if needed
      const shouldScroll = raw > maxHeight;
      if (shouldScroll && el.style.overflowY !== "auto")
        el.style.overflowY = "auto";
      if (!shouldScroll && el.style.overflowY !== "hidden")
        el.style.overflowY = "hidden";
    });

    return () => cancelAnimationFrame(frame);
  }, [value, maxHeight, minHeight, textareaRef]);
}