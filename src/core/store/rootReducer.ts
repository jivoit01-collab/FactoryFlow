import { combineReducers } from '@reduxjs/toolkit'
import authReducer from '@/core/auth/store/authSlice'
import filtersReducer from './filtersSlice'

export const rootReducer = combineReducers({
  auth: authReducer,
  filters: filtersReducer,
  // Add more reducers here as modules are added
  // gateIn: gateInReducer,
  // qualityCheck: qualityCheckReducer,
})
