import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppNav } from '@/components/app-nav'
import { AreasPage } from '@/pages/areas-page'
import { AreaDetailPage } from '@/pages/area-detail-page'
import { MapPage } from '@/pages/map-page'
import { useTheme } from '@/lib/use-theme'

export function App() {
  const { theme, toggle } = useTheme()

  return (
    <HashRouter>
      <div className="min-h-dvh pb-28">
        <Routes>
          <Route path="/" element={<AreasPage theme={theme} onToggleTheme={toggle} />} />
          <Route path="/area/:slug" element={<AreaDetailPage theme={theme} onToggleTheme={toggle} />} />
          <Route path="/map" element={<MapPage theme={theme} onToggleTheme={toggle} />} />
        </Routes>
        <AppNav />
      </div>
    </HashRouter>
  )
}
