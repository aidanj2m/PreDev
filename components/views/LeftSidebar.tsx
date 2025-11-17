'use client';

import React from 'react';
import Image from 'next/image';
import ProjectList from '@/components/modals/ProjectList';

interface LeftSidebarProps {
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export default function LeftSidebar({
  currentProjectId,
  onSelectProject,
  onCreateProject
}: LeftSidebarProps) {
  return (
    <aside style={{
      width: '280px',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      borderRight: '1px solid #e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif'
    }}>
      {/* Logo/Title */}
      <div style={{
        padding: '0 24px',
        marginBottom: '20px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#000000',
          margin: 0
        }}>
          PreDev
        </h1>
      </div>

      {/* New Project Button */}
      <button
        onClick={onCreateProject}
        style={{
          margin: '0 16px 8px 16px',
          padding: '8px 8px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#000000',
          textAlign: 'left',
          transition: 'background-color 0.2s',
          fontFamily: 'inherit'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Image src="/PlusIcon.png" alt="New Project" width={20} height={20} />
        New Project
      </button>

      {/* Search Projects Button */}
      <button
        style={{
          margin: '0 16px 16px 16px',
          padding: '8px 8px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#000000',
          textAlign: 'left',
          transition: 'background-color 0.2s',
          fontFamily: 'inherit'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Image src="/SearchIcon.png" alt="Search" width={20} height={20} />
        Search Projects
      </button>

      {/* Market Intelligence Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          padding: '0 16px',
          marginBottom: '4px',
          fontSize: '10px',
          fontWeight: '500',
          color: '#999999',
          letterSpacing: '0.5px'
        }}>
          Market Intelligence
        </div>
        <button
          style={{
            margin: '0 16px',
            padding: '8px 8px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#000000',
            textAlign: 'left',
            width: 'calc(100% - 32px)',
            transition: 'background-color 0.2s',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Image src="/TrendIcon.png" alt="Market Trends" width={20} height={20} />
          Market Trends
        </button>
      </div>

      {/* Projects Section */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '0 16px',
          marginBottom: '4px',
          fontSize: '10px',
          fontWeight: '500',
          color: '#999999',
          letterSpacing: '0.5px'
        }}>
          Projects
        </div>
        <ProjectList
          currentProjectId={currentProjectId}
          onSelectProject={onSelectProject}
          onCreateProject={onCreateProject}
        />
      </div>
    </aside>
  );
}

