'use client';

import React, { useEffect, useState } from 'react';
import { Address, addressesAPI } from '@/lib/api-client';

interface AssemblyDataViewProps {
  addresses: Address[];
}

interface PropertyData {
  addressId: string;
  address: Address;
  parcels?: any;
  buildings?: any;
  assessments?: any;
  ownership?: any;
  tax?: any;
  zoning?: any;
  environmental?: any;
  demographics?: any;
}

// Helper function to format field names
const formatFieldName = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/Sqft/g, 'Sq Ft')
    .replace(/Fips/g, 'FIPS')
    .replace(/Id/g, 'ID')
    .replace(/Apn/g, 'APN');
};

// Helper function to format values
const formatValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return 'N/A';
  
  // Handle JSON objects/arrays
  if (typeof value === 'object') {
    return 'View in detail'; // Don't display raw JSON
  }
  
  // Handle currency fields
  if (key.includes('value') || key.includes('amount') || key.includes('price') || key.includes('tax_')) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
  }
  
  // Handle area/acreage fields
  if (key.includes('acre') || key.includes('area')) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return `${num.toFixed(2)} acres`;
    }
  }
  
  // Handle square footage
  if (key.includes('sqft') || key.includes('square_feet')) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('en-US').format(num) + ' sq ft';
    }
  }
  
  // Handle year fields
  if (key.includes('year')) {
    return String(value);
  }
  
  // Handle boolean
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  return String(value);
};

// Helper to get acres from property data (parcels table)
const getAcresFromPropertyData = (data: PropertyData): number => {
  // Try ll_gisacre from parcels (Regrid calculated acres)
  if (data.parcels?.ll_gisacre) {
    const acres = parseFloat(data.parcels.ll_gisacre);
    if (!isNaN(acres)) return acres;
  }
  
  // Try gisacre
  if (data.parcels?.gisacre) {
    const acres = parseFloat(data.parcels.gisacre);
    if (!isNaN(acres)) return acres;
  }
  
  // Try deeded_acres
  if (data.parcels?.deeded_acres) {
    const acres = parseFloat(data.parcels.deeded_acres);
    if (!isNaN(acres)) return acres;
  }
  
  // Calculate from sqft if available
  if (data.parcels?.ll_gissqft) {
    const sqft = parseFloat(data.parcels.ll_gissqft);
    if (!isNaN(sqft)) return sqft / 43560; // Convert sq ft to acres
  }
  
  // Fallback: try boundary_geojson properties
  if (data.address?.boundary_geojson?.properties?.ll_gisacre) {
    const acres = parseFloat(data.address.boundary_geojson.properties.ll_gisacre);
    if (!isNaN(acres)) return acres;
  }
  
  return 0;
};

