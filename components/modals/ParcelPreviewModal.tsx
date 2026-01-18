'use client';

import React from 'react';

interface ParcelPreviewModalProps {
  parcelInfo: {
    address?: string;
    mail_address?: string;
    situs_address?: string;
    street_address?: string;
    city?: string;
    state?: string;
    zip?: string;
    owner?: string;
    owner1?: string;
    area_acres?: string | number;
    land_use?: string;
    _isMainParcel?: boolean;
    [key: string]: any;
  } | null;
}

export default function ParcelPreviewModal({ parcelInfo }: ParcelPreviewModalProps) {
  if (!parcelInfo) return null;

  // Try to find the street address from various possible field names
  const streetAddress = parcelInfo.street_address || 
                        parcelInfo.situs_address || 
                        parcelInfo.mail_address || 
                        parcelInfo.address || 
                        'Unknown Address';

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '24px',
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '16px',
      border: '1px solid #000000',
      zIndex: 20,
      width: '280px',
      minHeight: '150px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#000000',
          marginBottom: '4px'
        }}>
          {streetAddress}
      </div>
      {(parcelInfo.city || parcelInfo.state || parcelInfo.zip) && (
        <div style={{
          fontSize: '13px',
          color: '#666666',
          marginBottom: '12px'
        }}>
          {[parcelInfo.city, parcelInfo.state, parcelInfo.zip]
            .filter(Boolean)
            .join(', ')}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '12px'
      }}>
        {(parcelInfo.owner || parcelInfo.owner1) && (
          <div style={{ color: '#666666' }}>
            <span style={{ fontWeight: '500', color: '#000000' }}>Owner:</span> {parcelInfo.owner || parcelInfo.owner1}
          </div>
        )}
        {parcelInfo.area_acres && (
          <div style={{ color: '#666666' }}>
            <span style={{ fontWeight: '500', color: '#000000' }}>Size:</span> {parseFloat(String(parcelInfo.area_acres)).toFixed(2)} acres
          </div>
        )}
      </div>
    </div>
  );
}
