import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './ui/tokens.css'
import './ui/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.DEV) {
  // the E2E and a dev console can read the live store; never shipped in production builds
  import('./store').then(({ useWordyStore }) => {
    ;(window as unknown as { __wordy: unknown }).__wordy = useWordyStore
  })
}