// Helper to render data grid
const renderDataGrid = (data: any, emptyMessage: string) => {
  if (!data) {
    return <div style={{ fontSize: '14px', color: '#666666' }}>{emptyMessage}</div>;
  }

  const entries = Object.entries(data).filter(
    ([key, value]) =>
      key !== 'id' &&
      key !== 'address_id' &&
      key !== 'created_at' &&
      value !== null &&
      value !== undefined &&
      value !== '' &&
      typeof value !== 'object' // Skip nested objects/JSON
  );

  if (entries.length === 0) {
    return <div style={{ fontSize: '14px', color: '#666666' }}>{emptyMessage}</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{
          padding: '12px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#666666',
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            {formatFieldName(key)}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#000000',
            wordBreak: 'break-word'
          }}>
            {formatValue(key, value)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function AssemblyDataView({ addresses }: AssemblyDataViewProps) {
  const [propertyData, setPropertyData] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('overview');

  useEffect(() => {
    const fetchPropertyData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch property data for each address
        const dataPromises = addresses.map(async (addr) => {
          try {
            const propertyInfo = await addressesAPI.getPropertyData(addr.id);
            return {
              addressId: addr.id,
              address: addr,
              parcels: propertyInfo.parcels,
              buildings: propertyInfo.buildings,
              assessments: propertyInfo.assessments,
              ownership: propertyInfo.ownership,
              tax: propertyInfo.tax,
              zoning: propertyInfo.zoning,
              environmental: propertyInfo.environmental,
              demographics: propertyInfo.demographics
            };
          } catch (error) {
            console.error(`Error fetching property data for ${addr.id}:`, error);
            // Return address with null data if fetch fails
            return {
              addressId: addr.id,
              address: addr,
              parcels: null,
              buildings: null,
              assessments: null,
              ownership: null,
              tax: null,
              zoning: null,
              environmental: null,
              demographics: null
            };
          }
        });

        const fetchedData = await Promise.all(dataPromises);
        setPropertyData(fetchedData);
      } catch (error) {
        console.error('Error fetching property data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (addresses.length > 0) {
      fetchPropertyData();
    }
  }, [addresses]);

  const categories = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'parcels', label: 'Parcel Info', icon: '🏞️' },
    { id: 'buildings', label: 'Buildings', icon: '🏢' },
    { id: 'assessments', label: 'Assessments', icon: '💰' },
    { id: 'ownership', label: 'Ownership', icon: '👤' },
    { id: 'tax', label: 'Tax', icon: '🧾' },
    { id: 'zoning', label: 'Zoning', icon: '📐' },
    { id: 'environmental', label: 'Environmental', icon: '🌿' },
    { id: 'demographics', label: 'Demographics', icon: '📊' }
  ];

  // Calculate assembly totals
  const totalProperties = addresses.length;
  const totalAcres = propertyData.reduce((sum, data) => sum + getAcresFromPropertyData(data), 0);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      backgroundColor: '#F9FAFB',
      overflow: 'hidden'
    }}>
      {/* Left Sidebar - Categories */}
      <div style={{
        width: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #E5E7EB',
        padding: '24px 16px',
        overflowY: 'auto'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#666666',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '16px'
        }}>
          Data Categories
        </h3>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: selectedCategory === category.id ? '#F3F4F6' : 'transparent',
                color: selectedCategory === category.id ? '#000000' : '#666666',
                fontSize: '14px',
                fontWeight: selectedCategory === category.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px'
      }}>
        {/* Loading State */}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px'
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
                border: '3px solid #E5E7EB',
                borderTop: '3px solid #000000',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <div style={{ fontSize: '14px', color: '#666666' }}>
                Loading property data...
              </div>
            </div>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Overview Tab */}
        {!isLoading && selectedCategory === 'overview' && (
          <div>
            {/* Assembly Summary */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#000000',
                marginBottom: '20px'
              }}>
                Assembly Overview
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#666666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Total Properties
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '600',
                    color: '#000000'
                  }}>
                    {totalProperties}
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#666666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Total Area
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '600',
                    color: '#000000'
                  }}>
                    {totalAcres.toFixed(2)}
                    <span style={{ fontSize: '14px', color: '#666666', marginLeft: '4px' }}>acres</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Properties */}
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#000000',
              marginBottom: '16px'
            }}>
              Properties in Assembly
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {propertyData.map((data, index) => {
                const acres = getAcresFromPropertyData(data);
                const owner = data.ownership?.owner || data.address.boundary_geojson?.properties?.owner;
                const landUse = data.zoning?.usedesc || data.address.boundary_geojson?.properties?.land_use;
                
                return (
                  <div
                    key={data.addressId}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#000000',
                          marginBottom: '4px'
                        }}>
                          {data.address.street}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#666666'
                        }}>
                          {data.address.city}, {data.address.state} {data.address.zip_code}
                        </div>
                      </div>

                      <div style={{
                        padding: '4px 12px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#666666'
                      }}>
                        #{index + 1}
                      </div>
                    </div>

                    {/* Property metrics */}
                    {(acres > 0 || owner || landUse) && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #F3F4F6'
                      }}>
                        {acres > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#666666', marginBottom: '2px' }}>
                              Area
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#000000' }}>
                              {acres.toFixed(2)} acres
                            </div>
                          </div>
                        )}
                        
                        {owner && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#666666', marginBottom: '2px' }}>
                              Owner
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#000000' }}>
                              {owner}
                            </div>
                          </div>
                        )}

                        {landUse && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#666666', marginBottom: '2px' }}>
                              Land Use
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#000000' }}>
                              {landUse}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Parcel Info Tab */}
        {!isLoading && selectedCategory === 'parcels' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000000', marginBottom: '20px' }}>
              Parcel Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {propertyData.map((data, index) => (
                <div key={data.addressId} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {data.address.street}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                  {renderDataGrid(data.parcels, 'No parcel data available')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buildings Tab */}
        {!isLoading && selectedCategory === 'buildings' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000000', marginBottom: '20px' }}>
              Building Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {propertyData.map((data, index) => (
                <div key={data.addressId} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {data.address.street}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                  {renderDataGrid(data.buildings, 'No building data available')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessments Tab */}
        {!isLoading && selectedCategory === 'assessments' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000000', marginBottom: '20px' }}>
              Assessment Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {propertyData.map((data, index) => (
                <div key={data.addressId} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {data.address.street}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                  {renderDataGrid(data.assessments, 'No assessment data available')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ownership Tab */}
        {!isLoading && selectedCategory === 'ownership' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000000', marginBottom: '20px' }}>
              Ownership Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {propertyData.map((data, index) => (
                <div key={data.addressId} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {data.address.street}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                  {renderDataGrid(data.ownership, 'No ownership data available')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax Tab */}
        {!isLoading && selectedCategory === 'tax' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000000', marginBottom: '20px' }}>
              Tax Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {propertyData.map((data, index) => (
                <div key={data.addressId} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {data.address.street}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                  {renderDataGrid(data.tax, 'No tax data available')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zoning Tab */}
        {!isLoading && selectedCategory === 'zoning' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000000', marginBottom: '20px' }}>
              Zoning Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {propertyData.map((data, index) => (
                <div key={data.addressId} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {data.address.street}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                  {renderDataGrid(data.zoning, 'No zoning data available')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Environmental Tab */}
        {!isLoading && selectedCategory === 'environmental' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000000', marginBottom: '20px' }}>
              Environmental Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {propertyData.map((data, index) => (
                <div key={data.addressId} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {data.address.street}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                  {renderDataGrid(data.environmental, 'No environmental data available')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demographics Tab */}
        {!isLoading && selectedCategory === 'demographics' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#000000', marginBottom: '20px' }}>
              Demographics Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {propertyData.map((data, index) => (
                <div key={data.addressId} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {data.address.street}
                    </h3>
                    <div style={{
                      padding: '4px 10px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                  {renderDataGrid(data.demographics, 'No demographics data available')}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
