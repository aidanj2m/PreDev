'use client';

import React from 'react';
import Image from 'next/image';

export type ViewType = 'map' | 'data' | 'chat';

interface ViewToggleBannerProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  addressCount: number;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function ViewToggleBanner({ 
  currentView, 
  onViewChange, 
  addressCount, 
  isSidebarOpen, 
  onToggleSidebar 
}: ViewToggleBannerProps) {
  const tabs: { id: ViewType; label: string }[] = [
    { id: 'map', label: 'Map View' },
    { id: 'data', label: 'Data View' },
    { id: 'chat', label: 'Chat' },
  ];

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #E5E7EB',
      padding: '0 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: '56px',
      zIndex: 10,
      flexShrink: 0
    }}>
      {/* Left side - View tabs */}
      <div style={{
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        height: '100%'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            style={{
              position: 'relative',
              padding: '0 4px',
              height: '100%',
              border: 'none',
              backgroundColor: 'transparent',
              color: currentView === tab.id ? '#111827' : '#6B7280',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
              outline: 'none'
            }}
          >
            {tab.label}
            {currentView === tab.id && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#3B82F6',
                borderRadius: '2px 2px 0 0'
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Right side - Sidebar Toggle (hidden when in chat view) */}
      {currentView !== 'chat' && (
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          >
             <Image 
               src={isSidebarOpen ? "/rightSidebarIconSelected.png" : "/rightSidebarIcon.png"}
               alt="Toggle Sidebar" 
               width={20} 
               height={20}
             />
          </button>
        </div>
      )}
    </div>
  );
}
