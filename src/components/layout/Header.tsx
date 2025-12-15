'use client';

import React from 'react';
import { Bell, LogOut, User, Building2 } from 'lucide-react';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed }) => {
  // Placeholder user - in production this would come from auth context
  const user = {
    name: 'Guest',
    role: 'coordinator',
  };

  return (
    <header 
      className={`bg-gray-900 text-white p-4 shadow-sm fixed top-0 right-0 z-10 transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Company Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gray-700 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-gray-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Coordination</h1>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* User info */}
          <div className="bg-gray-700 px-4 py-1.5 rounded-md flex items-center min-w-[160px]">
            <div className="mr-3">
              <div className="h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center text-gray-800 text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{user.name}</span>
              <span className="text-xs text-gray-300 capitalize">{user.role}</span>
            </div>
          </div>

          {/* Notifications */}
          <button
            className="p-2 rounded-full hover:bg-gray-700 transition-colors relative"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full"></span>
          </button>

          {/* Logout */}
          <button 
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
