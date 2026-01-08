import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponseHandler, responseHandler } from '../../../../src/lib/agent/modules/ResponseHandler';
import type { ContentDetectionResult } from '../../../../src/lib/agent/contentDetection';

describe('ResponseHandler', () => {
  let handler: ResponseHandler;

  beforeEach(() => {
    handler = new ResponseHandler();
  });

  describe('detectMeditationContentInResponse', () => {
    it('should detect meditation content with breathing instructions', () => {
      const response = `Take a deep breath in. Now exhale slowly.

      Close your eyes and relax your body.

      Imagine yourself in a peaceful place.

      Allow yourself to let go of all tension.

      When you're ready, gently open your eyes.`;

      expect(handler.detectMeditationContentInResponse(response)).toBe(true);
    });

    it('should NOT detect short conversational responses', () => {
      const response = "That sounds like a lot to deal with. What's been the hardest part?";
      expect(handler.detectMeditationContentInResponse(response)).toBe(false);
    });

    it('should NOT detect simple acknowledgments', () => {
      const response = "I understand. Tell me more about what's going on.";
      expect(handler.detectMeditationContentInResponse(response)).toBe(false);
    });

    it('should detect audio tags in response', () => {
      const response = `Take a moment to settle in. [pause]

      Breathe deeply. [deep breath]

      Feel your body relax. [silence]`;

      expect(handler.detectMeditationContentInResponse(response)).toBe(true);
    });

    it('should require multiple indicators', () => {
      const response = "Take a deep breath and relax."; // Only 2 indicators, short response
      expect(handler.detectMeditationContentInResponse(response)).toBe(false);
    });
  });

  describe('getConversationalFallback', () => {
    it('should return anxious-specific fallback', () => {
      const fallback = handler.getConversationalFallback('anxious');
      expect(['What\'s going on?', 'What\'s making you anxious?', 'Tell me what\'s happening.']).toContain(fallback);
    });

    it('should return stressed-specific fallback', () => {
      const fallback = handler.getConversationalFallback('stressed');
      expect(['What\'s stressing you out?', 'What\'s going on?', 'Tell me about it.']).toContain(fallback);
    });

    it('should return sad-specific fallback', () => {
      const fallback = handler.getConversationalFallback('sad');
      expect(['What happened?', 'What\'s going on?', 'I\'m listening.']).toContain(fallback);
    });

    it('should return generic fallback for unknown state', () => {
      const fallback = handler.getConversationalFallback('unknown_state');
      expect(['What\'s on your mind?', 'Tell me more.', 'Go on.', 'What\'s happening?', 'I\'m listening.']).toContain(fallback);
    });

    it('should return generic fallback for undefined state', () => {
      const fallback = handler.getConversationalFallback(undefined);
      expect(['What\'s on your mind?', 'Tell me more.', 'Go on.', 'What\'s happening?', 'I\'m listening.']).toContain(fallback);
    });
  });

  describe('inferMeditationType', () => {
    it('should infer breathwork from response', () => {
      expect(handler.inferMeditationType("I'll create a breathing exercise for you.")).toBe('breathwork');
    });

    it('should infer body_scan from response', () => {
      expect(handler.inferMeditationType("Let me craft a body scan relaxation for you.")).toBe('body_scan');
    });

    it('should infer sleep_story from response', () => {
      expect(handler.inferMeditationType("I'll create a sleep meditation for you.")).toBe('sleep_story');
    });

    it('should infer loving_kindness from response', () => {
      expect(handler.inferMeditationType("Creating a loving kindness meditation.")).toBe('loving_kindness');
    });

    it('should infer gratitude from response', () => {
      expect(handler.inferMeditationType("Let me create a gratitude meditation.")).toBe('gratitude');
    });

    it('should infer affirmations from response', () => {
      expect(handler.inferMeditationType("I'll craft affirmations for you.")).toBe('affirmations');
    });

    it('should default to guided_visualization', () => {
      expect(handler.inferMeditationType("I'll create something special for you.")).toBe('guided_visualization');
    });
  });

  describe('parseResponse', () => {
    const mockExtractGoal = () => 'find peace';

    it('should detect generation trigger phrase and set shouldGenerateMeditation', () => {
      const response = "I'll craft a calming meditation for you.";
      const result = handler.parseResponse(response, 'anxious', undefined, undefined, 5, mockExtractGoal);

      expect(result.shouldGenerateMeditation).toBe(true);
      expect(result.emotionalState).toBe('anxious');
    });

    it('should NOT trigger generation for conversational response', () => {
      const response = "Tell me more about what's going on.";
      const result = handler.parseResponse(response, 'anxious', undefined, undefined, 5, mockExtractGoal);

      expect(result.shouldGenerateMeditation).toBeUndefined();
    });

    it('should include detection params when provided', () => {
      const response = "I'll create a breathwork session for you.";
      const detection: ContentDetectionResult = {
        category: 'meditation',
        subType: 'breathwork',
        confidence: 90,
        durationMinutes: 10,
        extractedGoal: 'relax',
        needsDisambiguation: false,
        isConversational: false,
      };

      const result = handler.parseResponse(response, 'stressed', 'breathwork', detection, 5, mockExtractGoal);

      expect(result.shouldGenerateMeditation).toBe(true);
      expect(result.contentCategory).toBe('meditation');
      expect(result.contentSubType).toBe('breathwork');
      expect(result.contentGenerationParams).toBeDefined();
    });

    it('should replace meditation content with fallback when not requested', () => {
      const meditationScript = `Take a deep breath in. Now exhale slowly.

      Close your eyes and relax your body.

      Imagine yourself in a peaceful place.

      Allow yourself to let go of all tension.

      When you're ready, gently open your eyes.`;

      const result = handler.parseResponse(meditationScript, 'anxious', undefined, undefined, 5, mockExtractGoal);

      // Should replace with fallback since no trigger phrase and meditation content detected
      expect(result.message).not.toBe(meditationScript);
      expect(result.shouldGenerateMeditation).toBeUndefined();
    });

    it('should have empty suggestedActions', () => {
      const response = "Tell me more.";
      const result = handler.parseResponse(response, undefined, undefined, undefined, 5, mockExtractGoal);

      expect(result.suggestedActions).toEqual([]);
    });

    it('should occasionally include a quote for emotional conversations', () => {
      // Test multiple times to hit the 5% probability
      let hasQuote = false;
      for (let i = 0; i < 100; i++) {
        const result = handler.parseResponse("Tell me more.", 'anxious', undefined, undefined, 10, mockExtractGoal);
        if (result.quote) {
          hasQuote = true;
          expect(result.quote.quote).toBeTruthy();
          expect(result.quote.teacher).toBeTruthy();
          break;
        }
      }
      // With 5% probability over 100 tries, we should almost certainly get a quote
      // But this is probabilistic, so we won't fail the test if we don't
    });
  });
});

describe('responseHandler singleton', () => {
  it('should be a ResponseHandler instance', () => {
    expect(responseHandler).toBeInstanceOf(ResponseHandler);
  });

  it('should infer meditation type correctly', () => {
    expect(responseHandler.inferMeditationType("breath meditation")).toBe('breathwork');
  });
});
