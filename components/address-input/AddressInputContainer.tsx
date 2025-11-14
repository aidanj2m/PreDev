'use client';

import React, { useState, useRef, useEffect } from 'react';
import { addressesAPI } from '@/lib/api-client';

interface AddressInputContainerProps {
  onAddressValidated: (validatedAddress: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  visible: boolean;
  position?: 'center' | 'top';
}

export default function AddressInputContainer({
  onAddressValidated,
  visible,
  position = 'center'
}: AddressInputContainerProps) {
  const [address, setAddress] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  const handleAssemble = async () => {
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const validation = await addressesAPI.validate(address);

      if (!validation.valid) {
        setError('Invalid address. Please check and try again.');
        if (validation.suggestions.length > 0) {
          setSuggestions(validation.suggestions);
          setShowSuggestions(true);
        }
        return;
      }

      // Call parent with validated address
      if (validation.street && validation.city && validation.state && validation.zip_code && validation.formatted_address) {
        onAddressValidated({
          street: validation.street,
          city: validation.city,
          state: validation.state,
          zip_code: validation.zip_code,
          full_address: validation.formatted_address,
          latitude: validation.latitude,
          longitude: validation.longitude,
        });
        
        // Clear input after successful validation
        setAddress('');
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        setError('Could not parse address components');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate address');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAssemble();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setAddress(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  if (!visible) {
    return null;
  }

  return (
    <div style={{
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '700px',
      animation: position === 'top' ? 'slideDown 0.3s ease-out' : 'fadeIn 0.3s ease-out',
    }}>
      {/* Input Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderRadius: '50px',
        border: '1px solid #e5e5e5',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}>
        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Input Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isValidating}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '15px',
            color: '#000000',
            backgroundColor: 'transparent',
            fontFamily: 'inherit'
          }}
        />

        {/* Assemble Button */}
        <button
          onClick={handleAssemble}
          disabled={isValidating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '50px',
            border: '1px solid #e5e5e5',
            backgroundColor: isValidating ? '#f5f5f5' : '#ffffff',
            color: '#000000',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isValidating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            outline: 'none',
            flexShrink: 0,
            opacity: isValidating ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!isValidating) {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.borderColor = '#d4d4d4';
            }
          }}
          onMouseLeave={(e) => {
            if (!isValidating) {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e5e5';
            }
          }}
        >
          <img 
            src="/AssembleIcon.png" 
            alt="Assemble" 
            width={16} 
            height={16}
            style={{ display: 'block' }}
          />
          {isValidating ? 'Validating...' : 'Assemble'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '12px',
          padding: '10px 16px',
          borderRadius: '8px',
          backgroundColor: '#fee',
          color: '#c00',
          fontSize: '14px',
          width: '100%'
        }}>
          {error}
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          marginTop: '8px',
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden'
        }}>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid #f5f5f5' : 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9f9f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <div style={{ fontSize: '14px', color: '#000000' }}>
                {suggestion}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
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

