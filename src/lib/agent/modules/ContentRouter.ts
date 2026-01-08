/**
 * Content Router Module
 *
 * Routes user requests to appropriate content generation based on detection results.
 * Handles explicit generation request detection and content category routing.
 */

import type { MeditationType } from '../knowledgeBase';
import type { ContentCategory, ContentGenerationParams } from '../contentTypes';
import type { ContentDetectionResult } from '../contentDetection';
import type { AgentResponse, SessionState } from '../types';
import { getContentCategory } from '../contentTypes';
import { debugLog } from '../utils';

// ============================================================================
// EXPLICIT REQUEST PATTERNS
// ============================================================================

const EXPLICIT_REQUEST_PATTERNS = [
  /(?:create|make|generate|give me|i need|i want|i'd like)\s+(?:a|an|me a)?\s*(?:meditation|affirmation|story|visualization|breathwork|body scan)/i,
  /(?:can you|could you|please|would you)\s+(?:create|make|generate|give me)\s+(?:a|an|me a)?\s*(?:meditation|affirmation|story)/i,
  /(?:let's|ready to)\s+(?:do|start|begin)\s+(?:a|the)?\s*meditation/i,
  /(?:help me|guide me through)\s+(?:a|an)?\s*(?:meditation|relaxation|visualization)/i,
];

// ============================================================================
// SUBTYPE TO MEDITATION TYPE MAPPING
// ============================================================================

const SUBTYPE_TO_MEDITATION: Record<string, MeditationType> = {
  'breathwork': 'breathwork',
  'body_scan': 'body_scan',
  'loving_kindness': 'loving_kindness',
  'sleep_story': 'sleep_story',
  'guided_visualization': 'guided_visualization',
  'walking_meditation': 'walking_meditation',
  'shadow_work': 'shadow_work',
  'gratitude': 'gratitude',
  'manifestation': 'manifestation',
  'presence': 'presence',
  'inquiry': 'inquiry',
  'surrender': 'surrender',
  // Affirmation types map to affirmations
  'power': 'affirmations',
  'guided': 'affirmations',
  'sleep': 'affirmations',
  'mirror_work': 'affirmations',
  // Journey and hypnosis types map to visualization
  'inner_journey': 'guided_visualization',
  'past_life': 'guided_visualization',
  'spirit_guide': 'guided_visualization',
  'shamanic': 'guided_visualization',
  'astral': 'guided_visualization',
  'akashic': 'guided_visualization',
  'quantum_field': 'guided_visualization',
  'light': 'guided_visualization',
  'standard': 'guided_visualization',
  'therapeutic': 'guided_visualization',
  // Story types map to sleep story
  'toddler': 'sleep_story',
  'young_child': 'sleep_story',
};

// ============================================================================
// CONTENT ROUTER CLASS
// ============================================================================

export class ContentRouter {
  /**
   * Check if user is explicitly asking for content generation
   */
  isExplicitGenerationRequest(message: string): boolean {
    const lowered = message.toLowerCase();
    return EXPLICIT_REQUEST_PATTERNS.some(pattern => pattern.test(lowered));
  }

  /**
   * Infer meditation type from content sub-type
   */
  inferMeditationTypeFromSubType(subType: string): MeditationType {
    return SUBTYPE_TO_MEDITATION[subType] || 'guided_visualization';
  }

  /**
   * Get human-readable meditation type name
   */
  getMeditationTypeName(type: MeditationType, meditationTypes: { id: string; name: string }[]): string {
    const typeInfo = meditationTypes.find(m => m.id === type);
    return typeInfo?.name.toLowerCase() || type.replace(/_/g, ' ');
  }

  /**
   * Route to appropriate content generation based on detection result
   */
  routeToContentGeneration(
    detection: ContentDetectionResult,
    emotionalState: string | undefined,
    sessionState: SessionState,
    extractGoalFromContext: () => string,
    meditationTypes: { id: string; name: string }[]
  ): AgentResponse {
    const categoryInfo = getContentCategory(detection.category);
    const categoryName = categoryInfo?.name || detection.category;

    // Map to meditation type for legacy compatibility
    const meditationType = detection.meditationType || this.inferMeditationTypeFromSubType(detection.subType);

    // Build generation parameters
    const generationParams: ContentGenerationParams = {
      category: detection.category,
      subType: detection.subType,
      meditationType: meditationType,
      hypnosisDepth: detection.depth,
      targetAgeGroup: detection.ageGroup,
      durationMinutes: detection.durationMinutes || categoryInfo?.defaultDuration.recommended || 10,
      goal: detection.extractedGoal || extractGoalFromContext(),
      emotionalState: emotionalState,
    };

    // Construct confirmation message based on category
    let confirmationMessage: string;
    switch (detection.category) {
      case 'affirmation':
        confirmationMessage = `I'll create ${detection.subType.replace(/_/g, ' ')} affirmations for you.`;
        break;
      case 'self_hypnosis':
        confirmationMessage = `I'll craft a ${detection.depth || 'standard'} self-hypnosis session for you.`;
        break;
      case 'guided_journey':
        confirmationMessage = `I'll guide you on a ${detection.subType.replace(/_/g, ' ')} journey.`;
        break;
      case 'story':
        const ageLabel = detection.ageGroup === 'toddler' ? '2-4 year old' : '5-8 year old';
        confirmationMessage = `I'll create a bedtime story perfect for a ${ageLabel}.`;
        break;
      default:
        confirmationMessage = `I'll create a ${this.getMeditationTypeName(meditationType, meditationTypes)} meditation for you.`;
    }

    debugLog('Routing to content generation', {
      category: detection.category,
      subType: detection.subType,
      meditationType,
      emotionalState,
    });

    return {
      message: confirmationMessage,
      shouldGenerateMeditation: true,
      meditationType: meditationType,
      contentCategory: detection.category,
      contentSubType: detection.subType,
      contentGenerationParams: generationParams,
      emotionalState: emotionalState,
    };
  }
}

// Export singleton instance
export const contentRouter = new ContentRouter();
