'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Projects', icon: LayoutDashboard, href: '/' },
  { id: 'equipment', label: 'Equipment', icon: Package, href: '/equipment' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const pathname = usePathname();

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 z-50`}>
      {/* Logo/Header */}
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold">Coordination</h1>
            <p className="text-xs text-gray-400">ViganovaTech</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Lime green divider */}
      <div className="h-0.5 bg-lime-500 mx-2" />

      {/* Nav Items */}
      <nav className="flex-1 p-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Version at bottom */}
      <div className="p-4 border-t border-gray-700">
        {!collapsed && (
          <div className="text-xs text-slate-500 text-center">
            Beta v1.0
          </div>
        )}
      </div>
    </div>
  );
};
