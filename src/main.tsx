import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app'
import { loadRuntimeConfig } from '@/config/runtime.config'
import './index.css'

async function bootstrap() {
  // Load runtime config before rendering
  await loadRuntimeConfig()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

bootstrap()
