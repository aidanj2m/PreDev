'use client';

import React, { useState } from 'react';
import { NJDEP_WETLAND_COLORS } from '@/lib/map-layer-styles';

interface WetlandTypeInfo {
  name: string;
  color: string;
  count?: number;
  total_acres?: number;
  land_use_code?: number;
}

interface EnvironmentalLayersPanelProps {
  showWetlands: boolean;
  onWetlandsChange: (show: boolean) => void;
  wetlandCount: number;
  wetlandTypes: WetlandTypeInfo[];
  showWetlandsLegend: boolean;
  onToggleWetlandsLegend: () => void;
  onRefreshWetlands: () => void;
  autoRefreshWetlands: boolean;
  onAutoRefreshChange: (autoRefresh: boolean) => void;

  // New Redevelopment Zones Props
  showRedevZones: boolean;
  onRedevZonesChange: (show: boolean) => void;
  redevZoneCount: number;

  isLoading: boolean;
}

// Define wetland categories for organized legend display
const WETLAND_CATEGORIES: { name: string; types: string[]; color: string }[] = [
  {
    name: 'Wooded Wetlands',
    color: '#1B4332',
    types: [
      'DECIDUOUS WOODED WETLANDS',
      'CONIFEROUS WOODED WETLANDS',
      'MIXED WOODED WETLANDS (DECIDUOUS DOM.)',
      'MIXED WOODED WETLANDS (CONIFEROUS DOM.)',
      'ATLANTIC WHITE CEDAR WETLANDS'
    ]
  },
  {
    name: 'Scrub/Shrub Wetlands',
    color: '#95D5B2',
    types: [
      'DECIDUOUS SCRUB/SHRUB WETLANDS',
      'CONIFEROUS SCRUB/SHRUB WETLANDS',
      'MIXED SCRUB/SHRUB WETLANDS (DECIDUOUS DOM.)',
      'MIXED SCRUB/SHRUB WETLANDS (CONIFEROUS DOM.)'
    ]
  },
  {
    name: 'Herbaceous & Freshwater',
    color: '#14B8A6',
    types: [
      'HERBACEOUS WETLANDS',
      'FRESHWATER TIDAL MARSHES'
    ]
  },
  {
    name: 'Coastal & Saline',
    color: '#0284C7',
    types: [
      'SALINE MARSH (LOW MARSH)',
      'SALINE MARSH (HIGH MARSH)',
      'UNVEGETATED FLATS',
      'VEGETATED DUNE COMMUNITIES'
    ]
  },
  {
    name: 'Phragmites (Invasive)',
    color: '#DC2626',
    types: [
      'PHRAGMITES DOMINATE COASTAL WETLANDS',
      'PHRAGMITES DOMINATE INTERIOR WETLANDS',
      'PHRAGMITES DOMINATE URBAN AREA'
    ]
  },
  {
    name: 'Disturbed & Agricultural',
    color: '#F59E0B',
    types: [
      'DISTURBED WETLANDS (MODIFIED)',
      'DISTURBED TIDAL WETLANDS',
      'AGRICULTURAL WETLANDS (MODIFIED)',
      'FORMER AGRICULTURAL WETLAND (BECOMING SHRUBBY, NOT BUILT-UP)'
    ]
  },
  {
    name: 'Managed & Urban',
    color: '#8B5CF6',
    types: [
      'MANAGED WETLAND IN MAINTAINED LAWN GREENSPACE',
      'MANAGED WETLAND IN BUILT-UP MAINTAINED REC AREA',
      'WETLAND RIGHTS-OF-WAY',
      'CEMETERY ON WETLAND'
    ]
  },
  {
    name: 'Other',
    color: '#78350F',
    types: [
      'SEVERE BURNED WETLAND VEGETATION'
    ]
  }
];

