'use client';

import React from 'react';
import { Address } from '@/lib/api-client';

interface AddressListProps {
  addresses: Address[];
  onRemoveAddress: (addressId: string) => void;
  onViewMap: () => void;
  onAddAnother: () => void;
}

export default function AddressList({
  addresses,
  onRemoveAddress,
  onViewMap,
  onAddAnother
}: AddressListProps) {
  if (addresses.length === 0) {
    return null;
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '700px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 4px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#000000',
          margin: 0
        }}>
          Addresses ({addresses.length})
        </h2>
        <button
          onClick={onAddAnother}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          + Add Another
        </button>
      </div>

      {/* Address Cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {addresses.map((address) => (
          <div
            key={address.id}
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid #e5e5e5',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)';
            }}
          >
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{
                fontSize: '15px',
                fontWeight: '500',
                color: '#000000'
              }}>
                {address.street}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#666666'
              }}>
                {address.city}, {address.state} {address.zip_code}
              </div>
            </div>

            <button
              onClick={() => onRemoveAddress(address.id)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e5e5',
                backgroundColor: '#ffffff',
                color: '#c00',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fee';
                e.currentTarget.style.borderColor = '#c00';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e5e5';
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* View Map Button */}
      <button
        onClick={onViewMap}
        style={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: '#000000',
          color: '#ffffff',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginTop: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#333333';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#000000';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        View on Map
      </button>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

