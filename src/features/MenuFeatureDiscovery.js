import {
  DEFAULT_VIDEO,
  FAILED_VIRAL_FRAME_MATCH,
  PARTNER_LINK_MATCH,
  SOCIALS,
} from './MenuFeatureContent.js';

export function findReplayButton(document) {
  const candidates = Array.from(
    document.querySelectorAll?.('button, a, [role="button"], .replays, .replay') || [],
  );

  return candidates.find((node) => {
    const label = [
      node.textContent,
      node.className,
      node.getAttribute?.('aria-label'),
      node.getAttribute?.('title'),
      node.getAttribute?.('href'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return label.includes('replay');
  });
}

export function getFeaturedVideo(document) {
  const iframe = document.getElementById?.('youtube-iframe') || document.querySelector?.('iframe[src]');
  const iframeUrl = iframe?.getAttribute?.('src') || '';
  const iframeId = getYoutubeId(iframeUrl);

  if (iframeId) {
    return {
      title: getFeaturedTitle(document),
      url: `https://www.youtube.com/watch?v=${iframeId}`,
      thumbnail: getYoutubeThumbnail(iframeUrl),
    };
  }

  const links = Array.from(document.querySelectorAll?.('a[href]') || []);
  const youtubeLink = links.find((link) => /youtube\.com|youtu\.be/i.test(link.getAttribute('href') || ''));
  const url = youtubeLink?.getAttribute('href') || DEFAULT_VIDEO.url;
  const title = youtubeLink?.textContent?.trim() || DEFAULT_VIDEO.title;

  return {
    title,
    url,
    thumbnail: getYoutubeThumbnail(url),
  };
}

export function getYoutubeThumbnail(url) {
  const id = getYoutubeId(url) || 'GOlXDLWeGMo';
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function getYoutubeId(url) {
  return (
    url.match(/[?&]v=([^&]+)/)?.[1] ||
    url.match(/youtu\.be\/([^?&]+)/)?.[1] ||
    url.match(/embed\/([^?&]+)/)?.[1] ||
    ''
  );
}

export function getFeaturedTitle(document) {
  const title = document.getElementById?.('youtube-title')?.textContent || '';
  const cleanTitle = title.replace(/^Featured\s+Video:\s*/i, '').replace(/\s+/g, ' ').trim();
  return cleanTitle || DEFAULT_VIDEO.title;
}

export function getSocialLinks(document) {
  const links = Array.from(document.querySelectorAll?.('.social a[href], a[href]') || []);

  return SOCIALS.map((social) => {
    const match = links.find((link) => social.match.test(link.getAttribute('href') || ''));
    return {
      ...social,
      href: match?.getAttribute('href') || social.fallbackHref,
    };
  });
}

export function getOriginalPolicyLinks(document, isInsideOwnUi) {
  const links = Array.from(document.querySelectorAll?.('a[href]') || []);
  return links.filter((link) => {
    if (isInsideOwnUi(link)) {
      return false;
    }

    const href = link.getAttribute('href') || '';
    if (!href || href === '#' || href.endsWith('/#') || isInsideConsentManager(link)) {
      return false;
    }

    const text = `${link.textContent || ''} ${link.getAttribute('href') || ''}`;
    return /policy|privacy|terms|conditions|cookie|gdpr/i.test(text);
  });
}

export function getPolicyPanelLinks(document, isInsideOwnUi) {
  const seen = new Set();
  const links = [];

  for (const link of [
    ...getOriginalPolicyLinks(document, isInsideOwnUi),
    ...getOriginalPartnerLinks(document, isInsideOwnUi),
  ]) {
    const key = `${link.getAttribute('href') || ''}::${link.textContent || ''}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    links.push(link);
  }

  return links;
}

export function getOriginalPartnerLinks(document, isInsideOwnUi) {
  return getPartnerLinkContainers(document, isInsideOwnUi).flatMap((container) => {
    const links = Array.from(container.querySelectorAll?.('a[href]') || []);
    return links.filter((link) => PARTNER_LINK_MATCH.test(link.getAttribute('href') || ''));
  });
}

export function getPartnerLinkContainers(document, isInsideOwnUi) {
  const containers = new Set();

  for (const link of document.querySelectorAll?.('a[href]') || []) {
    if (isInsideOwnUi(link)) {
      continue;
    }

    if (PARTNER_LINK_MATCH.test(link.getAttribute('href') || '') && link.parentElement) {
      containers.add(link.parentElement);
    }
  }

  return [...containers].filter((container) => {
    if (isInsideOwnUi(container)) {
      return false;
    }

    const directPartnerLinks = Array.from(container.querySelectorAll?.('a[href]') || [])
      .filter((link) => link.parentElement === container && PARTNER_LINK_MATCH.test(link.getAttribute('href') || ''));

    return directPartnerLinks.length >= 2;
  });
}

export function getOtherProjectContainers(document, isInsideOwnUi) {
  const containers = Array.from(document.querySelectorAll?.('.partner') || []);
  return containers.filter((container) => {
    if (isInsideOwnUi(container)) {
      return false;
    }

    return /our\s+other\s+projects/i.test(container.textContent || '') && getOtherProjectLinksFrom(container).length > 0;
  });
}

export function getOtherProjectLinks(document, isInsideOwnUi) {
  return getOtherProjectContainers(document, isInsideOwnUi).flatMap((container) => getOtherProjectLinksFrom(container));
}

export function getOtherProjectLinksFrom(container) {
  const links = Array.from(container.querySelectorAll?.('a') || []);
  return links.filter((link) => {
    const className = link.className?.toString?.() || '';
    const image = link.style?.backgroundImage || link.getAttribute('style') || '';
    return className.includes('mus-conv') || image.includes('background-image');
  });
}

export function extractBackgroundImage(styleText) {
  return styleText.match(/background-image:\s*([^;]+)/i)?.[1]?.trim() || '';
}

export function getFailedViralFrames(document) {
  const frames = Array.from(document.querySelectorAll?.('iframe') || []);
  return frames.filter((frame) => FAILED_VIRAL_FRAME_MATCH.test(frame.getAttribute('src') || frame.src || ''));
}

export function isInsideConsentManager(node) {
  let current = node;

  while (current) {
    const className = current.className?.toString?.() || '';
    if (className.split(/\s+/).some((name) => name === 'fc' || name.startsWith('fc-') || name.includes('-fc-'))) {
      return true;
    }

    if (/^fc-|cookieWarning-/i.test(className)) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}
