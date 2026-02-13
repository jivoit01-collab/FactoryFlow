import { configureStore } from '@reduxjs/toolkit';

import { authSyncMiddleware } from '@/core/auth/store/authSyncMiddleware';

import { saveFiltersToStorage } from './filtersSlice';
import { rootReducer } from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(authSyncMiddleware),
  devTools: import.meta.env.DEV,
});

// Subscribe to store changes to persist filters to localStorage
let previousFilters = store.getState().filters;
store.subscribe(() => {
  const currentFilters = store.getState().filters;
  // Only save if filters have changed
  if (currentFilters !== previousFilters) {
    saveFiltersToStorage(currentFilters);
    previousFilters = currentFilters;
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
