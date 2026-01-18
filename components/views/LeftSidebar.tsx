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
      width: '260px',
      height: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      flexShrink: 0
    }}>
      {/* Logo/Title */}
      <div style={{
        padding: '0 24px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
             <Image src="/PreDevLogo.png" alt="PreDev Logo" width={24} height={24} />
        </div>
        <h1 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#111827',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          Entitely
        </h1>
      </div>

      {/* New Project Button */}
      <button
        onClick={onCreateProject}
        style={{
          margin: '0 24px 16px 24px',
          padding: '0',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#3B82F6', // Blue color
          textAlign: 'left',
          fontFamily: 'inherit'
        }}
      >
        <Image src="/NewProjectIcon.png" alt="New Project" width={20} height={20} />
        New Project
      </button>

      {/* Search Projects Button */}
      <button
        style={{
          margin: '0 24px 32px 24px',
          padding: '0',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#111827',
          textAlign: 'left',
          fontFamily: 'inherit'
        }}
      >
        <Image src="/SearchIcon.png" alt="Search" width={16} height={16} style={{ opacity: 0.7 }} />
        Search Projects
      </button>

      {/* Market Intelligence Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          padding: '0 24px',
          marginBottom: '12px',
          fontSize: '11px',
          fontWeight: '500',
          color: '#9CA3AF',
          letterSpacing: '0.05em'
        }}>
          Market Intelligence
        </div>
        <button
          style={{
            margin: '0 24px',
            padding: '0',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#111827',
            textAlign: 'left',
            fontFamily: 'inherit',
            width: 'calc(100% - 48px)'
          }}
        >
          <Image src="/TrendIcon.png" alt="Market Trends" width={16} height={16} style={{ opacity: 0.7 }} />
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
          padding: '0 24px',
          marginBottom: '12px',
          fontSize: '11px',
          fontWeight: '500',
          color: '#9CA3AF',
          letterSpacing: '0.05em'
        }}>
          Projects
        </div>
        <div style={{ padding: '0 8px' }}>
            <ProjectList
            currentProjectId={currentProjectId}
            onSelectProject={onSelectProject}
            onCreateProject={onCreateProject}
            />
        </div>
      </div>
    </aside>
  );
}
