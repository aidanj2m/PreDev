'use client';

import React, { useEffect, useState } from 'react';
import { ProjectWithAddresses, projectsAPI } from '@/lib/api-client';

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
  const [projects, setProjects] = useState<ProjectWithAddresses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectList = await projectsAPI.list();
      // Fetch full details with addresses for each project
      const projectsWithAddresses = await Promise.all(
        projectList.map(project => projectsAPI.get(project.id))
      );
      setProjects(projectsWithAddresses);
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getProjectDisplayName = (project: ProjectWithAddresses) => {
    if (!project.addresses || project.addresses.length === 0) {
      return 'New Property Survey';
    }
    
    if (project.addresses.length === 1) {
      return project.addresses[0].full_address;
    }
    
    // Multiple addresses - join with " + "
    return project.addresses.map(addr => addr.full_address).join(' + ');
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await projectsAPI.delete(projectId);
      // Reload projects after deletion
      await loadProjects();
      // Close menu
      setOpenMenuId(null);
      // If we deleted the current project, clear selection
      if (currentProjectId === projectId) {
        onSelectProject('');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project');
    }
  };

  const toggleMenu = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === projectId ? null : projectId);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif'
    }}>
      {/* Section Title */}


      {/* Projects List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 0
      }}>
        {isLoading && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#999999',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            Loading...
          </div>
        )}

        {error && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#c00',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#999999',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            No projects yet
          </div>
        )}

        {!isLoading && !error && projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            style={{
              margin: '0 16px 2px 16px',
              padding: '8px 8px',
              borderRadius: '8px',
              backgroundColor: currentProjectId === project.id ? '#f5f5f5' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid transparent',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              if (currentProjectId !== project.id) {
                e.currentTarget.style.backgroundColor = '#e8e8e8';
              }
              const menuBtn = e.currentTarget.querySelector('.menu-button') as HTMLElement;
              if (menuBtn) menuBtn.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              if (currentProjectId !== project.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
              const menuBtn = e.currentTarget.querySelector('.menu-button') as HTMLElement;
              if (menuBtn && openMenuId !== project.id) menuBtn.style.opacity = '0';
            }}
          >
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#000000',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1
            }}>
              {getProjectDisplayName(project)}
            </div>
            
            {/* Three dots menu button */}
            <button
              className="menu-button"
              onClick={(e) => toggleMenu(project.id, e)}
              style={{
                opacity: openMenuId === project.id ? '1' : '0',
                transition: 'opacity 0.2s',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '16px',
                color: '#666666',
                borderRadius: '4px',
                marginLeft: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e0e0e0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ⋯
            </button>

            {/* Dropdown menu */}
            {openMenuId === project.id && (
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '40px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                  minWidth: '120px'
                }}
              >
                <button
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#dc2626',
                    textAlign: 'left',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

