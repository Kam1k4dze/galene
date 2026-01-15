import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { atom, map, type WritableAtom, type MapStore } from "nanostores";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function persistentAtom<T>(
  key: string,
  initialValue: T
): WritableAtom<T> {
  // Check if we are in the browser
  if (typeof window === "undefined" || !window.localStorage) {
    return atom(initialValue);
  }

  const storedValue = window.localStorage.getItem(key);
  let parsedValue = initialValue;

  if (storedValue !== null) {
    try {
      parsedValue = JSON.parse(storedValue);
    } catch (e) {
      console.warn(`Failed to parse stored value for ${key}`, e);
    }
  }

  const store = atom(parsedValue);

  store.listen((value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to save value for ${key}`, e);
    }
  });

  return store;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function persistentMap<T extends Record<string, any>>(
  key: string,
  initialValue: T
): MapStore<T> {
  // Check if we are in the browser
  if (typeof window === "undefined" || !window.localStorage) {
    return map(initialValue);
  }

  const storedValue = window.localStorage.getItem(key);
  let parsedValue = initialValue;

  if (storedValue !== null) {
    try {
      parsedValue = JSON.parse(storedValue);
    } catch (e) {
      console.warn(`Failed to parse stored value for ${key}`, e);
    }
  }

  const store = map(parsedValue);

  store.listen((value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to save value for ${key}`, e);
    }
  });

  return store;
}
