import { combineReducers } from '@reduxjs/toolkit'
import { getAllReducers } from '@/app/modules'

// Core reducers that are always included
import authReducer from '@/core/auth/store/authSlice'
import filtersReducer from './filtersSlice'

/**
 * Root reducer that combines:
 * 1. Core infrastructure reducers (auth, filters)
 * 2. Module-specific reducers dynamically loaded from module configs
 */
export const rootReducer = combineReducers({
  // Core reducers
  auth: authReducer,
  filters: filtersReducer,
  // Module reducers - dynamically combined from module configs
  ...getAllReducers(),
})
