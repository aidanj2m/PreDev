'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Address, zoningAPI, chatAPI, ChatSession } from '@/lib/api-client';
import Image from 'next/image';

interface RightSidebarProps {
  addresses: Address[];
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  imageUrl?: string | null;
}

export default function RightSidebar({ addresses, isOpen, onClose }: RightSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dots, setDots] = useState('');
  const [displayedContent, setDisplayedContent] = useState<{ [key: number]: string }>({});
  
  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const projectId = addresses.length > 0 ? addresses[0].project_id : undefined;

  // Load sessions on mount or project change
  useEffect(() => {
    if (projectId) {
      loadSessions(projectId);
    }
  }, [projectId]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const loadSessions = async (pid: string) => {
    try {
      const sessionList = await chatAPI.getProjectSessions(pid);
      setSessions(sessionList);
      // Optional: Automatically select most recent session? 
      // For now, start with blank "New Chat" state unless user selects one.
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const history = await chatAPI.getSessionMessages(sessionId);
      setMessages(history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        imageUrl: msg.image_url || null
      })));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setIsHistoryOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsHistoryOpen(false);
  };

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedContent, isHistoryOpen]);

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
    
    // Only animate if it's an assistant message and we haven't displayed it yet
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isTyping) {
      const fullContent = lastMessage.content;
      let currentIndex = 0;

      // Clear any existing typing interval
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }

      // Start typing animation
      typingIntervalRef.current = setInterval(() => {
        if (currentIndex <= fullContent.length) {
          setDisplayedContent(prev => ({
            ...prev,
            [lastMessageIndex]: fullContent.slice(0, currentIndex)
          }));
          currentIndex += 2; // Type 2 characters at a time for faster animation
        } else {
          // Typing complete
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
          }
          // Mark message as no longer typing
          setMessages(prev => 
            prev.map((msg, idx) => 
              idx === lastMessageIndex ? { ...msg, isTyping: false } : msg
            )
          );
        }
      }, 15); // 15ms per tick for fast typing

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
      
      let sessionId = currentSessionId;

      // Create session if valid project but no session
      if (!sessionId && projectId) {
        try {
          // Use first few words as title
          const title = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
          const newSession = await chatAPI.createSession(projectId, title);
          sessionId = newSession.id;
          setCurrentSessionId(sessionId);
          // Refresh session list to show new one
          loadSessions(projectId);
        } catch (err) {
          console.error("Failed to create session:", err);
          // Continue without session ID (won't persist)
        }
      }

      const response = await zoningAPI.query(userMessage, {
        projectId,
        addressIds,
        sessionId: sessionId || undefined
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer,
        isTyping: true // Mark for typing animation
      }]);
    } catch (error) {
      console.error('Error querying AI:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.',
        isTyping: false // Don't animate error messages
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      borderLeft: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with Session Controls */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #F3F4F6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          style={{
            fontSize: '13px',
            color: isHistoryOpen ? '#3B82F6' : '#6B7280',
            fontWeight: '500',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isHistoryOpen ? 'Back to Chat' : 'History'}
        </button>
        
        <button
          onClick={handleNewChat}
          style={{
            fontSize: '13px',
            color: '#3B82F6',
            fontWeight: '600',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          New Chat
        </button>
      </div>

      {/* Main Content Area */}
      {isHistoryOpen ? (
        // History List View
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px'
        }}>
          <h3 style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#9CA3AF',
            marginBottom: '12px',
            textTransform: 'uppercase'
          }}>
            Recent Chats
          </h3>
          {sessions.length === 0 ? (
            <div style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center', marginTop: '20px' }}>
              No chat history yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: currentSessionId === session.id ? '#EFF6FF' : '#F9FAFB',
                    border: currentSessionId === session.id ? '1px solid #BFDBFE' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                    {session.title || 'Untitled Chat'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {new Date(session.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Chat Interface
        <>
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
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.5,
                gap: '16px'
              }}>
                <Image src="/PreDevLogo.png" alt="PreDev" width={48} height={48} />
                <p style={{ fontSize: '14px', color: '#6B7280' }}>Start a new conversation</p>
              </div>
            )}

            {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '90%',
                    width: 'auto'
                  }}
                >
                  {msg.role === 'user' ? (
                    <div style={{
                      backgroundColor: '#3B82F6', // Blue for user
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
                placeholder="Ask Anything"
                style={{
                  width: '100%',
                  padding: '12px 48px 12px 16px',
                  backgroundColor: '#F3F4F6', // Light grey input
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
        </>
      )}
    </div>
  );
}
