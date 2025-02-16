import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import App from './App'
import DynamicDailyView from './components/dynamic_daily_view/dynamicDailyView'
import { ServerStatusProvider } from '@/contexts/ServerStatusContext';
import '@/styles/index.css'

/**
 * Main routing component that handles application routes
 * @component
 */
const Main = () => (
  <ServerStatusProvider>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dynamic-view" element={<DynamicDailyView />} />
      </Routes>
    </Router>
  </ServerStatusProvider>
)

// Initialize React with StrictMode and render main component
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
)