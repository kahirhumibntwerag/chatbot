import { useEffect, RefObject } from 'react';

interface UseAutoResizeOptions {
  maxHeight?: number;
}

export function useAutoResize(
  textareaRef: RefObject<HTMLTextAreaElement>,
  value: string,
  options: UseAutoResizeOptions = {}
) {
  const { maxHeight = 200 } = options;

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;

      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = "hidden";
      }
    }
  }, [value, maxHeight]);
}