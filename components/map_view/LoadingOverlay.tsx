'use client';

import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
}

export default function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '40px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Animated Loading Spinner */}
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #E5E7EB',
          borderTop: '4px solid #3B82F6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#000000',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span>Recovering your project</span>
          <span className="ellipsis-animation" style={{
            display: 'inline-block',
            width: '20px',
            marginLeft: '2px'
          }}>
            <span className="dot1">.</span>
            <span className="dot2">.</span>
            <span className="dot3">.</span>
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
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
