// Amplify is configured lazily inside App's useEffect — not here —
// so the aws-amplify ecosystem is excluded from the critical-path bundle.
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