// Helper to format label for display (title case)
function formatLabel(label: string): string {
  if (!label) return '';
  return label
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (['dom.', 'in', 'on', 'and', 'of'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace('(deciduous Dom.)', '(Dec. Dom.)')
    .replace('(coniferous Dom.)', '(Con. Dom.)');
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
  showRedevZones,
  onRedevZonesChange,
  redevZoneCount,
  isLoading
}: EnvironmentalLayersPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  // Build a lookup for wetland type data
  const wetlandTypeMap = new Map<string, WetlandTypeInfo>();
  wetlandTypes.forEach(wt => {
    wetlandTypeMap.set(wt.name?.toUpperCase(), wt);
  });

  // Calculate total acres visible
  const totalAcresInView = wetlandTypes.reduce((sum, wt) => sum + (wt.total_acres || 0), 0);

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 8,
      padding: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 220,
      maxWidth: 280,
      zIndex: 10
    }}>
      {/* Header */}
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#1F2937',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          🗺️ Environmental Layers
          {isLoading && (
            <span style={{
              width: 12,
              height: 12,
              border: '2px solid #E5E7EB',
              borderTop: '2px solid #059669',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              display: 'inline-block'
            }} />
          )}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Redevelopment Zones Toggle */}
        <div style={{ paddingBottom: 8, borderBottom: '1px solid #E5E7EB' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '2px 0 6px 0',
            cursor: 'pointer',
            fontSize: 13,
            color: '#1F2937'
          }}>
            <input
              type="checkbox"
              checked={showRedevZones}
              onChange={(e) => onRedevZonesChange(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#EA580C' }}
            />
            <span style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              backgroundColor: '#FDBA74',
              border: '1px dashed #EA580C',
              borderRadius: 3,
              opacity: 0.8
            }} />
            Redev Areas
            {showRedevZones && redevZoneCount > 0 && (
              <span style={{
                fontSize: 10,
                color: '#EA580C',
                backgroundColor: '#FFF7ED',
                padding: '2px 6px',
                borderRadius: 10,
                fontWeight: 500
              }}>
                {redevZoneCount.toLocaleString()}
              </span>
            )}
          </label>

          {showRedevZones && (
            <div style={{ fontSize: 10, color: '#6B7280', paddingLeft: 24 }}>
              <span style={{ color: '#EA580C', fontWeight: 600 }}>Dashed Orange</span>: Areas in Need
            </div>
          )}
        </div>

        {/* Wetlands Toggle */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '2px 0',
            cursor: 'pointer',
            fontSize: 13,
            color: '#1F2937'
          }}>
            <input
              type="checkbox"
              checked={showWetlands}
              onChange={(e) => onWetlandsChange(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#059669' }}
            />
            <span style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              background: 'linear-gradient(135deg, #1B4332 0%, #14B8A6 50%, #0284C7 100%)',
              opacity: 0.8,
              borderRadius: 3,
              border: '1px solid rgba(0,0,0,0.2)'
            }} />
            NJ Wetlands
            {showWetlands && wetlandCount > 0 && (
              <span style={{
                fontSize: 10,
                color: '#059669',
                backgroundColor: '#ECFDF5',
                padding: '2px 6px',
                borderRadius: 10,
                fontWeight: 500
              }}>
                {wetlandCount.toLocaleString()}
              </span>
            )}
          </label>

          {/* Wetlands Controls */}
          {showWetlands && (
            <div style={{
              marginLeft: 24,
              paddingLeft: 10,
              borderLeft: '2px solid #10B981',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 4
            }}>
              {/* Summary Stats */}
              {wetlandCount > 0 && (
                <div style={{
                  fontSize: 11,
                  color: '#6B7280',
                  backgroundColor: '#F9FAFB',
                  padding: '6px 8px',
                  borderRadius: 4
                }}>
                  <div><strong>{wetlandCount.toLocaleString()}</strong> features in view</div>
                  {totalAcresInView > 0 && (
                    <div><strong>{totalAcresInView.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> total acres</div>
                  )}
                </div>
              )}

              {/* Legend Toggle */}
              <button
                onClick={onToggleWetlandsLegend}
                style={{
                  background: showWetlandsLegend ? '#ECFDF5' : 'transparent',
                  border: '1px solid #D1D5DB',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11,
                  color: '#374151',
                  textAlign: 'left',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span style={{ fontSize: 10 }}>{showWetlandsLegend ? '▼' : '▶'}</span>
                {showWetlandsLegend ? 'Hide Legend' : 'Show Legend'} ({wetlandTypes.length} types)
              </button>

              {/* Auto-refresh is now always enabled for better UX */}
            </div>
          )}

          {/* Wetlands Legend - Categorized */}
          {showWetlands && showWetlandsLegend && wetlandTypes.length > 0 && (
            <div style={{
              marginLeft: 24,
              paddingLeft: 10,
              borderLeft: '2px solid #10B981',
              fontSize: 11,
              color: '#374151',
              maxHeight: 300,
              overflowY: 'auto',
              marginTop: 4
            }}>
              {WETLAND_CATEGORIES.map((category) => {
                // Find wetland types in this category that exist in our data
                const typesInCategory = category.types.filter(t =>
                  wetlandTypeMap.has(t.toUpperCase())
                );

                if (typesInCategory.length === 0) return null;

                const isExpanded = expandedCategories.has(category.name);
                const categoryCount = typesInCategory.reduce((sum, t) => {
                  const wt = wetlandTypeMap.get(t.toUpperCase());
                  return sum + (wt?.count || 0);
                }, 0);

                return (
                  <div key={category.name} style={{ marginBottom: 4 }}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.name)}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 0',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#1F2937'
                      }}
                    >
                      <span style={{ fontSize: 9, width: 10 }}>{isExpanded ? '▼' : '▶'}</span>
                      <span style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        backgroundColor: category.color,
                        opacity: 0.7,
                        borderRadius: 2,
                        border: `1px solid ${category.color}`,
                        flexShrink: 0
                      }} />
                      <span style={{ flex: 1 }}>{category.name}</span>
                      <span style={{
                        fontSize: 9,
                        color: '#9CA3AF',
                        fontWeight: 400
                      }}>
                        {categoryCount.toLocaleString()}
                      </span>
                    </button>

                    {/* Individual Types */}
                    {isExpanded && (
                      <div style={{ paddingLeft: 18, paddingTop: 2 }}>
                        {typesInCategory.map((typeName) => {
                          const wt = wetlandTypeMap.get(typeName.toUpperCase());
                          const color = NJDEP_WETLAND_COLORS[typeName.toUpperCase()] || '#6B7280';

                          return (
                            <div key={typeName} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 0',
                              fontSize: 10
                            }}>
                              <span style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                backgroundColor: color,
                                opacity: 0.8,
                                borderRadius: 2,
                                flexShrink: 0
                              }} />
                              <span style={{
                                flex: 1,
                                lineHeight: 1.3,
                                color: '#4B5563'
                              }}>
                                {formatLabel(typeName)}
                              </span>
                              {wt?.count && (
                                <span style={{
                                  fontSize: 9,
                                  color: '#9CA3AF',
                                  minWidth: 30,
                                  textAlign: 'right'
                                }}>
                                  {wt.count.toLocaleString()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
