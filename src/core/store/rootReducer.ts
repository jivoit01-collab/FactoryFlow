import { combineReducers } from '@reduxjs/toolkit'

import { getAllReducers } from '@/app/registry'
// Core reducers that are always included
import authReducer from '@/core/auth/store/authSlice'

import filtersReducer from './filtersSlice'
import notificationReducer from './slices/notification.slice'

/**
 * Root reducer that combines:
 * 1. Core infrastructure reducers (auth, filters, notifications)
 * 2. Module-specific reducers dynamically loaded from module configs
 */
export const rootReducer = combineReducers({
  // Core reducers
  auth: authReducer,
  filters: filtersReducer,
  notification: notificationReducer,
  // Module reducers - dynamically combined from module configs
  ...getAllReducers(),
})
