import { useCallback, useState } from 'react';

import { storage } from '../utils/storage';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = storage.get<T>(key);
    return item ?? initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        storage.set(key, valueToStore);
        return valueToStore;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    storage.remove(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
