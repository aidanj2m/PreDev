import { useState, useEffect } from 'react';
import { Address, projectsAPI } from '@/lib/api-client';
import { ViewState } from './types';

export function useProjectData(
  currentProjectId: string | null,
  viewState: ViewState,
  setAddresses: (addresses: Address[]) => void,
  setProjectName: (name: string) => void,
  setViewState: (state: ViewState) => void,
  setShowInput: (show: boolean) => void
) {
  const [isLoading, setIsLoading] = useState(false);

  const loadProjectData = async (projectId: string) => {
    setIsLoading(true);
    try {
      const project = await projectsAPI.get(projectId);
      setAddresses(project.addresses);
      setProjectName(project.name || 'Untitled Project');
      
      // Determine view state based on addresses
      if (project.addresses.length === 0) {
        setViewState('input');
        setShowInput(true);
      } else {
        // Go straight to viewing for existing projects
        setViewState('viewing');
        setShowInput(false);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      // Don't override loading state - address submission is in progress
      // and will handle state transitions when the promise resolves
      if (viewState === 'loading') return;
      loadProjectData(currentProjectId);
    } else {
      // Only reset to input if we're not in loading state
      if (viewState !== 'loading') {
        setAddresses([]);
        setViewState('input');
        setShowInput(true);
      }
    }
  }, [currentProjectId]);

  return { isLoading, loadProjectData };
}
