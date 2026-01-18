'use client';

import React, { useState, useRef, useEffect } from 'react';
import { addressesAPI } from '@/lib/api-client';
import Image from 'next/image';

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
  onAddressSubmitted: (validatedAddress: {
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

interface AddressInput {
  id: string;
  address: string;
  validatedAddress: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    latitude?: number;
    longitude?: number;
  } | null;
  suggestions: Array<{
    full_address: string;
    street: string;
    city: string;
    state: string;
    zip_code: string;
    latitude?: number;
    longitude?: number;
  }>;
  showSuggestions: boolean;
}

export default function AddressInputContainer({
  onAddressValidated,
  onAddressSubmitted,
  visible,
  position = 'center'
}: AddressInputContainerProps) {
  
  // Rate limiting: prevent duplicate submissions within 10 seconds
  const lastSubmissionTime = useRef<number>(0);
  const RATE_LIMIT_MS = 10000; // 10 seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assembleMode, setAssembleMode] = useState(false);
  const [addressInputs, setAddressInputs] = useState<AddressInput[]>([
    { id: '1', address: '', validatedAddress: null, suggestions: [], showSuggestions: false }
  ]);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const dropdownRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let clickedInside = false;

      // Check if click was inside any input or dropdown
      inputRefs.current.forEach((input) => {
        if (input?.contains(target)) clickedInside = true;
      });
      dropdownRefs.current.forEach((dropdown) => {
        if (dropdown?.contains(target)) clickedInside = true;
      });

      if (!clickedInside) {
        setAddressInputs(inputs =>
          inputs.map(input => ({ ...input, showSuggestions: false }))
        );
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddressChange = (id: string, value: string) => {
    setAddressInputs(inputs =>
      inputs.map(input =>
        input.id === id
          ? { ...input, address: value }
          : input
      )
    );

    // Debounced autocomplete
    if (value.length < 3) {
      setAddressInputs(inputs =>
        inputs.map(input =>
          input.id === id
            ? { ...input, suggestions: [], showSuggestions: false }
            : input
        )
      );
      return;
    }

    const timeout = searchTimeoutRefs.current.get(id);
    if (timeout) clearTimeout(timeout);

    const newTimeout = setTimeout(async () => {
      try {
        console.log('Fetching suggestions for:', value);
        const validation = await addressesAPI.validate(value);
        console.log('Validation response:', validation);

        if (validation.valid && validation.formatted_address) {
          const results = [{
            full_address: validation.formatted_address,
            street: validation.street || '',
            city: validation.city || '',
            state: validation.state || '',
            zip_code: validation.zip_code || '',
            latitude: validation.latitude,
            longitude: validation.longitude,
          }];

          validation.suggestions.forEach(sugg => {
            results.push({
              full_address: sugg,
              street: '',
              city: '',
              state: '',
              zip_code: '',
              latitude: undefined,
              longitude: undefined,
            });
          });

          console.log('Setting suggestions:', results);
          setAddressInputs(inputs =>
            inputs.map(input =>
              input.id === id
                ? { ...input, suggestions: results, showSuggestions: true }
                : input
            )
          );
          setError(null);
        } else {
          console.log('Validation failed or no address found');
        }
      } catch (err) {
        console.error('Autocomplete error:', err);
        setError(`Failed to fetch suggestions: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 500);

    searchTimeoutRefs.current.set(id, newTimeout);
  };

  const handleSuggestionClick = async (inputId: string, suggestion: AddressInput['suggestions'][0]) => {
    if (suggestion.street && suggestion.city && suggestion.state && suggestion.zip_code) {
      setAddressInputs(inputs =>
        inputs.map(input =>
          input.id === inputId
            ? {
                ...input,
                address: suggestion.full_address,
                validatedAddress: {
                  street: suggestion.street,
                  city: suggestion.city,
                  state: suggestion.state,
                  zip_code: suggestion.zip_code,
                  full_address: suggestion.full_address,
                  latitude: suggestion.latitude,
                  longitude: suggestion.longitude,
                },
                showSuggestions: false
              }
            : input
        )
      );
      
      // Refocus the input after state update
      setTimeout(() => {
        const inputElement = inputRefs.current.get(inputId);
        if (inputElement) {
          inputElement.focus();
        }
      }, 0);
    } else {
      try {
        const validation = await addressesAPI.validate(suggestion.full_address);
        if (validation.valid && validation.street && validation.city && validation.state && validation.zip_code && validation.formatted_address) {
          setAddressInputs(inputs =>
            inputs.map(input =>
              input.id === inputId
                ? {
                    ...input,
                    address: validation.formatted_address,
                    validatedAddress: {
                      street: validation.street,
                      city: validation.city,
                      state: validation.state,
                      zip_code: validation.zip_code,
                      full_address: validation.formatted_address,
                      latitude: validation.latitude,
                      longitude: validation.longitude,
                    },
                    showSuggestions: false
                  }
                : input
            )
          );
          
          // Refocus the input after state update
          setTimeout(() => {
            const inputElement = inputRefs.current.get(inputId);
            if (inputElement) {
              inputElement.focus();
            }
          }, 0);
        }
      } catch (err) {
        setError('Failed to validate address');
      }
    }
  };

  const handleAssembleToggle = () => {
    if (assembleMode) {
      // Turn off assemble mode - keep only the first input with its data preserved
      setAssembleMode(false);
      setAddressInputs([addressInputs[0]]);
    } else {
      // Turn on assemble mode - add second input, preserve existing input
      setAssembleMode(true);
      if (addressInputs.length === 1) {
        setAddressInputs([
          ...addressInputs,
          { id: Date.now().toString(), address: '', validatedAddress: null, suggestions: [], showSuggestions: false }
        ]);
      }
    }
  };

  const handleAddInput = () => {
    setAddressInputs([
      ...addressInputs,
      { id: Date.now().toString(), address: '', validatedAddress: null, suggestions: [], showSuggestions: false }
    ]);
  };

  const handleRemoveInput = (id: string) => {
    if (addressInputs.length === 1) return;
    setAddressInputs(addressInputs.filter(input => input.id !== id));
    if (addressInputs.length === 2) {
      // Going back to single input, turn off assemble mode
      setAssembleMode(false);
    }
  };

  const handleKeyDown = async (inputId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Rate limiting check
      const now = Date.now();
      const timeSinceLastSubmission = now - lastSubmissionTime.current;
      
      if (timeSinceLastSubmission < RATE_LIMIT_MS) {
        const remainingSeconds = Math.ceil((RATE_LIMIT_MS - timeSinceLastSubmission) / 1000);
        setError(`Please wait ${remainingSeconds} seconds before submitting another address`);
        return;
      }

      // Prevent double submission
      if (isSubmitting) {
        setError('Submission in progress, please wait...');
        return;
      }

      const input = addressInputs.find(inp => inp.id === inputId);
      if (!input) return;

      if (input.validatedAddress) {
        setIsSubmitting(true);
        lastSubmissionTime.current = now;
        
        try {
          await onAddressSubmitted(input.validatedAddress);
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      if (input.suggestions.length > 0) {
        const firstSuggestion = input.suggestions[0];

        if (firstSuggestion.street && firstSuggestion.city && firstSuggestion.state && firstSuggestion.zip_code) {
          const validated = {
            street: firstSuggestion.street,
            city: firstSuggestion.city,
            state: firstSuggestion.state,
            zip_code: firstSuggestion.zip_code,
            full_address: firstSuggestion.full_address,
            latitude: firstSuggestion.latitude,
            longitude: firstSuggestion.longitude,
          };
          onAddressSubmitted(validated);
        } else {
          try {
            const validation = await addressesAPI.validate(firstSuggestion.full_address);
            if (validation.valid && validation.street && validation.city && validation.state && validation.zip_code && validation.formatted_address) {
              const validated = {
                street: validation.street,
                city: validation.city,
                state: validation.state,
                zip_code: validation.zip_code,
                full_address: validation.formatted_address,
                latitude: validation.latitude,
                longitude: validation.longitude,
              };
              onAddressSubmitted(validated);
            }
          } catch (err) {
            setError('Failed to validate address');
          }
        }
      }
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '700px',
      animation: position === 'top' ? 'slideDown 0.3s ease-out' : 'fadeIn 0.3s ease-out',
    }}>
      {/* Address Inputs Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginLeft: assembleMode && addressInputs.length > 1 ? '50px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
        {/* Left Arrow Bracket */}
        {assembleMode && addressInputs.length > 1 && (
          <svg 
            width="35" 
            height={addressInputs.length * 70}
            style={{
              position: 'absolute',
              left: '-45px',
              top: '0',
              zIndex: 1
            }}
            viewBox={`0 0 35 ${addressInputs.length * 70}`}
          >
            <path
              d={`M 30 5 L 8 5 L 8 ${addressInputs.length * 70 - 5} L 30 ${addressInputs.length * 70 - 5}`}
              stroke="#374151"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="square"
            />
            <path
              d="M 30 5 L 30 8"
              stroke="#374151"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
            <path
              d={`M 30 ${addressInputs.length * 70 - 5} L 30 ${addressInputs.length * 70 - 8}`}
              stroke="#374151"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        )}

        {addressInputs.map((input, index) => (
          <div key={input.id} style={{ position: 'relative', zIndex: input.showSuggestions ? 30 : 1 }}>
            {/* Input Container */}
            <div style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '50px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.15s ease',
              zIndex: 11
            }}>
              {/* Input Field */}
              <input
                ref={(el) => inputRefs.current.set(input.id, el)}
                type="text"
                placeholder="Input Address"
                value={input.address}
                onChange={(e) => handleAddressChange(input.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(input.id, e)}
                onFocus={() => {
                  // Re-show suggestions if they exist and input has enough characters
                  if (input.suggestions.length > 0 && input.address.length >= 3) {
                    setAddressInputs(inputs =>
                      inputs.map(inp =>
                        inp.id === input.id
                          ? { ...inp, showSuggestions: true }
                          : inp
                      )
                    );
                  }
                }}
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

              {/* Assemble Button - appears on every input */}
              <button
                onClick={handleAssembleToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '50px',
                  border: assembleMode ? '2px solid #5B9EFF' : '1px solid #D1D5DB',
                  backgroundColor: assembleMode ? '#D6E4FF' : '#ffffff',
                  color: assembleMode ? '#5B9EFF' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  if (!assembleMode) {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#9CA3AF';
                  } else {
                    e.currentTarget.style.backgroundColor = '#C3D9FF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!assembleMode) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  } else {
                    e.currentTarget.style.backgroundColor = '#D6E4FF';
                  }
                }}
              >
                <img 
                  src="/AssembleIcon.png" 
                  alt="Assemble" 
                  width={16} 
                  height={16}
                  style={{ 
                    display: 'block',
                    filter: assembleMode 
                      ? 'invert(45%) sepia(89%) saturate(2372%) hue-rotate(204deg) brightness(101%) contrast(101%)' 
                      : 'invert(47%) sepia(8%) saturate(593%) hue-rotate(182deg) brightness(95%) contrast(87%)'
                  }}
                />
                Assemble
              </button>

              {/* Remove button (X) - only show in assemble mode with multiple inputs */}
              {assembleMode && addressInputs.length > 1 && (
                <button
                  onClick={() => handleRemoveInput(input.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#F3F4F6',
                    color: '#9CA3AF',
                    fontSize: '18px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEE2E2';
                    e.currentTarget.style.color = '#DC2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.color = '#9CA3AF';
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {input.showSuggestions && input.suggestions.length > 0 && (
              <div 
                ref={(el) => dropdownRefs.current.set(input.id, el)}
                style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                overflow: 'hidden',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 100
              }}>
                {input.suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSuggestionClick(input.id, suggestion)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: idx < input.suggestions.length - 1 ? '1px solid #f5f5f5' : 'none',
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
                      {suggestion.full_address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Add button (Plus) - only show in assemble mode */}
        {assembleMode && (
          <button
            onClick={handleAddInput}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '50px',
              border: '1px dashed #D1D5DB',
              backgroundColor: 'transparent',
              color: '#6B7280',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.borderColor = '#9CA3AF';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: '300' }}>+</span>
            Add Another Address
          </button>
        )}
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
