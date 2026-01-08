/**
 * Type definitions for the Meditation Agent
 *
 * These types are shared across all agent modules and with conversationStore.ts
 */

import type { MeditationType } from './knowledgeBase';
import type { ContentCategory, ContentGenerationParams } from './contentTypes';
import type { ContentDetectionResult } from './contentDetection';

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    emotionalState?: string;
    suggestedMeditation?: MeditationType;
    toolCalled?: string;
    teacherReferenced?: string;
  };
}

export interface ConversationContext {
  messages: ConversationMessage[];
  userPreferences: UserPreferences;
  sessionState: SessionState;
}

export interface UserPreferences {
  preferredTraditions?: string[];
  favoriteTeachers?: string[];
  meditationHistory?: string[];
  avoidTopics?: string[];
  preferredDuration?: number; // minutes
}

export interface SessionState {
  currentMood?: string;
  selectedMeditation?: MeditationType;
  isGeneratingScript?: boolean;
  lastMeditationScript?: string;
  conversationStarted: Date;
  messageCount: number;
  // Content type detection state
  awaitingDisambiguation?: boolean;
  lastDetectionResult?: ContentDetectionResult;
  selectedContentCategory?: ContentCategory;
  selectedContentSubType?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface AgentResponse {
  message: string;
  suggestedActions?: AgentAction[];
  emotionalState?: string;
  shouldGenerateMeditation?: boolean;
  meditationType?: MeditationType;
  meditationPrompt?: string;
  quote?: { quote: string; teacher: string };
  // When user pastes a ready-made meditation script, pass it directly without AI processing
  pastedScript?: string;
  // Content type detection results
  contentCategory?: ContentCategory;
  contentSubType?: string;
  contentGenerationParams?: ContentGenerationParams;
  // Disambiguation state
  awaitingDisambiguation?: boolean;
  disambiguationQuestion?: string;
}

// Discriminated union for type-safe action data
export type AgentAction =
  | { type: 'generate_meditation'; label: string; data: { meditationType: MeditationType } }
  | { type: 'show_options'; label: string; data?: undefined }
  | { type: 'play_audio'; label: string; data?: undefined }
  | { type: 'show_quote'; label: string; data?: undefined };

// ============================================================================
// CONTEXT EXTRACTION TYPES
// ============================================================================

export interface ExtractedUserContext {
  situation: string | null;
  settings: string[];
  timeContext: string | null;
  goals: string[];
  duration: string | null;
}
