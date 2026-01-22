import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app'
import { loadRuntimeConfig } from '@/config/runtime.config'
import './index.css'

// Load runtime config in background (non-blocking)
// Config will be available by the time it's needed (after auth initialization)
loadRuntimeConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
