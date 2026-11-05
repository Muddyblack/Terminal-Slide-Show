import React, { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import App from './App'
import DynamicDailyView from './components/dynamic_daily_view/dynamicDailyView'
import { ServerStatusProvider } from '@/contexts/ServerStatusContext';
import '@/styles/index.css'

// The test page only exists in development builds: Vite drops this import and the route from production bundles
const TestPage = import.meta.env.DEV ? lazy(() => import('./components/dynamic_daily_view/testPage')) : null

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
        {TestPage && (
          <Route path="/test" element={<Suspense fallback={null}><TestPage /></Suspense>} />
        )}
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