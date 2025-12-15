'use client'

import { useState } from 'react'
import { AppSidebar } from './app-sidebar'
import { TopBar } from './top-bar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [activeView, setActiveView] = useState('dashboard')

  return (
    <div className="flex h-screen bg-slate-50">
      <AppSidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="flex-1 flex flex-col">
        <TopBar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
