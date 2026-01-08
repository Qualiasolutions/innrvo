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
export {
  MeditationAgent,
  getRandomGreeting,
  GREETING_MESSAGES,
  QUICK_PROMPTS,
  type ConversationMessage,
  type ConversationContext,
  type UserPreferences,
  type SessionState,
  type AgentResponse,
  type AgentAction,
} from './MeditationAgent';

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
