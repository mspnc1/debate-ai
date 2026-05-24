const CITATION_SECTION_PATTERN = /^(sources?|references?|citations?|works cited|bibliography)\s*:?\s*$/i;

function stripMarkdownLinks(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\((?:[^)]+)\)/g, '$1');
}

function stripMarkdownSyntax(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '');
}

function stripCitationMarkers(text: string): string {
  return text
    .replace(/\[\s*(?:source\s*)?\d+(?:\s*[-,]\s*\d+)*\s*]/gi, '')
    .replace(/\(\s*(?:source\s*)?\d+(?:\s*[-,]\s*\d+)*\s*\)/gi, '')
    .replace(/\s+(?:source|sources|citation|citations)\s+\d+(?:\s*(?:and|,)\s*\d+)*/gi, '');
}

function stripUrls(text: string): string {
  return text.replace(/\bhttps?:\/\/\S+/gi, '').replace(/\bwww\.\S+/gi, '');
}

function removeCitationSections(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  let inCitationSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (CITATION_SECTION_PATTERN.test(trimmed)) {
      inCitationSection = true;
      continue;
    }

    if (inCitationSection) {
      if (!trimmed) {
        continue;
      }
      if (/^(?:[-*]|\d+[.)]|\[\d+])\s+/.test(trimmed) || /\bhttps?:\/\/\S+/i.test(trimmed)) {
        continue;
      }
      inCitationSection = false;
    }

    if (/^\s*\[\d+]\s+/.test(line) || /^\s*\d+[.)]\s+https?:\/\//i.test(line)) {
      continue;
    }

    kept.push(line);
  }

  return kept.join('\n');
}

export function sanitizeDebateSpeechForTTS(content: string): string {
  if (!content.trim()) return '';

  const withoutCitationSections = removeCitationSections(content);
  const withoutLinks = stripMarkdownLinks(withoutCitationSections);
  const withoutMarkdown = stripMarkdownSyntax(withoutLinks);
  const withoutCitations = stripCitationMarkers(withoutMarkdown);
  const withoutUrls = stripUrls(withoutCitations);

  return withoutUrls
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, 'and')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
