'use client';

import React, { useState, useEffect } from 'react';

interface LoadingViewProps {
  onLoadingComplete: () => void;
  loadingPromise: Promise<any>;
}

type CheckpointStatus = 'pending' | 'loading' | 'completed';

interface LoadingCheckpoint {
  id: string;
  label: string;
  status: CheckpointStatus;
}

export default function LoadingView({ onLoadingComplete, loadingPromise }: LoadingViewProps) {
  const [loadingCheckpoints, setLoadingCheckpoints] = useState<LoadingCheckpoint[]>([
    { id: 'parcel', label: 'Loading nearby parcels', status: 'loading' },
    { id: 'environmental', label: 'Checking environmental layers', status: 'pending' },
    { id: 'contamination', label: 'Analyzing contamination risks', status: 'pending' },
    { id: 'regulatory', label: 'Loading regulatory zones', status: 'pending' },
    { id: 'zoning', label: 'Retrieving zoning data', status: 'pending' }
  ]);

  useEffect(() => {
    const startLoading = async () => {
      // Start the 75-second checkpoint animation (1 minute 15 seconds)
      const TOTAL_ANIMATION_TIME = 75000; // 75 seconds (1 min 15 sec)
      const CHECKPOINTS_COUNT = 5;
      const CHECKPOINT_INTERVAL = TOTAL_ANIMATION_TIME / CHECKPOINTS_COUNT; // 15 seconds per checkpoint

      // Animate checkpoints (don't complete all until backend is done)
      const animateCheckpoints = async () => {
        // Checkpoint 1: Loading nearby parcels
        await new Promise(resolve => setTimeout(resolve, CHECKPOINT_INTERVAL));
        setLoadingCheckpoints(prev => prev.map(cp => 
          cp.id === 'parcel' ? { ...cp, status: 'completed' } :
          cp.id === 'environmental' ? { ...cp, status: 'loading' } : cp
        ));

        // Checkpoint 2: Checking environmental layers
        await new Promise(resolve => setTimeout(resolve, CHECKPOINT_INTERVAL));
        setLoadingCheckpoints(prev => prev.map(cp => 
          cp.id === 'environmental' ? { ...cp, status: 'completed' } :
          cp.id === 'contamination' ? { ...cp, status: 'loading' } : cp
        ));

        // Checkpoint 3: Analyzing contamination risks
        await new Promise(resolve => setTimeout(resolve, CHECKPOINT_INTERVAL));
        setLoadingCheckpoints(prev => prev.map(cp => 
          cp.id === 'contamination' ? { ...cp, status: 'completed' } :
          cp.id === 'regulatory' ? { ...cp, status: 'loading' } : cp
        ));

        // Checkpoint 4: Loading regulatory zones
        await new Promise(resolve => setTimeout(resolve, CHECKPOINT_INTERVAL));
        setLoadingCheckpoints(prev => prev.map(cp => 
          cp.id === 'regulatory' ? { ...cp, status: 'completed' } :
          cp.id === 'zoning' ? { ...cp, status: 'loading' } : cp
        ));

        // Checkpoint 5: Retrieving zoning data
        // Keep this one loading until backend completes
        await new Promise(resolve => setTimeout(resolve, CHECKPOINT_INTERVAL));
        console.log('Animation timer complete (75s), waiting for backend API...');
        
        return true;
      };

      // Start animation and wait for it to reach the end
      const animationPromise = animateCheckpoints();
      await animationPromise;

      // Animation is done, but now wait for backend to finish before showing all complete
      console.log('Waiting for backend API to complete...');
      await loadingPromise;
      console.log('Backend API complete! Showing all checkpoints as completed.');

      // NOW mark all checkpoints as completed
      setLoadingCheckpoints(prev => prev.map(cp => ({ ...cp, status: 'completed' })));

      // Show "Complete!" for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to map
      console.log('Redirecting to map view...');
      onLoadingComplete();
    };

    startLoading();
  }, [loadingPromise, onLoadingComplete]);

  const getCheckpointIcon = (status: CheckpointStatus) => {
    switch (status) {
      case 'completed':
        return (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: 'checkmark 0.4s ease-out 0.1s both' }}>
              <path
                d="M15 4.5L6.75 12.75L3 9"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="24"
                strokeDashoffset="24"
                style={{ animation: 'drawCheck 0.4s ease-out 0.1s forwards' }}
              />
            </svg>
          </div>
        );
      case 'loading':
        return (
          <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: '#9CA3AF'
            }} />
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: '#3B82F6',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        );
      default:
        return (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px dashed #3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: 0.5
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M15 4.5L6.75 12.75L3 9"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
    }
  };

  const allCompleted = loadingCheckpoints.every(c => c.status === 'completed');

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF'
    }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        {/* Title */}
        <h1 style={{
          fontSize: 32,
          fontWeight: 600,
          color: '#000000',
          marginBottom: 48,
          letterSpacing: '-0.01em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span>Locating your parcel</span>
          {!allCompleted && (
            <span className="ellipsis-animation" style={{
              display: 'inline-block',
              width: '45px',
              marginLeft: '4px'
            }}>
              <span className="dot1">.</span>
              <span className="dot2">.</span>
              <span className="dot3">.</span>
            </span>
          )}
        </h1>

        {/* Checkpoints */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          alignItems: 'flex-start',
          maxWidth: 400,
          margin: '0 auto'
        }}>
          {loadingCheckpoints.map((checkpoint) => (
            <div
              key={checkpoint.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: '100%'
              }}
            >
              {getCheckpointIcon(checkpoint.status)}
              <div style={{
                fontSize: 18,
                fontWeight: 400,
                color: '#000000',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span>{checkpoint.label}</span>
                {checkpoint.status === 'loading' && (
                  <span className="ellipsis-animation" style={{
                    marginLeft: '2px',
                    display: 'inline-block',
                    width: '20px'
                  }}>
                    <span className="dot1">.</span>
                    <span className="dot2">.</span>
                    <span className="dot3">.</span>
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Complete indicator */}
          {allCompleted && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              width: '100%',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                animation: 'scaleIn 0.4s ease-out'
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M15 4.5L6.75 12.75L3 9"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="24"
                    strokeDashoffset="24"
                    style={{ animation: 'drawCheck 0.4s ease-out 0.2s forwards' }}
                  />
                </svg>
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#3B82F6',
                textAlign: 'left'
              }}>
                Complete!
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes drawCheck {
          0% {
            stroke-dashoffset: 24;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ellipsis {
          0%, 20% {
            opacity: 0;
          }
          50%, 100% {
            opacity: 1;
          }
        }

        .ellipsis-animation .dot1 {
          animation: ellipsis 1.4s infinite;
          animation-delay: 0s;
        }

        .ellipsis-animation .dot2 {
          animation: ellipsis 1.4s infinite;
          animation-delay: 0.2s;
        }

        .ellipsis-animation .dot3 {
          animation: ellipsis 1.4s infinite;
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
}
