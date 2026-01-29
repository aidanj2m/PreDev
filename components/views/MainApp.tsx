'use client';

import React, { useState, useEffect } from 'react';
import AddressInputContainer from '@/components/modals/AddressInputContainer';
import AddressList from '@/components/modals/AddressList';
import MapView from './MapView';
import ChatBot from './ChatBot';
import { Address, projectsAPI, addressesAPI } from '@/lib/api-client';

type ViewState = 'input' | 'building' | 'viewing';

interface MainAppProps {
  currentProjectId: string | null;
  onProjectChange: () => void;
  onCreateProjectWithAddress: () => Promise<string>;
}

export default function MainApp({ currentProjectId, onProjectChange, onCreateProjectWithAddress }: MainAppProps) {
  const [viewState, setViewState] = useState<ViewState>('input');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showInput, setShowInput] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [projectName, setProjectName] = useState<string>('');
  
  // Rate limiting for submissions
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Load project data when project changes
  useEffect(() => {
    if (currentProjectId) {
      // Load the project data
      loadProjectData(currentProjectId);
    } else {
      // Reset to initial state if no project
      setAddresses([]);
      setViewState('input');
      setShowInput(true);
    }
  }, [currentProjectId]);

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

  const handleAddressValidated = async (validatedAddress: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    latitude?: number;
    longitude?: number;
  }) => {
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

  const handleAddressSubmitted = async (validatedAddress: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    latitude?: number;
    longitude?: number;
  }) => {
    // Prevent concurrent submissions
    if (isSubmittingAddress) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    setIsSubmittingAddress(true);
    setIsLoading(true); // Show loading overlay
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
      setAddresses([...addresses, newAddress]);
      
      // Go straight to viewing (Enter key behavior)
      setViewState('viewing');
      
      // Notify parent to refresh project list
      onProjectChange();
    } catch (error) {
      console.error('Error adding address:', error);
      alert('Failed to add address. Please try again.');
    } finally {
      setIsSubmittingAddress(false);
      setIsLoading(false);
    }
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

  const handleViewMap = () => {
    setViewState('viewing');
  };

  const handleBackFromMap = () => {
    setViewState('building');
  };

  const handleAddAnother = () => {
    setShowInput(true);
  };

  const handleAddAddressFromMap = async (validatedAddress: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    latitude?: number;
    longitude?: number;
    boundary_geojson?: any;
  }) => {
    if (!currentProjectId) {
      console.error('No current project');
      return;
    }

    // ⚠️ CRITICAL: Check if address already exists in current project
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

    // Immediately update UI with optimistic address (including boundary)
    setAddresses([...addresses, optimisticAddress]);
    console.log('Optimistically added address to UI with boundary:', optimisticAddress);

    // Submit to backend in background
    addressesAPI.addToProject(currentProjectId, validatedAddress)
      .then((newAddress) => {
        // Replace optimistic address with real one from backend
        setAddresses(prevAddresses => 
          prevAddresses.map(addr => 
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
        setAddresses(prevAddresses => 
          prevAddresses.filter(addr => addr.id !== optimisticId)
        );
        
        alert('Failed to add address. Please try again.');
      });
  };

  // If no project selected, show address input to create one
  if (!currentProjectId) {
    return (
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e5e5' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: 0.4,
          pointerEvents: 'none'
        }} />

        {/* Content Container */}
        <div style={{
          width: '100%',
          maxWidth: '700px',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '-120px'
        }}>
          <AddressInputContainer
            onAddressValidated={handleAddressValidated}
            onAddressSubmitted={handleAddressSubmitted}
            visible={true}
            position="center"
            showHeader={true}
          />
        </div>
      </main>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '40px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}>
          {/* Animated Loading Spinner */}
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #000000',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#000000'
            }}>
              {isSubmittingAddress ? 'Finding Property Boundaries...' : 'Loading Project...'}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666666',
              textAlign: 'center',
              maxWidth: '300px'
            }}>
              {isSubmittingAddress 
                ? 'Fetching parcel data and surrounding properties. This may take a moment.'
                : 'Please wait while we load your project data.'}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

  // Viewing state - show map with floating chatbot overlay
  if (viewState === 'viewing') {
    return (
      <main style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        {/* MapView - full width */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <MapView 
            addresses={addresses} 
            onBack={handleBackFromMap} 
            onAddAddress={handleAddAddressFromMap}
            onRemoveAddress={handleRemoveAddress}
          />
        </div>

        {/* Floating ChatBot overlay */}
        <ChatBot 
          addresses={addresses}
          projectName={projectName}
        />
      </main>
    );
  }

  // Input or Building state
  return (
    <main style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: viewState === 'input' ? 'center' : 'flex-start',
      padding: '40px',
      position: 'relative',
      overflow: 'auto',
      backgroundColor: '#ffffff',
      transition: 'all 0.3s ease-out'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e5e5' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        opacity: 0.4,
        pointerEvents: 'none'
      }} />

      {/* Content Container */}
      <div style={{
        width: '100%',
        maxWidth: '700px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        zIndex: 1
      }}>
        {/* Address Input */}
        {showInput && (
          <AddressInputContainer
            onAddressValidated={handleAddressValidated}
            onAddressSubmitted={handleAddressSubmitted}
            visible={showInput}
            position={viewState === 'building' ? 'top' : 'center'}
          />
        )}

        {/* Address List */}
        {viewState === 'building' && addresses.length > 0 && (
          <AddressList
            addresses={addresses}
            onRemoveAddress={handleRemoveAddress}
            onViewMap={handleViewMap}
            onAddAnother={handleAddAnother}
          />
        )}
      </div>
    </main>
  );
}
