import { useEffect, RefObject } from 'react';

export function useAutoScroll(
  scrollRef: RefObject<HTMLDivElement>,
  dependencies: any[],
  delay: number = 100
) {
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, delay);

    return () => clearTimeout(scrollTimeout);
  }, dependencies);
}