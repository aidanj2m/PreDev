'use client';

import React, { useState } from 'react';
import AddressInputContainer from '@/components/modals/AddressInputContainer';
import AddressList from '@/components/modals/AddressList';
import MapView from '@/components/map_view/MapView';
import ChatBot from './ChatBot';
import LoadingView from './LoadingView';
import { Address } from '@/lib/api-client';
import { MainAppProps } from './types';
import { useProjectData } from './useProjectData';
import { useAddressHandlers } from './useAddressHandlers';

export default function MainApp({ currentProjectId, onProjectChange, onCreateProjectWithAddress }: MainAppProps) {
  const [viewState, setViewState] = useState<'input' | 'building' | 'loading' | 'viewing'>('input');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showInput, setShowInput] = useState(true);
  const [projectName, setProjectName] = useState<string>('');
  const [preloadedSurroundingParcels, setPreloadedSurroundingParcels] = useState<any[] | null>(null);
  
  // Load project data
  const { isLoading: isLoadingProject } = useProjectData(
    currentProjectId,
    viewState,
    setAddresses,
    setProjectName,
    setViewState,
    setShowInput
  );
  
  // Address handlers
  const {
    loadingPromise,
    handleAddressValidated,
    handleAddressSubmitted,
    handleRemoveAddress,
    handleAddAddressFromMap,
    handleLoadingComplete
  } = useAddressHandlers(
    currentProjectId,
    addresses,
    setAddresses,
    setProjectName,
    setViewState,
    setShowInput,
    onCreateProjectWithAddress,
    onProjectChange,
    setPreloadedSurroundingParcels
  );

  // Simple view state handlers
  const handleViewMap = () => setViewState('viewing');
  const handleBackFromMap = () => setViewState('building');
  const handleAddAnother = () => setShowInput(true);

  // Show loading view - must be checked BEFORE !currentProjectId guard
  // because project creation happens inside the loading promise
  if (viewState === 'loading' && loadingPromise) {
    return (
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff'
      }}>
        <LoadingView 
          loadingPromise={loadingPromise}
          onLoadingComplete={handleLoadingComplete}
        />
      </main>
    );
  }

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

  // Loading existing project data
  if (isLoadingProject && currentProjectId) {
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
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e5e5',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading project...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
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
            preloadedSurroundingParcels={preloadedSurroundingParcels}
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
