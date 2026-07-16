import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app';
import { registerFCMServiceWorker } from '@/config/firebase.config';
import { loadRuntimeConfig } from '@/config/runtime.config';
import { installChunkErrorHandler } from '@/core/pwa/chunkReload';

// Bootstrap application after loading runtime config
async function bootstrap() {
  // Recover from stale lazy-chunk loads (old chunk URLs 404 after a new deploy).
  installChunkErrorHandler();

  // Load runtime config before rendering to ensure config is available
  await loadRuntimeConfig();
  void registerFCMServiceWorker();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}


bootstrap();
