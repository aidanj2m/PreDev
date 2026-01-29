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
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #E5E7EB'
    }}>
      {/* Header with Project Name */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#000000',
          fontWeight: '600',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {projectName || 'Chat'}
        </div>
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#9CA3AF',
            fontSize: '14px'
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
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                lineHeight: '1.5',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {msg.content}
              </div>
            ) : (
              <div style={{
                color: '#374151',
                fontSize: '14px',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                maxWidth: '100%'
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
            fontSize: '13px',
            paddingLeft: '4px'
          }}>
            Thinking{dots}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #E5E7EB',
        backgroundColor: '#ffffff'
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
            placeholder="Ask anything"
            style={{
              flex: 1,
              padding: '12px 48px 12px 16px',
              backgroundColor: '#F3F4F6',
              border: 'none',
              borderRadius: '24px',
              fontSize: '14px',
              outline: 'none',
              color: '#111827'
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'transparent',
              border: 'none',
              width: '32px',
              height: '32px',
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
              width={32}
              height={32}
            />
          </button>
        </form>
      </div>
    </div>
  );
}
