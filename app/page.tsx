'use client';

import { useState } from 'react';
import LeftSidebar from '@/components/views/LeftSidebar';
import MainApp from '@/components/views/MainApp';
import { projectsAPI } from '@/lib/api-client';

export default function Home() {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectProject = (projectId: string) => {
    setCurrentProjectId(projectId);
  };

  const handleCreateProject = async () => {
    try {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const newProject = await projectsAPI.create(`Property Survey - ${timestamp}`);
      setCurrentProjectId(newProject.id);
      setRefreshTrigger(prev => prev + 1); // Trigger project list refresh
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleProjectChange = () => {
    // Trigger refresh of project list in sidebar
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <LeftSidebar
        key={refreshTrigger} // Force re-render when refresh is needed
        currentProjectId={currentProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
      />
      <MainApp
        currentProjectId={currentProjectId}
        onProjectChange={handleProjectChange}
      />
    </div>
  );
}
