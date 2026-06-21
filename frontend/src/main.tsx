import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

if (window.location.hostname === '127.0.0.1') {
  window.location.href = window.location.href.replace('127.0.0.1', 'localhost');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
