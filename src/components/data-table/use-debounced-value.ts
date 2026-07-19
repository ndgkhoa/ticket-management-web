import { useEffect, useState } from 'react';

/**
 * Debounce a value: returns the latest input only after it has been stable for
 * `delayMs`. The search box keeps its input responsive with local state and feeds it
 * here, so only the settled query is written to the URL and refetched — one request
 * per pause, not one per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
