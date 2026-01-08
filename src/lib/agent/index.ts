/**
 * Innrvo Meditation Agent
 *
 * A conversational AI assistant for personalized meditation experiences,
 * drawing from humanity's deepest wisdom traditions.
 *
 * @example
 * ```tsx
 * import { useMeditationAgent } from './src/hooks/useMeditationAgent';
 *
 * function ChatComponent() {
 *   const { messages, sendMessage, isLoading, greeting } = useMeditationAgent();
 *
 *   return (
 *     <div>
 *       <p>{greeting}</p>
 *       {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *       <input onSubmit={(e) => sendMessage(e.target.value)} />
 *     </div>
 *   );
 * }
 * ```
 */

// Core Agent
export { MeditationAgent } from './MeditationAgent';

// Types (from centralized types module)
export type {
  ConversationMessage,
  ConversationContext,
  UserPreferences,
  SessionState,
  AgentResponse,
  AgentAction,
  ExtractedUserContext,
} from './types';

// Utilities
export {
  getRandomGreeting,
  GREETING_MESSAGES,
  QUICK_PROMPTS,
  DEBUG,
  debugLog,
  debugWarn,
} from './utils';

// System Prompt (for Edge Functions)
export { SYSTEM_PROMPT, GENERATION_TRIGGER_PHRASES } from './systemPrompt';

// Knowledge Base
export {
  WISDOM_TEACHERS,
  MEDITATION_TYPES,
  CORE_PRINCIPLES,
  EMOTIONAL_STATES,
  getTeacher,
  getTeachersByTradition,
  getTeachersForMeditation,
  getRandomQuote,
  getQuotesByTheme,
  detectEmotionalState,
  getMeditationRecommendation,
  type WisdomTeacher,
  type WisdomTradition,
  type MeditationType,
  type MeditationTypeInfo,
  type EmotionalState,
} from './knowledgeBase';

// Content Types
export {
  type ContentCategory,
  type ContentGenerationParams,
  type AffirmationSubType,
  type HypnosisDepth,
  type JourneySubType,
  type StoryAgeGroup,
  CONTENT_CATEGORIES,
  getContentCategory,
} from './contentTypes';

// Content Detection
export {
  ContentDetector,
  contentDetector,
  type ContentDetectionResult,
} from './contentDetection';

// Agent Tools
export {
  generateMeditationScript,
  extendMeditationScript,
  synthesizeAudio,
  getUserMeditationHistory,
  saveMeditation,
  suggestMeditation,
  getWisdomQuote,
  getAvailableVoices,
  getCreditStatus,
  getTeacherInfo,
  getTeachersByTradition as getTeachersByTraditionTool,
  analyzeUserRequest,
  type ToolResult,
  type GeneratedMeditation,
  type SynthesizedAudio,
  type MeditationSuggestion,
} from './agentTools';

// Conversation Store
export {
  ConversationStore,
  conversationStore,
  type StoredConversation,
  type ConversationSummary,
} from './conversationStore';

// Modules (for advanced usage)
export { contextExtractor, ContextExtractor } from './modules/ContextExtractor';
export { contentRouter, ContentRouter } from './modules/ContentRouter';
export { responseHandler, ResponseHandler } from './modules/ResponseHandler';
export { promptBuilder, PromptBuilder } from './modules/PromptBuilder';
