import './bootstrap'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // Explicit extension to force cache clear
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)