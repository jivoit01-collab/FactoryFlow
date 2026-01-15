import { combineReducers } from '@reduxjs/toolkit'
import authReducer from '@/core/auth/store/authSlice'

export const rootReducer = combineReducers({
  auth: authReducer,
  // Add more reducers here as modules are added
  // gateIn: gateInReducer,
  // qualityCheck: qualityCheckReducer,
})
