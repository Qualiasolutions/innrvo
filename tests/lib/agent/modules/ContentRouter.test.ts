import { describe, it, expect, beforeEach } from 'vitest';
import { ContentRouter, contentRouter } from '../../../../src/lib/agent/modules/ContentRouter';
import type { ContentDetectionResult } from '../../../../src/lib/agent/contentDetection';
import type { SessionState } from '../../../../src/lib/agent/types';

describe('ContentRouter', () => {
  let router: ContentRouter;

  beforeEach(() => {
    router = new ContentRouter();
  });

  describe('isExplicitGenerationRequest', () => {
    it('should detect "create a meditation" as explicit', () => {
      expect(router.isExplicitGenerationRequest('create a meditation for me')).toBe(true);
    });

    it('should detect "give me an affirmation" as explicit', () => {
      expect(router.isExplicitGenerationRequest('give me an affirmation')).toBe(true);
    });

    it('should detect "generate a story" as explicit', () => {
      expect(router.isExplicitGenerationRequest('generate a story for my kid')).toBe(true);
    });

    it('should detect "i want a visualization" as explicit', () => {
      expect(router.isExplicitGenerationRequest('i want a visualization')).toBe(true);
    });

    it('should detect "can you create" as explicit', () => {
      expect(router.isExplicitGenerationRequest('can you create a breathwork session')).toBe(true);
    });

    it('should detect "let\'s do a meditation" as explicit', () => {
      expect(router.isExplicitGenerationRequest("let's do a meditation")).toBe(true);
    });

    it('should NOT detect casual mentions as explicit', () => {
      expect(router.isExplicitGenerationRequest("i'm feeling anxious")).toBe(false);
    });

    it('should NOT detect greetings as explicit', () => {
      expect(router.isExplicitGenerationRequest('hello')).toBe(false);
    });

    it('should NOT detect questions as explicit', () => {
      expect(router.isExplicitGenerationRequest('what is meditation?')).toBe(false);
    });
  });

  describe('inferMeditationTypeFromSubType', () => {
    it('should map breathwork to breathwork', () => {
      expect(router.inferMeditationTypeFromSubType('breathwork')).toBe('breathwork');
    });

    it('should map body_scan to body_scan', () => {
      expect(router.inferMeditationTypeFromSubType('body_scan')).toBe('body_scan');
    });

    it('should map power affirmation to affirmations', () => {
      expect(router.inferMeditationTypeFromSubType('power')).toBe('affirmations');
    });

    it('should map sleep affirmation to affirmations', () => {
      expect(router.inferMeditationTypeFromSubType('sleep')).toBe('affirmations');
    });

    it('should map past_life journey to guided_visualization', () => {
      expect(router.inferMeditationTypeFromSubType('past_life')).toBe('guided_visualization');
    });

    it('should map toddler story to sleep_story', () => {
      expect(router.inferMeditationTypeFromSubType('toddler')).toBe('sleep_story');
    });

    it('should default to guided_visualization for unknown', () => {
      expect(router.inferMeditationTypeFromSubType('unknown_type')).toBe('guided_visualization');
    });
  });

  describe('getMeditationTypeName', () => {
    const meditationTypes = [
      { id: 'breathwork', name: 'Breathwork' },
      { id: 'body_scan', name: 'Body Scan' },
      { id: 'guided_visualization', name: 'Guided Visualization' },
    ];

    it('should return lowercase name from meditation types', () => {
      expect(router.getMeditationTypeName('breathwork', meditationTypes)).toBe('breathwork');
    });

    it('should return formatted name for unknown type', () => {
      expect(router.getMeditationTypeName('some_type' as any, meditationTypes)).toBe('some type');
    });
  });

  describe('routeToContentGeneration', () => {
    const mockSessionState: SessionState = {
      conversationStarted: new Date(),
      messageCount: 5,
    };
    const mockMeditationTypes = [
      { id: 'breathwork', name: 'Breathwork' },
      { id: 'guided_visualization', name: 'Guided Visualization' },
    ];
    const mockExtractGoal = () => 'help me relax';

    it('should route meditation detection correctly', () => {
      const detection: ContentDetectionResult = {
        category: 'meditation',
        subType: 'breathwork',
        confidence: 90,
        needsDisambiguation: false,
        isConversational: false,
      };

      const result = router.routeToContentGeneration(
        detection,
        'anxious',
        mockSessionState,
        mockExtractGoal,
        mockMeditationTypes
      );

      expect(result.shouldGenerateMeditation).toBe(true);
      expect(result.meditationType).toBe('breathwork');
      expect(result.contentCategory).toBe('meditation');
      expect(result.message).toContain('meditation');
    });

    it('should route affirmation detection correctly', () => {
      const detection: ContentDetectionResult = {
        category: 'affirmation',
        subType: 'power',
        confidence: 90,
        needsDisambiguation: false,
        isConversational: false,
      };

      const result = router.routeToContentGeneration(
        detection,
        undefined,
        mockSessionState,
        mockExtractGoal,
        mockMeditationTypes
      );

      expect(result.shouldGenerateMeditation).toBe(true);
      expect(result.contentCategory).toBe('affirmation');
      expect(result.message).toContain('affirmations');
    });

    it('should route self-hypnosis detection correctly', () => {
      const detection: ContentDetectionResult = {
        category: 'self_hypnosis',
        subType: 'standard',
        depth: 'standard',
        confidence: 90,
        needsDisambiguation: false,
        isConversational: false,
      };

      const result = router.routeToContentGeneration(
        detection,
        undefined,
        mockSessionState,
        mockExtractGoal,
        mockMeditationTypes
      );

      expect(result.shouldGenerateMeditation).toBe(true);
      expect(result.contentCategory).toBe('self_hypnosis');
      expect(result.message).toContain('self-hypnosis');
    });

    it('should route guided journey detection correctly', () => {
      const detection: ContentDetectionResult = {
        category: 'guided_journey',
        subType: 'past_life',
        confidence: 90,
        needsDisambiguation: false,
        isConversational: false,
      };

      const result = router.routeToContentGeneration(
        detection,
        undefined,
        mockSessionState,
        mockExtractGoal,
        mockMeditationTypes
      );

      expect(result.shouldGenerateMeditation).toBe(true);
      expect(result.contentCategory).toBe('guided_journey');
      expect(result.message).toContain('journey');
    });

    it('should route story detection with age group', () => {
      const detection: ContentDetectionResult = {
        category: 'story',
        subType: 'toddler',
        ageGroup: 'toddler',
        confidence: 90,
        needsDisambiguation: false,
        isConversational: false,
      };

      const result = router.routeToContentGeneration(
        detection,
        undefined,
        mockSessionState,
        mockExtractGoal,
        mockMeditationTypes
      );

      expect(result.shouldGenerateMeditation).toBe(true);
      expect(result.contentCategory).toBe('story');
      expect(result.message).toContain('2-4 year old');
    });

    it('should include generation params in response', () => {
      const detection: ContentDetectionResult = {
        category: 'meditation',
        subType: 'breathwork',
        confidence: 90,
        durationMinutes: 15,
        extractedGoal: 'relax and destress',
        needsDisambiguation: false,
        isConversational: false,
      };

      const result = router.routeToContentGeneration(
        detection,
        'stressed',
        mockSessionState,
        mockExtractGoal,
        mockMeditationTypes
      );

      expect(result.contentGenerationParams).toBeDefined();
      expect(result.contentGenerationParams?.durationMinutes).toBe(15);
      expect(result.contentGenerationParams?.emotionalState).toBe('stressed');
      expect(result.contentGenerationParams?.goal).toBe('relax and destress');
    });
  });
});

describe('contentRouter singleton', () => {
  it('should be a ContentRouter instance', () => {
    expect(contentRouter).toBeInstanceOf(ContentRouter);
  });

  it('should detect explicit requests', () => {
    expect(contentRouter.isExplicitGenerationRequest('create a meditation')).toBe(true);
  });
});
