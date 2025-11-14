'use client';

import React, { useEffect, useState } from 'react';
import { Project, projectsAPI } from '@/lib/api-client';

interface ProjectListProps {
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export default function ProjectList({
  currentProjectId,
  onSelectProject,
  onCreateProject
}: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectList = await projectsAPI.list();
      setProjects(projectList);
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* New Project Button */}
      <div style={{ padding: '0 12px', marginBottom: '16px' }}>
        <button
          onClick={onCreateProject}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#333333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#000000';
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span>
          New Project
        </button>
      </div>

      {/* Section Title */}
      <div style={{
        padding: '8px 24px',
        fontSize: '12px',
        fontWeight: '600',
        color: '#666666',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Recent Projects
      </div>

      {/* Projects List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 12px'
      }}>
        {isLoading && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#999999',
            fontSize: '14px'
          }}>
            Loading...
          </div>
        )}

        {error && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#c00',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#999999',
            fontSize: '14px'
          }}>
            No projects yet
          </div>
        )}

        {!isLoading && !error && projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            style={{
              padding: '12px 12px',
              marginBottom: '6px',
              borderRadius: '8px',
              backgroundColor: currentProjectId === project.id ? '#f5f5f5' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (currentProjectId !== project.id) {
                e.currentTarget.style.backgroundColor = '#fafafa';
              }
            }}
            onMouseLeave={(e) => {
              if (currentProjectId !== project.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#000000',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {project.name}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#999999'
            }}>
              <span>{project.address_count || 0} addresses</span>
              <span>{formatDate(project.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

