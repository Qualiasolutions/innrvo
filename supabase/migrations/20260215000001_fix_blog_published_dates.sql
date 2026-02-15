-- Fix blog post published_at dates to match actual publish dates

UPDATE public.blog_posts
SET published_at = '2026-02-08T00:00:00Z'
WHERE slug = 'ai-personalized-meditation-why-generic-apps-fail'
  AND published_at != '2026-02-08T00:00:00Z';

UPDATE public.blog_posts
SET published_at = '2026-02-11T00:00:00Z'
WHERE slug = 'meditation-for-anxiety-ai-adapts'
  AND published_at != '2026-02-11T00:00:00Z';
