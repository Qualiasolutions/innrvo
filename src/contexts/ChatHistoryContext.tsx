/**
 * ChatHistoryContext
 *
 * Manages chat conversation history state for the sidebar.
 * Separate from LibraryContext which handles generated meditation audio.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { conversationStore, type ConversationSummary, type StoredConversation } from '../lib/agent/conversationStore';
import { useAuth } from './AuthContext';

interface ChatHistoryContextValue {
  // State
  chatHistory: ConversationSummary[];
  isLoadingChatHistory: boolean;
  selectedConversationId: string | null;

  // Actions
  refreshChatHistory: () => Promise<void>;
  loadConversation: (id: string) => Promise<StoredConversation | null>;
  deleteConversation: (id: string) => Promise<boolean>;
  startNewConversation: () => Promise<void>;
  setSelectedConversationId: (id: string | null) => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

interface ChatHistoryProviderProps {
  children: ReactNode;
}

export function ChatHistoryProvider({ children }: ChatHistoryProviderProps) {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<ConversationSummary[]>([]);
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Load chat history from database
  const refreshChatHistory = useCallback(async () => {
    if (!user) {
      setChatHistory([]);
      return;
    }

    setIsLoadingChatHistory(true);
    try {
      const history = await conversationStore.loadConversationHistory(20);
      setChatHistory(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setChatHistory([]);
    } finally {
      setIsLoadingChatHistory(false);
    }
  }, [user]);

  // Load a specific conversation for resumption
  const loadConversation = useCallback(async (id: string): Promise<StoredConversation | null> => {
    try {
      const conversation = await conversationStore.loadConversation(id);
      if (conversation) {
        setSelectedConversationId(id);
      }
      return conversation;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await conversationStore.deleteConversation(id);
      if (success) {
        setChatHistory(prev => prev.filter(c => c.id !== id));
        if (selectedConversationId === id) {
          setSelectedConversationId(null);
        }
      }
      return success;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }, [selectedConversationId]);

  // Start a new conversation (clears selection)
  const startNewConversation = useCallback(async () => {
    // Save current conversation first if it has messages
    const current = conversationStore.getCurrentConversation();
    if (current && current.messages.length > 0) {
      await conversationStore.saveConversationToDatabase(current);
    }

    await conversationStore.startNewConversation();
    setSelectedConversationId(null);

    // Refresh history to include the saved conversation
    await refreshChatHistory();
  }, [refreshChatHistory]);

  // Auto-refresh when user changes
  useEffect(() => {
    if (user) {
      refreshChatHistory();
    } else {
      setChatHistory([]);
      setSelectedConversationId(null);
    }
  }, [user, refreshChatHistory]);

  const value = useMemo<ChatHistoryContextValue>(() => ({
    chatHistory,
    isLoadingChatHistory,
    selectedConversationId,
    refreshChatHistory,
    loadConversation,
    deleteConversation,
    startNewConversation,
    setSelectedConversationId,
  }), [
    chatHistory,
    isLoadingChatHistory,
    selectedConversationId,
    refreshChatHistory,
    loadConversation,
    deleteConversation,
    startNewConversation,
  ]);

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error('useChatHistory must be used within ChatHistoryProvider');
  }
  return context;
}
