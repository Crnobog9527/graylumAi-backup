import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/theme.css'   // 设计系统 - 全局变量和基础样式
import '@/index.css'   // 应用样式 - Tailwind 和组件样式

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}



