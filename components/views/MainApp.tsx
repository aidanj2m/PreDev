'use client';

import React, { useState, useEffect } from 'react';
import AddressInputContainer from '@/components/modals/AddressInputContainer';
import AddressList from '@/components/modals/AddressList';
import MapView from './MapView';
import { Address, projectsAPI, addressesAPI } from '@/lib/api-client';

type ViewState = 'input' | 'building' | 'viewing';

interface MainAppProps {
  currentProjectId: string | null;
  onProjectChange: () => void;
}

export default function MainApp({ currentProjectId, onProjectChange }: MainAppProps) {
  const [viewState, setViewState] = useState<ViewState>('input');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showInput, setShowInput] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Rate limiting for submissions
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Load project data when project changes
  useEffect(() => {
    if (currentProjectId) {
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
      
      // Determine view state based on addresses
      if (project.addresses.length === 0) {
        setViewState('input');
        setShowInput(true);
      } else {
        // Go straight to map view for existing projects
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
    if (!currentProjectId) {
      console.error('No current project');
      return;
    }

    // Prevent concurrent submissions
    if (isSubmittingAddress) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    setIsSubmittingAddress(true);
    try {
      const newAddress = await addressesAPI.addToProject(currentProjectId, validatedAddress);
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
    if (!currentProjectId) {
      console.error('No current project');
      return;
    }

    // Prevent concurrent submissions
    if (isSubmittingAddress) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    setIsSubmittingAddress(true);
    try {
      const newAddress = await addressesAPI.addToProject(currentProjectId, validatedAddress);
      setAddresses([...addresses, newAddress]);
      
      // Go straight to map view (Enter key behavior)
      setViewState('viewing');
      
      // Notify parent to refresh project list
      onProjectChange();
    } catch (error) {
      console.error('Error adding address:', error);
      alert('Failed to add address. Please try again.');
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const handleRemoveAddress = async (addressId: string) => {
    try {
      await addressesAPI.delete(addressId);
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

  // If no project selected, show placeholder
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
        backgroundColor: '#f5f5f5'
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

        <div style={{
          textAlign: 'center',
          zIndex: 1
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '12px'
          }}>
            Welcome to PreDev
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#666666',
            marginBottom: '24px'
          }}>
            Create a new project to start surveying properties
          </p>
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
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          fontSize: '16px',
          color: '#666666'
        }}>
          Loading project...
        </div>
      </main>
    );
  }

  // Viewing state - show map
  if (viewState === 'viewing') {
    return (
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#f5f5f5'
      }}>
        <MapView 
          addresses={addresses} 
          onBack={handleBackFromMap} 
          onAddAddress={handleAddAddressFromMap}
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
      backgroundColor: '#f5f5f5',
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

