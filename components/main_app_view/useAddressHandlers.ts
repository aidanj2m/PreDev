import { useState } from 'react';
import { Address, projectsAPI, addressesAPI } from '@/lib/api-client';
import { generateProjectName } from '@/lib/project-utils';
import { ViewState } from './types';

interface AddressSubmissionData {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  full_address: string;
  latitude?: number;
  longitude?: number;
}

export function useAddressHandlers(
  currentProjectId: string | null,
  addresses: Address[],
  setAddresses: React.Dispatch<React.SetStateAction<Address[]>>,
  setProjectName: (name: string) => void,
  setViewState: (state: ViewState) => void,
  setShowInput: (show: boolean) => void,
  onCreateProjectWithAddress: () => Promise<string>,
  onProjectChange: () => void,
  setPreloadedSurroundingParcels?: (parcels: any[] | null) => void
) {
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [loadingPromise, setLoadingPromise] = useState<Promise<any> | null>(null);

  const handleAddressValidated = async (validatedAddress: AddressSubmissionData) => {
    // Prevent concurrent submissions
    if (isSubmittingAddress) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    setIsSubmittingAddress(true);
    try {
      let projectId = currentProjectId;
      
      // If no project exists, create one first
      if (!projectId) {
        console.log('No project exists, creating new project...');
        projectId = await onCreateProjectWithAddress();
        console.log('New project created:', projectId);
        
        // Fetch the project to get its name
        const project = await projectsAPI.get(projectId);
        setProjectName(project.name || 'Untitled Project');
      }
      
      const newAddress = await addressesAPI.addToProject(projectId, validatedAddress);
      setAddresses([...addresses, newAddress]);
      
      // Auto-update project name if this is the first address
      if (addresses.length === 0) {
        try {
          const generatedName = generateProjectName(validatedAddress);
          await projectsAPI.update(projectId, generatedName);
          setProjectName(generatedName);
          console.log('Project name auto-updated to:', generatedName);
        } catch (error) {
          console.error('Failed to update project name:', error);
        }
      }
      
      // Transition to building state and hide input (for assembling more)
      setViewState('building');
      setShowInput(false);
      
      // Notify parent to refresh project list
      onProjectChange();
    } catch (error) {
      console.error('Error adding address:', error);
      alert('Failed to add address. Please try again.');
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const handleAddressSubmitted = async (validatedAddress: AddressSubmissionData) => {
    // Prevent concurrent submissions
    if (isSubmittingAddress) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    // IMMEDIATELY transition to loading view (before any async work)
    setViewState('loading');
    setIsSubmittingAddress(true);
    
    // Create the loading promise that will fetch all data
    const promise = (async () => {
      try {
        let projectId = currentProjectId;
        
        // If no project exists, create one first
        if (!projectId) {
          console.log('No project exists, creating new project...');
          projectId = await onCreateProjectWithAddress();
          console.log('New project created:', projectId);
          
          // Fetch the project to get its name
          const project = await projectsAPI.get(projectId);
          setProjectName(project.name || 'Untitled Project');
        }
        
        console.log('Fetching address boundary and parcel data...');
        const newAddress = await addressesAPI.addToProject(projectId, validatedAddress);
        console.log('Address added successfully with boundary data:', newAddress);
        
        // Fetch surrounding parcels if this is the first address
        let surroundingParcels: any[] | null = null;
        if (addresses.length === 0) {
          console.log('Fetching surrounding parcels before map load...');
          try {
            const boundaryData = await addressesAPI.getBoundary(newAddress.id);
            surroundingParcels = boundaryData.surrounding_parcels;
            console.log(`Pre-loaded ${surroundingParcels?.length || 0} surrounding parcels`);
          } catch (error) {
            console.error('Error pre-fetching surrounding parcels:', error);
          }
        }
        
        // Store the new address for later
        const updatedAddresses = [...addresses, newAddress];
        
        // Auto-update project name if this is the first address
        if (addresses.length === 0) {
          try {
            const generatedName = generateProjectName(validatedAddress);
            await projectsAPI.update(projectId, generatedName);
            setProjectName(generatedName);
            console.log('Project name auto-updated to:', generatedName);
          } catch (error) {
            console.error('Failed to update project name:', error);
          }
        }
        
        // Return the data instead of setting state
        return { newAddress, updatedAddresses, surroundingParcels };
      } catch (error) {
        console.error('Error adding address:', error);
        alert('Failed to add address. Please try again.');
        // Reset view state on error
        setViewState('input');
        throw error;
      } finally {
        setIsSubmittingAddress(false);
      }
    })();
    
    // Store the promise
    setLoadingPromise(promise);
  };

  const handleRemoveAddress = async (addressId: string) => {
    // Handle optimistic updates (temporary IDs)
    if (addressId.startsWith('temp-')) {
      console.log('Removing optimistic address from UI:', addressId);
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      setAddresses(updatedAddresses);
      
      // If no addresses left, go back to input state
      if (updatedAddresses.length === 0) {
        setViewState('input');
        setShowInput(true);
      }
      return;
    }

    // For real addresses, unassign from project (set project_id to NULL)
    try {
      await addressesAPI.unassignFromProject(addressId);
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      setAddresses(updatedAddresses);
      
      // If no addresses left, go back to input state
      if (updatedAddresses.length === 0) {
        setViewState('input');
        setShowInput(true);
      }
      
      // Notify parent to refresh project list
      onProjectChange();
    } catch (error) {
      console.error('Error removing address:', error);
      alert('Failed to remove address. Please try again.');
    }
  };

  const handleAddAddressFromMap = async (validatedAddress: AddressSubmissionData & { boundary_geojson?: any }) => {
    if (!currentProjectId) {
      console.error('No current project');
      return;
    }

    // Check if address already exists in current project
    const alreadyExists = addresses.some(addr => 
      addr.full_address.toLowerCase().trim() === validatedAddress.full_address.toLowerCase().trim()
    );
    
    if (alreadyExists) {
      console.log('Address already exists in project, skipping:', validatedAddress.full_address);
      alert('This address is already in your project!');
      return;
    }

    // Create optimistic address with temporary ID
    const optimisticId = `temp-${Date.now()}`;
    const optimisticAddress: Address = {
      id: optimisticId,
      project_id: currentProjectId,
      street: validatedAddress.street,
      city: validatedAddress.city,
      state: validatedAddress.state,
      zip_code: validatedAddress.zip_code,
      full_address: validatedAddress.full_address,
      latitude: validatedAddress.latitude,
      longitude: validatedAddress.longitude,
      boundary_geojson: validatedAddress.boundary_geojson,
      created_at: new Date().toISOString()
    };

    // Immediately update UI with optimistic address
    setAddresses([...addresses, optimisticAddress]);
    console.log('Optimistically added address to UI with boundary:', optimisticAddress);

    // Submit to backend in background
    addressesAPI.addToProject(currentProjectId, validatedAddress)
      .then((newAddress) => {
        // Replace optimistic address with real one from backend
        setAddresses((prevAddresses: Address[]) => 
          prevAddresses.map((addr: Address) => 
            addr.id === optimisticId ? newAddress : addr
          )
        );
        console.log('Backend confirmed address:', newAddress);
        
        // Notify parent to refresh project list
        onProjectChange();
      })
      .catch((error) => {
        console.error('Error adding address from map:', error);
        
        // Remove optimistic address on failure
        setAddresses((prevAddresses: Address[]) => 
          prevAddresses.filter((addr: Address) => addr.id !== optimisticId)
        );
        
        alert('Failed to add address. Please try again.');
      });
  };

  const handleLoadingComplete = async () => {
    // Get the result from the promise
    if (loadingPromise) {
      try {
        const result = await loadingPromise;
        if (result && result.updatedAddresses) {
          // Update addresses state NOW (after loading complete)
          setAddresses(result.updatedAddresses);
          
          // Store preloaded surrounding parcels if available
          if (result.surroundingParcels && setPreloadedSurroundingParcels) {
            console.log('Storing preloaded surrounding parcels for map view');
            setPreloadedSurroundingParcels(result.surroundingParcels);
          }
        }
      } catch (error) {
        console.error('Error in loading complete:', error);
      }
    }
    
    // Transition from loading to viewing (map)
    setViewState('viewing');
    setLoadingPromise(null);
    
    // Now notify parent to refresh project list (after loading is done)
    onProjectChange();
  };

  return {
    isSubmittingAddress,
    loadingPromise,
    handleAddressValidated,
    handleAddressSubmitted,
    handleRemoveAddress,
    handleAddAddressFromMap,
    handleLoadingComplete
  };
}
