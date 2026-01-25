'use client';

import React from 'react';

interface EnvironmentalLayersPanelProps {
  // Wetlands only
  showWetlands: boolean;
  onWetlandsChange: (show: boolean) => void;
  wetlandCount: number;
  wetlandTypes: Array<{ name: string; color: string }>;
  showWetlandsLegend: boolean;
  onToggleWetlandsLegend: () => void;
  onRefreshWetlands: () => void;
  autoRefreshWetlands: boolean;
  onAutoRefreshChange: (autoRefresh: boolean) => void;
  isLoading: boolean;
}

export default function EnvironmentalLayersPanel({
  showWetlands,
  onWetlandsChange,
  wetlandCount,
  wetlandTypes,
  showWetlandsLegend,
  onToggleWetlandsLegend,
  onRefreshWetlands,
  autoRefreshWetlands,
  onAutoRefreshChange,
  isLoading
}: EnvironmentalLayersPanelProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 8,
      padding: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 180,
      zIndex: 10
    }}>
      {/* Header */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: '#374151',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        Wetlands
        {isLoading && (
          <span style={{ fontSize: 10, color: '#6B7280' }}>(loading...)</span>
        )}
      </div>

      {/* Wetlands Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 0',
          cursor: 'pointer',
          fontSize: 13,
          color: '#1F2937'
        }}>
          <input
            type="checkbox"
            checked={showWetlands}
            onChange={(e) => onWetlandsChange(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            backgroundColor: '#059669',
            opacity: 0.6,
            borderRadius: 2,
            border: '1px solid #047857'
          }} />
          Wetlands
          {showWetlands && wetlandCount > 0 && (
            <span style={{ fontSize: 10, color: '#6B7280' }}>
              ({wetlandCount})
            </span>
          )}
        </label>

        {/* Wetlands Controls */}
        {showWetlands && (
          <div style={{
            marginLeft: 24,
            paddingLeft: 8,
            borderLeft: '2px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            {/* Legend Toggle */}
            {wetlandTypes.length > 0 && (
              <button
                onClick={onToggleWetlandsLegend}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  color: '#6B7280',
                  textDecoration: 'underline',
                  textAlign: 'left',
                  padding: 0
                }}
              >
                {showWetlandsLegend ? '▼ Hide' : '▶ Show'} Legend
              </button>
            )}

            {/* Manual Refresh Button */}
            <button
              onClick={onRefreshWetlands}
              disabled={isLoading}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              {isLoading ? 'Loading...' : 'Refresh Wetlands'}
            </button>

            {/* Auto-refresh Toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: '#6B7280',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoRefreshWetlands}
                onChange={(e) => onAutoRefreshChange(e.target.checked)}
                style={{ width: 12, height: 12, cursor: 'pointer' }}
              />
              Auto-refresh on pan/zoom
            </label>
          </div>
        )}

        {/* Wetlands Legend */}
        {showWetlands && showWetlandsLegend && wetlandTypes.length > 0 && (
          <div style={{
            marginLeft: 24,
            paddingLeft: 8,
            borderLeft: '2px solid #E5E7EB',
            fontSize: 11,
            color: '#6B7280',
            maxHeight: 200,
            overflowY: 'auto'
          }}>
            {wetlandTypes.map((type, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 0'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  backgroundColor: type.color,
                  opacity: 0.6,
                  borderRadius: 2,
                  border: `1px solid ${type.color}`,
                  flexShrink: 0
                }} />
                <span style={{ fontSize: 10, lineHeight: 1.2 }}>
                  {type.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
