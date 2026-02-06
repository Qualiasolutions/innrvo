import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

function setMetaTag(property: string, content: string, isOg = false) {
  const attr = isOg ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageMeta({ title, description, ogTitle, ogDescription, ogImage }: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | Innrvo`;

    setMetaTag('description', description);
    setMetaTag('og:title', ogTitle || title, true);
    setMetaTag('og:description', ogDescription || description, true);
    setMetaTag('og:type', 'website', true);
    if (ogImage) {
      setMetaTag('og:image', ogImage, true);
    }
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', ogTitle || title);
    setMetaTag('twitter:description', ogDescription || description);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, ogTitle, ogDescription, ogImage]);
}
