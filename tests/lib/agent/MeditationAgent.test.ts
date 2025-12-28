import { describe, it, expect, beforeEach } from 'vitest';
import { ContentDetector, contentDetector } from '../../../src/lib/agent/contentDetection';

describe('ContentDetector', () => {
  let detector: ContentDetector;

  beforeEach(() => {
    detector = new ContentDetector();
  });

  describe('Explicit Pattern Detection', () => {
    describe('Meditation Patterns', () => {
      it('should detect breathwork meditation', () => {
        const result = detector.detect('breathwork meditation for stress');
        expect(result.category).toBe('meditation');
        expect(result.subType).toBe('breathwork');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect body scan meditation', () => {
        const result = detector.detect('body scan meditation');
        expect(result.category).toBe('meditation');
        expect(result.subType).toBe('body_scan');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect loving-kindness meditation', () => {
        const result = detector.detect('loving-kindness meditation');
        expect(result.category).toBe('meditation');
        expect(result.subType).toBe('loving_kindness');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect metta meditation', () => {
        const result = detector.detect('metta meditation for compassion');
        expect(result.category).toBe('meditation');
        expect(result.subType).toBe('loving_kindness');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect guided visualization', () => {
        const result = detector.detect('guided visualization for healing');
        expect(result.category).toBe('meditation');
        expect(result.subType).toBe('guided_visualization');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect gratitude meditation', () => {
        const result = detector.detect('gratitude meditation');
        expect(result.category).toBe('meditation');
        expect(result.subType).toBe('gratitude');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });
    });

    describe('Self-Hypnosis Patterns', () => {
      it('should detect self-hypnosis request', () => {
        const result = detector.detect('self-hypnosis for confidence');
        expect(result.category).toBe('self_hypnosis');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect hypnotize me request', () => {
        const result = detector.detect('hypnotize me');
        expect(result.category).toBe('self_hypnosis');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect deep trance hypnosis', () => {
        const result = detector.detect('deep trance hypnosis');
        expect(result.category).toBe('self_hypnosis');
        expect(result.subType).toBe('therapeutic');
        expect(result.depth).toBe('therapeutic');
      });

      it('should detect therapeutic hypnosis', () => {
        const result = detector.detect('therapeutic hypnosis for anxiety');
        expect(result.category).toBe('self_hypnosis');
        expect(result.subType).toBe('therapeutic');
        expect(result.depth).toBe('therapeutic');
      });

      it('should detect light hypnosis', () => {
        const result = detector.detect('light relaxation hypnosis');
        expect(result.category).toBe('self_hypnosis');
        expect(result.subType).toBe('light');
        expect(result.depth).toBe('light');
      });
    });

    describe('Affirmation Patterns', () => {
      it('should detect power affirmations', () => {
        const result = detector.detect('power affirmations');
        expect(result.category).toBe('affirmation');
        expect(result.subType).toBe('power');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect I am affirmations', () => {
        const result = detector.detect('I am affirmations for confidence');
        expect(result.category).toBe('affirmation');
        expect(result.subType).toBe('power');
      });

      it('should detect sleep affirmations', () => {
        const result = detector.detect('sleep affirmations');
        expect(result.category).toBe('affirmation');
        expect(result.subType).toBe('sleep');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect mirror work affirmations', () => {
        const result = detector.detect('mirror work affirmations');
        expect(result.category).toBe('affirmation');
        expect(result.subType).toBe('mirror_work');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect guided affirmations', () => {
        const result = detector.detect('guided affirmations');
        expect(result.category).toBe('affirmation');
        expect(result.subType).toBe('guided');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });
    });

    describe('Guided Journey Patterns', () => {
      it('should detect past life regression', () => {
        const result = detector.detect('past life regression');
        expect(result.category).toBe('guided_journey');
        expect(result.subType).toBe('past_life');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect spirit guide meeting', () => {
        const result = detector.detect('meet my spirit guide');
        expect(result.category).toBe('guided_journey');
        expect(result.subType).toBe('spirit_guide');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect shamanic journey', () => {
        const result = detector.detect('shamanic journey');
        expect(result.category).toBe('guided_journey');
        expect(result.subType).toBe('shamanic');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect astral projection', () => {
        const result = detector.detect('astral projection');
        expect(result.category).toBe('guided_journey');
        expect(result.subType).toBe('astral');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });

      it('should detect akashic records', () => {
        const result = detector.detect('akashic records journey');
        expect(result.category).toBe('guided_journey');
        expect(result.subType).toBe('akashic');
        expect(result.confidence).toBeGreaterThanOrEqual(85);
      });
    });

    describe('Story Patterns', () => {
      it('should detect story for toddler', () => {
        const result = detector.detect('story for my 3-year-old');
        expect(result.category).toBe('story');
        expect(result.ageGroup).toBe('toddler');
        expect(result.audience).toBe('parent_to_child');
      });

      it('should detect bedtime story for child', () => {
        const result = detector.detect('bedtime story for my kid');
        expect(result.category).toBe('story');
        expect(result.subType).toBe('young_child');
        expect(result.audience).toBe('parent_to_child');
      });

      it('should detect children\'s story', () => {
        const result = detector.detect('children\'s bedtime story');
        expect(result.category).toBe('story');
        expect(result.audience).toBe('parent_to_child');
      });
    });
  });

  describe('Conversational Input Detection', () => {
    it('should have low confidence for greetings', () => {
      const result = detector.detect('hi');
      // Short inputs like "hi" may not match explicit patterns
      // The key is they don't have high confidence content detection
      expect(result.confidence).toBeLessThanOrEqual(50);
    });

    it('should recognize hello as low confidence', () => {
      const result = detector.detect('hello!');
      expect(result.confidence).toBeLessThanOrEqual(50);
    });

    it('should recognize how are you as low confidence', () => {
      const result = detector.detect('how are you?');
      expect(result.confidence).toBeLessThanOrEqual(50);
    });

    it('should recognize thanks as low confidence', () => {
      const result = detector.detect('thank you');
      expect(result.confidence).toBeLessThanOrEqual(50);
    });

    it('should recognize goodbye as low confidence', () => {
      const result = detector.detect('bye');
      expect(result.confidence).toBeLessThanOrEqual(50);
    });

    it('should have low confidence for good morning', () => {
      const result = detector.detect('good morning');
      // Greetings don't strongly indicate content type
      expect(result.confidence).toBeLessThanOrEqual(50);
    });
  });

  describe('Ambiguous Pattern Detection', () => {
    it('should detect "help me sleep" as ambiguous', () => {
      const result = detector.detect('help me sleep');
      expect(result.needsDisambiguation).toBe(true);
      expect(result.disambiguationQuestion).toBeDefined();
      expect(result.alternativeInterpretations).toBeDefined();
      expect(result.alternativeInterpretations!.length).toBeGreaterThan(0);
    });

    it('should detect "reprogram my beliefs" as ambiguous', () => {
      const result = detector.detect('reprogram my beliefs');
      expect(result.needsDisambiguation).toBe(true);
      expect(result.disambiguationQuestion).toBeDefined();
      expect(result.alternativeInterpretations!.some(a => a.category === 'affirmation')).toBe(true);
      expect(result.alternativeInterpretations!.some(a => a.category === 'self_hypnosis')).toBe(true);
    });

    it('should provide disambiguation options for story requests', () => {
      const result = detector.detect('story about dragons');
      // This matches the "story about/for" ambiguous pattern
      expect(result.needsDisambiguation).toBe(true);
    });
  });

  describe('Context Extraction', () => {
    it('should extract duration in minutes', () => {
      const result = detector.detect('10 minute meditation');
      expect(result.durationMinutes).toBe(10);
    });

    it('should extract duration in hours and convert to minutes', () => {
      const result = detector.detect('1 hour meditation');
      expect(result.durationMinutes).toBe(60);
    });

    it('should extract short duration', () => {
      const result = detector.detect('quick meditation');
      expect(result.durationMinutes).toBe(5);
    });

    it('should extract long duration', () => {
      const result = detector.detect('long extended meditation');
      expect(result.durationMinutes).toBe(30);
    });

    it('should extract age from year-old pattern', () => {
      const result = detector.detect('story for my 5-year-old');
      expect(result.ageGroup).toBe('young_child');
    });

    it('should detect toddler age group', () => {
      const result = detector.detect('story for my toddler');
      expect(result.ageGroup).toBe('toddler');
    });
  });

  describe('Semantic Detection', () => {
    it('should detect hypnosis keywords', () => {
      const result = detector.detect('help me enter a trance state with subconscious suggestions');
      expect(result.category).toBe('self_hypnosis');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect affirmation keywords', () => {
      const result = detector.detect('I want to feel confident and worthy');
      expect(result.category).toBe('affirmation');
    });

    it('should detect story keywords', () => {
      const result = detector.detect('magical adventure with a dragon for my kid');
      expect(result.category).toBe('story');
    });

    it('should detect journey keywords', () => {
      const result = detector.detect('explore my past life karma');
      expect(result.category).toBe('guided_journey');
    });
  });

  describe('Disambiguation Response Handling', () => {
    it('should handle numeric selection', () => {
      const previousResult = detector.detect('help me sleep');
      expect(previousResult.needsDisambiguation).toBe(true);

      const resolved = detector.handleDisambiguationResponse('1', previousResult);
      expect(resolved.needsDisambiguation).toBe(false);
      expect(resolved.confidence).toBe(95);
    });

    it('should handle category name mention', () => {
      const previousResult = detector.detect('help me sleep');
      expect(previousResult.needsDisambiguation).toBe(true);

      const resolved = detector.handleDisambiguationResponse('I want a meditation', previousResult);
      expect(resolved.category).toBe('meditation');
      expect(resolved.needsDisambiguation).toBe(false);
    });

    it('should re-detect if response is unclear', () => {
      const previousResult = detector.detect('help me sleep');
      const resolved = detector.handleDisambiguationResponse('I want a breathwork session', previousResult);
      // Should detect as meditation (breathwork matches explicit pattern)
      expect(resolved.category).toBe('meditation');
    });
  });

  describe('Confidence Levels', () => {
    it('should have highest confidence for explicit patterns', () => {
      const result = detector.detect('body scan meditation');
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it('should have moderate confidence for semantic detection', () => {
      const result = detector.detect('I need to relax my muscles and release tension');
      expect(result.confidence).toBeLessThan(85);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should have low/zero confidence for conversational input', () => {
      const result = detector.detect('hi there');
      expect(result.confidence).toBe(0);
    });

    it('should trigger disambiguation for low confidence', () => {
      const result = detector.detect('something about the mind');
      // Very vague input - should either have low confidence or need disambiguation
      expect(result.confidence < 60 || result.needsDisambiguation).toBe(true);
    });
  });
});

describe('contentDetector singleton', () => {
  it('should be a ContentDetector instance', () => {
    expect(contentDetector).toBeInstanceOf(ContentDetector);
  });

  it('should detect content correctly', () => {
    // "sleep meditation" matches explicit pattern
    const result = contentDetector.detect('sleep meditation');
    expect(result.category).toBe('meditation');
    expect(result.confidence).toBeGreaterThan(0);
  });
});
