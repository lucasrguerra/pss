import { useState, useCallback } from "react";

/**
 * Generic hook for reading/writing typed values to localStorage.
 *
 * Returns [value, setValue, removeValue].
 * Read/write errors are silently ignored.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): readonly [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next =
          typeof value === "function"
            ? (value as (prev: T) => T)(prev)
            : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore write errors (e.g. private mode quota exceeded)
        }
        return next;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}
