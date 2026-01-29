'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Address, zoningAPI } from '@/lib/api-client';
import Image from 'next/image';

interface ChatBotProps {
  addresses: Address[];
  projectName?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

export default function ChatBot({ addresses, projectName }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dots, setDots] = useState('');
  const [displayedContent, setDisplayedContent] = useState<{ [key: number]: string }>({});
  const [isMinimized, setIsMinimized] = useState(true); // Start collapsed
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current project ID
  const projectId = addresses.length > 0 ? addresses[0].project_id : undefined;

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedContent]);

  // Animate ellipsis when loading
  useEffect(() => {
    if (!isLoading) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Typing animation for assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastMessageIndex = messages.length - 1;
    
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isTyping) {
      const fullContent = lastMessage.content;
      let currentIndex = 0;

      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }

      typingIntervalRef.current = setInterval(() => {
        if (currentIndex <= fullContent.length) {
          setDisplayedContent(prev => ({
            ...prev,
            [lastMessageIndex]: fullContent.slice(0, currentIndex)
          }));
          currentIndex += 2;
        } else {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
          }
          setMessages(prev => 
            prev.map((msg, idx) => 
              idx === lastMessageIndex ? { ...msg, isTyping: false } : msg
            )
          );
        }
      }, 15);

      return () => {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
      };
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const addressIds = addresses.map(addr => addr.id);
      const response = await zoningAPI.query(userMessage, {
        projectId,
        addressIds
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer,
        isTyping: true
      }]);
    } catch (error) {
      console.error('Error querying AI:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.',
        isTyping: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      left: '16px',
      ...(isMinimized ? { bottom: '24px' } : { top: '24px', bottom: '24px' }),
      width: '320px',
      height: isMinimized ? '52px' : undefined,
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMinimized ? 'center' : 'stretch',
      justifyContent: isMinimized ? 'center' : 'flex-start',
      backgroundColor: '#ffffff',
      borderRadius: isMinimized ? '26px' : '16px',
      boxShadow: isMinimized ? '0 4px 16px rgba(0, 0, 0, 0.1)' : '0 8px 32px rgba(0, 0, 0, 0.12)',
      overflow: 'hidden',
      zIndex: 100,
      cursor: isMinimized ? 'pointer' : 'default',
      transition: 'all 0.3s ease-in-out',
      padding: isMinimized ? '0 24px' : '0',
      transformOrigin: 'bottom left'
    }}
    onClick={isMinimized ? () => setIsMinimized(false) : undefined}
    onMouseEnter={isMinimized ? (e) => {
      e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.2)';
    } : undefined}
    onMouseLeave={isMinimized ? (e) => {
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
    } : undefined}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        opacity: isMinimized ? 1 : 0,
        transform: isMinimized ? 'scale(1)' : 'scale(0.95)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: isMinimized ? 'auto' : 'none',
        position: isMinimized ? 'relative' : 'absolute'
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span style={{
          fontSize: '14px',
          color: '#6B7280',
          userSelect: 'none',
          whiteSpace: 'nowrap'
        }}>
          Ask questions about your property
        </span>
      </div>

      {/* Header with Project Name */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #F3F4F6',
        display: isMinimized ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FAFAFA',
        opacity: isMinimized ? 0 : 1,
        transform: isMinimized ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease 0.1s, transform 0.3s ease 0.1s'
      }}>
        <div style={{
          fontSize: '13px',
          color: '#000000',
          fontWeight: '600',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginRight: '12px'
        }}>
          {projectName || 'Chat'}
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: isMinimized ? 'none' : 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#FAFAFA',
        opacity: isMinimized ? 0 : 1,
        transform: isMinimized ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease 0.15s, transform 0.3s ease 0.15s'
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#9CA3AF',
            fontSize: '13px',
            textAlign: 'center',
            padding: '0 20px'
          }}>
            Ask questions about your property
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              width: 'auto'
            }}
          >
            {msg.role === 'user' ? (
              <div style={{
                backgroundColor: '#3B82F6',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '16px',
                fontSize: '13px',
                lineHeight: '1.5',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
              }}>
                {msg.content}
              </div>
            ) : (
              <div style={{
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '13px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                maxWidth: '100%',
                padding: '8px 14px',
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}>
                {msg.isTyping && displayedContent[idx] !== undefined 
                  ? displayedContent[idx] 
                  : msg.content}
                {msg.isTyping && <span style={{ opacity: 0.6 }}>▋</span>}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start',
            color: '#9CA3AF',
            fontSize: '12px',
            paddingLeft: '14px',
            fontStyle: 'italic'
          }}>
            Thinking{dots}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #F3F4F6',
        backgroundColor: '#ffffff',
        display: isMinimized ? 'none' : 'block',
        opacity: isMinimized ? 0 : 1,
        transform: isMinimized ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease 0.2s, transform 0.3s ease 0.2s'
      }}>
        <form 
          onSubmit={handleSendMessage}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything..."
            style={{
              flex: 1,
              padding: '10px 42px 10px 14px',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '20px',
              fontSize: '13px',
              outline: 'none',
              color: '#111827',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = '#F9FAFB';
              e.target.style.borderColor = '#E5E7EB';
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'transparent',
              border: 'none',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (!inputValue.trim() || isLoading) ? 'default' : 'pointer',
              opacity: (!inputValue.trim() || isLoading) ? 0.5 : 1,
              transition: 'opacity 0.2s',
              padding: 0
            }}
          >
            <Image 
              src={isLoading ? "/generatingButton.png" : "/SendButton.png"}
              alt={isLoading ? "Generating" : "Send"}
              width={28}
              height={28}
            />
          </button>
        </form>
      </div>
    </div>
  );
}
