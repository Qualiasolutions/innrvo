import { describe, it, expect, beforeEach } from 'vitest';
import { ContextExtractor, contextExtractor } from '../../../../src/lib/agent/modules/ContextExtractor';

describe('ContextExtractor', () => {
  let extractor: ContextExtractor;

  beforeEach(() => {
    extractor = new ContextExtractor();
  });

  describe('Situation Extraction', () => {
    it('should extract interview situation', () => {
      const result = extractor.extract('i have a job interview tomorrow');
      expect(result.situation).toContain('interview');
    });

    it('should extract meeting situation', () => {
      const result = extractor.extract('before my big meeting');
      expect(result.situation).toContain('meeting');
    });

    it('should extract exam situation', () => {
      const result = extractor.extract('facing an exam next week');
      expect(result.situation).toContain('exam');
    });

    it('should extract dealing with stress', () => {
      const result = extractor.extract('dealing with work stress');
      expect(result.situation).toBeTruthy();
    });

    it('should extract breakup situation', () => {
      const result = extractor.extract('i just broke up with my partner');
      expect(result.situation).toBeTruthy();
    });

    it('should return null for no situation', () => {
      const result = extractor.extract('i want to meditate');
      expect(result.situation).toBeNull();
    });
  });

  describe('Setting Extraction', () => {
    it('should extract beach setting', () => {
      const result = extractor.extract('imagine me on a beach with waves');
      expect(result.settings).toContain('beach');
      expect(result.settings).toContain('waves');
    });

    it('should extract forest setting', () => {
      const result = extractor.extract('meditation in a forest with trees');
      expect(result.settings).toContain('forest');
      expect(result.settings).toContain('trees');
    });

    it('should extract mountain setting', () => {
      const result = extractor.extract('visualization on a mountain');
      expect(result.settings).toContain('mountain');
    });

    it('should extract multiple settings', () => {
      const result = extractor.extract('a garden by the ocean with stars');
      expect(result.settings).toContain('garden');
      expect(result.settings).toContain('ocean');
      expect(result.settings).toContain('stars');
    });

    it('should return empty array for no settings', () => {
      const result = extractor.extract('help me relax');
      expect(result.settings).toEqual([]);
    });
  });

  describe('Time Context Extraction', () => {
    it('should extract nighttime context', () => {
      const result = extractor.extract('going to bed soon');
      expect(result.timeContext).toBe('nighttime/sleep');
    });

    it('should extract morning context', () => {
      const result = extractor.extract('before work morning routine');
      expect(result.timeContext).toBe('morning/awakening');
    });

    it('should extract evening context', () => {
      const result = extractor.extract('after work wind down');
      expect(result.timeContext).toBe('evening/unwinding');
    });

    it('should extract quick session context', () => {
      const result = extractor.extract('a quick 5 minute meditation');
      expect(result.timeContext).toBe('quick session');
    });

    it('should extract extended session context', () => {
      const result = extractor.extract('a deep thorough session');
      expect(result.timeContext).toBe('extended session');
    });

    it('should return null for no time context', () => {
      const result = extractor.extract('meditation for anxiety');
      expect(result.timeContext).toBeNull();
    });
  });

  describe('Goal Extraction', () => {
    it('should extract calm goal', () => {
      const result = extractor.extract('i want to feel calm');
      expect(result.goals).toContain('calm');
    });

    it('should extract sleep goal', () => {
      const result = extractor.extract('help me sleep better');
      expect(result.goals).toContain('sleep');
    });

    it('should extract multiple goals', () => {
      const result = extractor.extract('i need peace and clarity and focus');
      expect(result.goals).toContain('peace');
      expect(result.goals).toContain('clarity');
      expect(result.goals).toContain('focus');
    });

    it('should extract healing goal', () => {
      const result = extractor.extract('healing meditation');
      expect(result.goals).toContain('healing');
    });

    it('should return empty array for no goals', () => {
      const result = extractor.extract('hello there');
      expect(result.goals).toEqual([]);
    });
  });

  describe('Duration Extraction', () => {
    it('should extract numeric duration', () => {
      const result = extractor.extract('10 minute meditation');
      expect(result.duration).toBe('10 minutes');
    });

    it('should extract short duration keyword', () => {
      const result = extractor.extract('a quick meditation');
      expect(result.duration).toBe('3-5 minutes');
    });

    it('should extract long duration keyword', () => {
      const result = extractor.extract('a long deep meditation');
      expect(result.duration).toBe('20-30 minutes');
    });

    it('should extract medium duration keyword', () => {
      const result = extractor.extract('a regular meditation');
      expect(result.duration).toBe('10-15 minutes');
    });

    it('should return null for no duration', () => {
      const result = extractor.extract('meditation for stress');
      expect(result.duration).toBeNull();
    });
  });

  describe('extractGoalFromMessages', () => {
    it('should extract goals from user messages', () => {
      const messages = [
        { role: 'user', content: 'I feel stressed' },
        { role: 'assistant', content: 'Tell me more' },
        { role: 'user', content: 'Work is overwhelming' },
      ];
      const result = extractor.extractGoalFromMessages(messages);
      expect(result).toContain('stressed');
      expect(result).toContain('overwhelming');
    });

    it('should only use last 3 user messages', () => {
      const messages = [
        { role: 'user', content: 'old message 1' },
        { role: 'user', content: 'old message 2' },
        { role: 'user', content: 'recent 1' },
        { role: 'user', content: 'recent 2' },
        { role: 'user', content: 'recent 3' },
      ];
      const result = extractor.extractGoalFromMessages(messages);
      expect(result).not.toContain('old message 1');
      expect(result).toContain('recent');
    });

    it('should truncate to 200 characters', () => {
      const messages = [
        { role: 'user', content: 'a'.repeat(300) },
      ];
      const result = extractor.extractGoalFromMessages(messages);
      expect(result.length).toBe(200);
    });
  });

  describe('parseDurationMinutes', () => {
    it('should parse minutes from duration string', () => {
      expect(extractor.parseDurationMinutes('10 minutes')).toBe(10);
    });

    it('should parse from range duration', () => {
      expect(extractor.parseDurationMinutes('3-5 minutes')).toBe(3);
    });

    it('should return null for null input', () => {
      expect(extractor.parseDurationMinutes(null)).toBeNull();
    });
  });
});

describe('contextExtractor singleton', () => {
  it('should be a ContextExtractor instance', () => {
    expect(contextExtractor).toBeInstanceOf(ContextExtractor);
  });

  it('should extract context correctly', () => {
    const result = contextExtractor.extract('beach meditation for calm');
    expect(result.settings).toContain('beach');
    expect(result.goals).toContain('calm');
  });
});
