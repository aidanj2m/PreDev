'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Address, zoningAPI, chatAPI, conceptPlanAPI, feasibilityAPI, ChatSession } from '@/lib/api-client';
import Image from 'next/image';

interface ChatViewProps {
  addresses: Address[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  type?: 'text' | 'conceptPlan' | 'feasibilityReport';
  imageBase64?: string | null;
  imageUrl?: string | null; // For loading images from chat history
  constraintsImageUrl?: string | null; // For feasibility report constraints diagram
  conceptPlanImageUrl?: string | null; // For feasibility report concept plan
}

type ChatMode = 'normal' | 'conceptPlan' | 'feasibilityReport';

export default function ChatView({ addresses }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dots, setDots] = useState('');
  const [displayedContent, setDisplayedContent] = useState<{ [key: number]: string }>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);

  // Get current project ID
  const projectId = addresses.length > 0 ? addresses[0].project_id : undefined;

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedContent]);

  // Close tool menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolMenuRef.current && !toolMenuRef.current.contains(event.target as Node)) {
        setShowToolMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch sessions when project changes
  useEffect(() => {
    const fetchSessions = async () => {
      if (!projectId) {
        setSessions([]);
        return;
      }
      
      setLoadingSessions(true);
      try {
        const projectSessions = await chatAPI.getProjectSessions(projectId);
        setSessions(projectSessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [projectId]);

  // Reset session when project changes (addresses change)
  useEffect(() => {
    // Clear session and messages when addresses change
    setSessionId(null);
    setMessages([]);
    setDisplayedContent({});
  }, [addresses.map(a => a.project_id).join(',')]);

  // Load a previous session's messages
  const loadSession = async (session: ChatSession) => {
    if (session.id === sessionId) return; // Already loaded
    
    try {
      const sessionMessages = await chatAPI.getSessionMessages(session.id);
      setSessionId(session.id);
      setMessages(sessionMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        isTyping: false,
        imageUrl: msg.image_url || null  // Include image URL from database
      })));
      setDisplayedContent({});
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // Start a new chat session
  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setDisplayedContent({});
  };

  // Refresh sessions list (called after creating new session)
  const refreshSessions = async () => {
    if (!projectId) return;
    try {
      const projectSessions = await chatAPI.getProjectSessions(projectId);
      setSessions(projectSessions);
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    }
  };

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
    const currentMode = chatMode;
    setInputValue('');
    
    // Show user message with mode indicator
    const userMessageDisplay = currentMode === 'conceptPlan' 
      ? `🏗️ Site Plan Request: ${userMessage}`
      : currentMode === 'feasibilityReport'
      ? `📊 Feasibility Report Request: ${userMessage}` 
      : userMessage;
    setMessages(prev => [...prev, { role: 'user', content: userMessageDisplay }]);
    setIsLoading(true);

    // Reset mode after sending
    if (currentMode === 'conceptPlan' || currentMode === 'feasibilityReport') {
      setChatMode('normal');
    }

    try {
      // Send all addresses in the assembly as context
      const addressIds = addresses.map(addr => addr.id);

      // Create a session if we don't have one yet (first message)
      let currentSessionId = sessionId;
      let isNewSession = false;
      if (!currentSessionId && projectId) {
        console.log('Creating new chat session for project:', projectId);
        const session = await chatAPI.createSession(projectId, 'Chat Session');
        currentSessionId = session.id;
        setSessionId(currentSessionId);
        isNewSession = true;
        console.log('Created chat session:', currentSessionId);
      }

      let responseContent = '';
      let conceptPlanImage: string | null = null;
      let conceptPlanImageUrl: string | null = null;
      let constraintsUrl: string | null = null;
      let conceptUrl: string | null = null;
      
      if (currentMode === 'feasibilityReport') {
        // Use feasibility report API
        console.log('Generating feasibility report with requirements:', userMessage);
        const response = await feasibilityAPI.generate(addressIds, {
          projectId,
          sessionId: currentSessionId || undefined,
          customRequirements: userMessage,
          developmentType: 'multifamily',
          unitCountTarget: 50
        });

        // Format feasibility report response
        responseContent = `# Feasibility Report Generated\n\n${response.summary_memo}\n\n---\n\n## Site Data\n\n${response.notes_document}`;
        
        // Capture BOTH images for feasibility report
        if (response.constraints_diagram_url) {
          constraintsUrl = response.constraints_diagram_url;
          console.log('✓ Constraints diagram URL received:', constraintsUrl);
        }
        if (response.concept_plan_url) {
          conceptUrl = response.concept_plan_url;
          console.log('✓ Concept plan URL received:', conceptUrl);
        }
        
        // Add compliance issues summary if any
        if (response.compliance_issues && response.compliance_issues.length > 0) {
          responseContent += '\n\n---\n\n**⚠️ Compliance Issues Found:**\n';
          response.compliance_issues.forEach(issue => {
            responseContent += `• ${issue}\n`;
          });
        }
      } else if (currentMode === 'conceptPlan') {
        // Use concept plan API
        console.log('Generating concept plan with requirements:', userMessage);
        const response = await conceptPlanAPI.generate(addressIds, {
          projectId,
          sessionId: currentSessionId || undefined,
          customRequirements: userMessage,
          developmentType: 'residential',
          includeImage: true
        });

        // Format concept plan response
        responseContent = response.concept_plan_analysis;
        
        // Capture image if generated
        if (response.image_base64) {
          conceptPlanImage = response.image_base64;
          console.log('✓ Concept plan image received');
        }
        if (response.image_url) {
          conceptPlanImageUrl = response.image_url;
          console.log('✓ Concept plan image URL received');
        }
        
        // Add compliance issues summary if any
        if (response.compliance_issues && response.compliance_issues.length > 0) {
          responseContent += '\n\n---\n\n**⚠️ Compliance Issues Found:**\n';
          response.compliance_issues.forEach(issue => {
            responseContent += `• ${issue}\n`;
          });
        }
      } else {
        // Use regular zoning query API
        const response = await zoningAPI.query(userMessage, {
          projectId,
          addressIds,
          sessionId: currentSessionId || undefined
        });
        responseContent = response.answer;
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responseContent,
        isTyping: true,
        type: currentMode === 'feasibilityReport' ? 'feasibilityReport' : currentMode === 'conceptPlan' ? 'conceptPlan' : 'text',
        imageBase64: conceptPlanImage,
        imageUrl: conceptPlanImageUrl,
        constraintsImageUrl: currentMode === 'feasibilityReport' ? constraintsUrl : undefined,
        conceptPlanImageUrl: currentMode === 'feasibilityReport' ? conceptUrl : undefined
      }]);

      // Refresh sessions list if we created a new session
      if (isNewSession) {
        refreshSessions();
      }
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

  // Handle tool selection from menu
  const handleToolSelect = (tool: 'conceptPlan' | 'feasibilityReport') => {
    setShowToolMenu(false);
    if (tool === 'conceptPlan') {
      setChatMode('conceptPlan');
    } else if (tool === 'feasibilityReport') {
      setChatMode('feasibilityReport');
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      height: '100%'
    }}>
      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0
      }}>
        {/* Header with Addresses */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#000000',
            fontWeight: '600',
            maxWidth: '70%',
            overflow: 'hidden'
          }}>
            {addresses.length > 0 ? (
              <span style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
                maxWidth: '100%'
              }}>
                {addresses.map((addr, idx) => (
                  <span key={addr.id}>
                    {addr.street || addr.full_address}
                    {idx < addresses.length - 1 && ' + '}
                  </span>
                ))}
              </span>
            ) : (
              <span>No addresses selected</span>
            )}
          </div>
        </div>

        {/* Chat Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
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
                    {/* Concept Plan Image */}
                    {/* Feasibility Report: Show BOTH images */}
                    {msg.type === 'feasibilityReport' && (msg.constraintsImageUrl || msg.conceptPlanImageUrl) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                        {/* Constraints Diagram */}
                        {msg.constraintsImageUrl && (
                          <div style={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid #E5E7EB',
                            backgroundColor: '#F9FAFB'
                          }}>
                            <img 
                              src={msg.constraintsImageUrl}
                              alt="Constraints Diagram"
                              style={{
                                width: '100%',
                                maxWidth: '600px',
                                height: 'auto',
                                display: 'block'
                              }}
                            />
                            <div style={{
                              padding: '8px 12px',
                              borderTop: '1px solid #E5E7EB',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#ffffff'
                            }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                ⚠️ Constraints Diagram
                              </span>
                              <a
                                href={msg.constraintsImageUrl}
                                download="constraints-diagram.png"
                                style={{
                                  fontSize: '12px',
                                  color: '#3B82F6',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                ⬇️ Download
                              </a>
                            </div>
                          </div>
                        )}
                        {/* Concept Plan */}
                        {msg.conceptPlanImageUrl && (
                          <div style={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid #E5E7EB',
                            backgroundColor: '#F9FAFB'
                          }}>
                            <img 
                              src={msg.conceptPlanImageUrl}
                              alt="Concept Plan"
                              style={{
                                width: '100%',
                                maxWidth: '600px',
                                height: 'auto',
                                display: 'block'
                              }}
                            />
                            <div style={{
                              padding: '8px 12px',
                              borderTop: '1px solid #E5E7EB',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#ffffff'
                            }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                🏗️ Concept Plan
                              </span>
                              <a
                                href={msg.conceptPlanImageUrl}
                                download="concept-plan.png"
                                style={{
                                  fontSize: '12px',
                                  color: '#3B82F6',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                ⬇️ Download
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Regular Concept Plan: Show single image */}
                    {msg.type !== 'feasibilityReport' && (msg.imageBase64 || msg.imageUrl) && (
                      <div style={{
                        marginBottom: '16px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#F9FAFB'
                      }}>
                        <img 
                          src={msg.imageBase64 ? `data:image/png;base64,${msg.imageBase64}` : msg.imageUrl || ''}
                          alt="Concept Plan"
                          style={{
                            width: '100%',
                            maxWidth: '600px',
                            height: 'auto',
                            display: 'block'
                          }}
                        />
                        <div style={{
                          padding: '8px 12px',
                          borderTop: '1px solid #E5E7EB',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#ffffff'
                        }}>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            🏗️ Concept Plan
                          </span>
                          <a
                            href={msg.imageBase64 ? `data:image/png;base64,${msg.imageBase64}` : msg.imageUrl || undefined}
                            download="concept-plan.png"
                            style={{
                              fontSize: '12px',
                              color: '#3B82F6',
                              textDecoration: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            ⬇️ Download
                          </a>
                        </div>
                      </div>
                    )}
                    {/* Text Content */}
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

        {/* Mode Indicator */}
        {chatMode === 'conceptPlan' && (
          <div style={{
            padding: '8px 24px',
            backgroundColor: '#EEF2FF',
            borderTop: '1px solid #C7D2FE',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '14px' }}>🏗️</span>
            <span style={{ fontSize: '13px', color: '#4338CA', fontWeight: '500' }}>
              Site Plan Mode
            </span>
            <span style={{ fontSize: '12px', color: '#6366F1' }}>
              — Describe what you want to build (e.g., &quot;fit 7 duplexes with parking&quot;)
            </span>
            <button
              onClick={() => setChatMode('normal')}
              style={{
                marginLeft: 'auto',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#6366F1',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Cancel
            </button>
          </div>
        )}
        {chatMode === 'feasibilityReport' && (
          <div style={{
            padding: '8px 24px',
            backgroundColor: '#FEF3C7',
            borderTop: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '14px' }}>📊</span>
            <span style={{ fontSize: '13px', color: '#92400E', fontWeight: '500' }}>
              Feasibility Report Mode
            </span>
            <span style={{ fontSize: '12px', color: '#B45309' }}>
              — Describe your development goals (e.g., &quot;50 unit multifamily&quot;)
            </span>
            <button
              onClick={() => setChatMode('normal')}
              style={{
                marginLeft: 'auto',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#B45309',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Input Area */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '900px'
          }}>
            <form 
              onSubmit={handleSendMessage}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {/* Plus Button with Dropdown */}
              <div style={{ position: 'relative' }} ref={toolMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowToolMenu(!showToolMenu)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginRight: '8px',
                    borderRadius: '50%',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Image 
                    src="/PlusIcon.png"
                    alt="Tools"
                    width={20}
                    height={20}
                  />
                </button>

                {/* Dropdown Menu */}
                {showToolMenu && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '0',
                    marginBottom: '8px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    padding: '8px',
                    minWidth: '160px',
                    zIndex: 100
                  }}>
                    <button
                      type="button"
                      onClick={() => handleToolSelect('feasibilityReport')}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#374151',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Image 
                        src="/ProFormaIcon.png"
                        alt="Feasibility Report"
                        width={20}
                        height={20}
                      />
                      <span>Feasibility Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolSelect('conceptPlan')}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#374151',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Image 
                        src="/SitePlanIcon.png"
                        alt="Site Plan"
                        width={20}
                        height={20}
                      />
                      <span>Site Plan</span>
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  chatMode === 'conceptPlan' 
                    ? "Describe your development (e.g., 7 duplexes with parking)" 
                    : chatMode === 'feasibilityReport'
                    ? "Describe development goals (e.g., 50 unit multifamily)"
                    : "Ask Anything"
                }
                style={{
                  flex: 1,
                  padding: '12px 48px 12px 16px',
                  backgroundColor: chatMode === 'conceptPlan' ? '#EEF2FF' : chatMode === 'feasibilityReport' ? '#FEF3C7' : '#F3F4F6',
                  border: chatMode === 'conceptPlan' ? '2px solid #818CF8' : chatMode === 'feasibilityReport' ? '2px solid #FCD34D' : 'none',
                  borderRadius: '24px',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#111827',
                  transition: 'all 0.2s'
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
      </div>

      {/* Right Sidebar - Chat History */}
      <div style={{
        width: '240px',
        borderLeft: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FAFAFA'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Chat History
          </span>
          <button
            onClick={startNewChat}
            style={{
              backgroundColor: '#3B82F6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
          >
            + New
          </button>
        </div>

        {/* Sessions List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px'
        }}>
          {loadingSessions ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: '12px'
            }}>
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: '12px'
            }}>
              No previous chats
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '4px',
                  backgroundColor: session.id === sessionId ? '#E5E7EB' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (session.id !== sessionId) {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (session.id !== sessionId) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {session.title}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#9CA3AF',
                  marginTop: '2px'
                }}>
                  {formatDate(session.updated_at)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

