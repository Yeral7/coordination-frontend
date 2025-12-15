'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
} from 'lucide-react'

interface AppSidebarProps {
  activeView: string
  onNavigate: (view: string) => void
}

const navigation = [
  { name: 'Mission Control', href: '/', icon: LayoutDashboard, id: 'dashboard' },
  { name: 'Equipment', href: '/equipment', icon: Package, id: 'equipment' },
]

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="flex items-center justify-center h-16 px-4 border-b">
        <h1 className="text-xl font-bold text-slate-900">Coordination</h1>
      </div>
      
      <nav className="mt-6">
        <div className="px-3">
          {navigation.map((item) => {
            const isActive = activeView === item.id || pathname === item.href
            return (
              <button
                key={item.name}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors',
                  isActive
                    ? 'bg-slate-100 text-slate-900 border-r-2 border-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-500'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
