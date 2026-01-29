'use client';

import React, { useState, useRef, useEffect } from 'react';
import { addressesAPI } from '@/lib/api-client';
import { validateAddressClientSide } from '@/lib/mapbox-client';
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
  showHeader?: boolean;
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
  position = 'center',
  showHeader = false
}: AddressInputContainerProps) {
  
  // Rate limiting: prevent duplicate submissions within 10 seconds
  const lastSubmissionTime = useRef<number>(0);
  const RATE_LIMIT_MS = 10000; // 10 seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assembleMode, setAssembleMode] = useState(false);
  const [showBracket, setShowBracket] = useState(false);
  const [addressInputs, setAddressInputs] = useState<AddressInput[]>([
    { id: '1', address: '', validatedAddress: null, suggestions: [], showSuggestions: false }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [moveExistingUp, setMoveExistingUp] = useState(false);
  const previousInputCountRef = useRef(1);
  const searchTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const dropdownRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const suggestionCache = useRef<Map<string, any>>(new Map());

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

  // Update previous count after animation completes
  useEffect(() => {
    if (addressInputs.length > previousInputCountRef.current) {
      const timer = setTimeout(() => {
        previousInputCountRef.current = addressInputs.length;
      }, 600); // Match fade-in animation duration
      return () => clearTimeout(timer);
    }
  }, [addressInputs.length]);

  const handleAddressChange = (id: string, value: string) => {
    setAddressInputs(inputs =>
      inputs.map(input =>
        input.id === id
          ? { ...input, address: value }
          : input
      )
    );

    // Debounced autocomplete - start after 2 characters for faster results
    if (value.length < 2) {
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
        // Check cache first
        const cacheKey = value.toLowerCase().trim();
        const cached = suggestionCache.current.get(cacheKey);
        
        if (cached) {
          console.log('Using cached suggestions for:', value);
          setAddressInputs(inputs =>
            inputs.map(input =>
              input.id === id
                ? { ...input, suggestions: cached, showSuggestions: true }
                : input
            )
          );
          setError(null);
          return;
        }

        console.log('Fetching suggestions for:', value);
        
        // Try client-side Mapbox first (faster), fallback to backend
        let validation;
        try {
          validation = await validateAddressClientSide(value);
          console.log('Client-side validation response:', validation);
        } catch (clientError) {
          console.warn('Client-side validation failed, falling back to backend:', clientError);
          validation = await addressesAPI.validate(value);
          console.log('Backend validation response:', validation);
        }

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
            // Handle both client-side (object) and backend (string) suggestions
            if (typeof sugg === 'string') {
              results.push({
                full_address: sugg,
                street: '',
                city: '',
                state: '',
                zip_code: '',
                latitude: undefined,
                longitude: undefined,
              });
            } else {
              results.push({
                full_address: sugg.full_address,
                street: sugg.street,
                city: sugg.city,
                state: sugg.state,
                zip_code: sugg.zip_code,
                latitude: sugg.latitude,
                longitude: sugg.longitude,
              });
            }
          });

          // Cache the results
          suggestionCache.current.set(cacheKey, results);

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
    }, 150);

    searchTimeoutRefs.current.set(id, newTimeout);
  };

  const handleSuggestionClick = async (inputId: string, suggestion: AddressInput['suggestions'][0]) => {
    if (suggestion.street && suggestion.city && suggestion.state && suggestion.zip_code) {
      const validatedData: {
        street: string;
        city: string;
        state: string;
        zip_code: string;
        full_address: string;
        latitude?: number;
        longitude?: number;
      } = {
        street: suggestion.street,
        city: suggestion.city,
        state: suggestion.state,
        zip_code: suggestion.zip_code,
        full_address: suggestion.full_address,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      };
      
      setAddressInputs(inputs =>
        inputs.map(input =>
          input.id === inputId
            ? {
                ...input,
                address: validatedData.full_address,
                validatedAddress: validatedData,
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
          const validatedData: {
            street: string;
            city: string;
            state: string;
            zip_code: string;
            full_address: string;
            latitude?: number;
            longitude?: number;
          } = {
            street: validation.street,
            city: validation.city,
            state: validation.state,
            zip_code: validation.zip_code,
            full_address: validation.formatted_address,
            latitude: validation.latitude,
            longitude: validation.longitude,
          };
          
          setAddressInputs(inputs =>
            inputs.map(input =>
              input.id === inputId
                ? {
                    ...input,
                    address: validatedData.full_address,
                    validatedAddress: validatedData,
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
      setShowBracket(false);
      setMoveExistingUp(false);
      const firstInput = addressInputs[0];
      setAddressInputs([firstInput]);
      previousInputCountRef.current = 1;
    } else {
      // Turn on assemble mode - trigger animation sequence
      setAssembleMode(true);
      setShowBracket(true);
      
      // Trigger move-up animation
      setMoveExistingUp(true);
      
      // Add second input after brief delay
      if (addressInputs.length === 1) {
        setTimeout(() => {
          setAddressInputs([
            ...addressInputs,
            { id: Date.now().toString(), address: '', validatedAddress: null, suggestions: [], showSuggestions: false }
          ]);
          previousInputCountRef.current = 2;
          
          // Reset move-up state after animation
          setTimeout(() => {
            setMoveExistingUp(false);
          }, 150);
        }, 10);
      }
    }
  };

  const handleAddInput = () => {
    // Trigger move-up animation for existing containers
    setMoveExistingUp(true);
    
    // Add new input after a brief delay
    setTimeout(() => {
      const newInputs = [
        ...addressInputs,
        { id: Date.now().toString(), address: '', validatedAddress: null, suggestions: [], showSuggestions: false }
      ];
      setAddressInputs(newInputs);
      
      // Reset move-up state after animation
      setTimeout(() => {
        setMoveExistingUp(false);
      }, 150);
    }, 10);
  };

  const handleRemoveInput = (id: string) => {
    if (addressInputs.length === 1) return;
    const newInputs = addressInputs.filter(input => input.id !== id);
    setAddressInputs(newInputs);
    previousInputCountRef.current = newInputs.length;
    if (newInputs.length === 1) {
      // Going back to single input, turn off assemble mode
      setAssembleMode(false);
      setShowBracket(false);
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
          const validated: {
            street: string;
            city: string;
            state: string;
            zip_code: string;
            full_address: string;
            latitude?: number;
            longitude?: number;
          } = {
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
              const validated: {
                street: string;
                city: string;
                state: string;
                zip_code: string;
                full_address: string;
                latitude?: number;
                longitude?: number;
              } = {
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
      {/* Header Text */}
      {showHeader && (
        <h1 style={{
          fontSize: '28px',
          fontWeight: '400',
          color: '#111827',
          margin: 0,
          marginBottom: '36px',
          textAlign: 'center',
          letterSpacing: '-0.02em',
          transform: (moveExistingUp && assembleMode) ? 'translateY(-35px)' : 'translateY(0)',
          transition: 'transform 0.15s ease-out'
        }}>
          What address are we exploring today?
        </h1>
      )}
      
      {/* Address Inputs Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'visible'
      }}>
        {/* Left Arrow Bracket */}
        {showBracket && (() => {
          // Calculate dynamic bracket height based on number of inputs
          const containerHeight = 55; // Input container height (accounts for padding + content)
          const gap = 12; // Gap between containers
          const inputRowHeight = containerHeight + gap; // 67px per row
          const centerOffset = 27.5; // Center of each container
          
          // Vertical span from first center to last center
          const spanHeight = (addressInputs.length - 1) * inputRowHeight;
          
          // Total bracket SVG height (add padding for the arrows)
          const bracketHeight = spanHeight + 20;
          const verticalLineHeight = spanHeight;
          const pathLength = 22 + verticalLineHeight + 22;
          
          return (
            <div 
              key={addressInputs.length} // Re-render and re-animate when count changes
              style={{ 
                position: 'absolute', 
                left: '-45px', 
                top: `${centerOffset}px`, // Position at first container's center
                zIndex: 1,
                transition: 'height 0.3s ease-out'
              }}
            >
              <svg 
                width="35" 
                height={bracketHeight}
                viewBox={`0 0 35 ${bracketHeight}`}
              >
                <path
                  className="bracket-main"
                  d={`M 30 10 L 8 10 L 8 ${verticalLineHeight + 10} L 30 ${verticalLineHeight + 10}`}
                  stroke="#374151"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="square"
                  strokeDasharray={pathLength}
                  strokeDashoffset={pathLength}
                />
                <path
                  className="bracket-top"
                  d="M 30 10 L 30 6"
                  stroke="#374151"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                  strokeDasharray="4"
                  strokeDashoffset="4"
                />
                <path
                  className="bracket-bottom"
                  d={`M 30 ${verticalLineHeight + 10} L 30 ${verticalLineHeight + 14}`}
                  stroke="#374151"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                  strokeDasharray="4"
                  strokeDashoffset="4"
                />
              </svg>
            </div>
          );
        })()}

        {addressInputs.map((input, index) => {
          const isNewInput = index >= previousInputCountRef.current;
          const isExistingInput = !isNewInput;
          
          return (
          <div 
            key={input.id}
            style={{ 
              position: 'relative', 
              zIndex: input.showSuggestions ? 30 : 1,
              animation: isNewInput ? 'fadeInInput 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'none',
              opacity: isNewInput ? 0 : 1,
              transform: (isExistingInput && moveExistingUp) ? 'translateY(-35px)' : 'translateY(0)',
              transition: isExistingInput ? 'transform 0.15s ease-out' : 'none'
            }}
          >
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
                ref={(el) => { inputRefs.current.set(input.id, el); }}
                type="text"
                placeholder="Input any address"
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
                className="address-input"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
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
                  padding: '6px 12px',
                  borderRadius: '50px',
                  border: assembleMode ? '2px solid #5B9EFF' : '1px solid #D1D5DB',
                  backgroundColor: assembleMode ? '#D6E4FF' : '#ffffff',
                  color: assembleMode ? '#5B9EFF' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                ref={(el) => { dropdownRefs.current.set(input.id, el); }}
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
          );
        })}

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
        
        @keyframes drawBracket {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes fadeInInput {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .bracket-main {
          animation: drawBracket 0.6s ease-out forwards;
        }
        
        .bracket-top {
          animation: drawBracket 0.1s ease-out forwards;
          animation-delay: 0s;
        }
        
        .bracket-bottom {
          animation: drawBracket 0.1s ease-out forwards;
          animation-delay: 0.5s;
        }
        
        .address-input::placeholder {
          color: #9CA3AF;
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}
