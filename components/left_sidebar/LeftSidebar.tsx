'use client';

import React, { useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  return (
    <aside 
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
      onClick={() => {
        if (isCollapsed) {
          setIsCollapsed(false);
        }
      }}
      style={{
        width: isCollapsed ? '60px' : '260px',
        height: '100vh',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        flexShrink: 0,
        transition: 'width 0.2s ease-in-out',
        position: 'relative',
        overflow: isCollapsed ? 'visible' : 'hidden',
        cursor: isCollapsed ? 'ew-resize' : 'default',
        zIndex: 1000
      }}>
      {/* Logo/Title / Toggle Icon */}
      <div style={{
        margin: '0 8px 32px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {isCollapsed ? (
          <button
            onMouseEnter={() => setHoveredButton('logo')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{ 
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflow: 'hidden',
              flex: 1,
              backgroundColor: hoveredButton === 'logo' ? '#E5E7EB' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <div style={{ 
              width: '24px',
              height: '24px',
              flexShrink: 0
            }}>
              <Image 
                src={isSidebarHovered ? "/rightSidebarIcon.png" : "/EntitelyLogo.png"}
                alt={isSidebarHovered ? "Expand" : "Entitely Logo"}
                width={24} 
                height={24} 
              />
            </div>
          </button>
        ) : (
          <>
            <div style={{ 
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflow: 'hidden',
              flex: 1
            }}>
              <div style={{ 
                width: '24px',
                height: '24px',
                flexShrink: 0
              }}>
                <Image 
                  src="/EntitelyLogo.png"
                  alt="Entitely Logo"
                  width={24} 
                  height={24} 
                />
              </div>
              <h1 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#111827',
                margin: 0,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                opacity: isCollapsed ? 0 : 1,
                transition: isCollapsed ? 'opacity 0.15s ease' : 'opacity 0.8s ease'
              }}>
                Entitely
              </h1>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              style={{
                padding: '10px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Image 
                src="/rightSidebarIconSelected.png" 
                alt="Collapse" 
                width={24} 
                height={24} 
              />
            </button>
          </>
        )}
      </div>

      {/* New Project Button */}
      <div style={{ 
        position: 'relative',
        margin: '0 8px 1px 8px'
      }}>
        <button
          onMouseEnter={() => setHoveredButton('newProject')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={(e) => {
            e.stopPropagation();
            onCreateProject();
          }}
          style={{
            padding: '10px',
            backgroundColor: hoveredButton === 'newProject' ? '#E5E7EB' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#3B82F6',
            fontFamily: 'inherit',
            transition: 'background-color 0.15s ease',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <div style={{ width: '24px', height: '24px', flexShrink: 0 }}>
            <Image src="/NewProjectIcon.png" alt="New Project" width={24} height={24} />
          </div>
          <span style={{ 
            whiteSpace: 'nowrap',
            opacity: isCollapsed ? 0 : 1,
            transition: isCollapsed ? 'opacity 0.15s ease' : 'opacity 0.8s ease',
            width: isCollapsed ? 0 : 'auto'
          }}>
            New Project
          </span>
        </button>
        {hoveredButton === 'newProject' && isCollapsed && (
          <div style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: '12px',
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            New project
          </div>
        )}
      </div>

      {/* Search Projects Button */}
      <div style={{ 
        position: 'relative',
        margin: '0 8px 1px 8px'
      }}>
        <button
          onMouseEnter={() => setHoveredButton('search')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={(e) => e.stopPropagation()}
          style={{
            padding: '10px',
            backgroundColor: hoveredButton === 'search' ? '#E5E7EB' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#111827',
            fontFamily: 'inherit',
            transition: 'background-color 0.15s ease',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <div style={{ width: '24px', height: '24px', flexShrink: 0, opacity: 0.7 }}>
            <Image src="/SearchIcon.png" alt="Search" width={24} height={24} />
          </div>
          <span style={{ 
            whiteSpace: 'nowrap',
            opacity: isCollapsed ? 0 : 1,
            transition: isCollapsed ? 'opacity 0.15s ease' : 'opacity 0.8s ease',
            width: isCollapsed ? 0 : 'auto'
          }}>
            Search Projects
          </span>
        </button>
        {hoveredButton === 'search' && isCollapsed && (
          <div style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: '12px',
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            Search chats
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginTop: '32px',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '0 18px',
          marginBottom: '12px',
          fontSize: '11px',
          fontWeight: '500',
          color: '#9CA3AF',
          letterSpacing: '0.05em',
          opacity: isCollapsed ? 0 : 1,
          transition: isCollapsed ? 'opacity 0.15s ease' : 'opacity 0.8s ease',
          flexShrink: 0
        }}>
          Projects
        </div>
        <div style={{ 
          padding: '0 8px',
          opacity: isCollapsed ? 0 : 1,
          transition: isCollapsed ? 'opacity 0.15s ease' : 'opacity 0.8s ease',
          pointerEvents: isCollapsed ? 'none' : 'auto',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0
        }}>
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
