'use client';

import React from 'react';
import ProjectList from './ProjectList';

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
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0'
    }}>
      {/* Logo/Title */}
      <div style={{
        padding: '0 24px',
        marginBottom: '32px'
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#000000',
          margin: 0
        }}>
          PreDev
        </h1>
      </div>

      {/* Project List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ProjectList
          currentProjectId={currentProjectId}
          onSelectProject={onSelectProject}
          onCreateProject={onCreateProject}
        />
      </div>
    </aside>
  );
}

