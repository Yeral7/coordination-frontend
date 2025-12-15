'use client'

import { Bell, Search, User } from 'lucide-react'
import { useState } from 'react'

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">Coordinator</p>
            <p className="text-xs text-slate-500">admin@casanova.com</p>
          </div>
          <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-slate-600" />
          </div>
        </div>
      </div>
    </header>
  )
}
