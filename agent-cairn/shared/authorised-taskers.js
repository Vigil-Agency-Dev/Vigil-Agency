// Callsigns Cairn accepts directives from.
// First-word match, case-insensitive.
// Anyone not in this set gets a polite reroute.

export const AUTHORISED_TASKERS = new Set([
  'DIRECTOR',
  'COMMANDER',
  'MISSION-CONTROL',
  'MISSION_CONTROL',
  'MC',
  'MCP',
  'MERIDIAN',
  'CAIRN-INTEL-ANALYST',
  'CAIRN_INTEL_ANALYST',
  'INTEL-ANALYST',
]);

// Parses free-text or slash-command directive body.
// Accepts: "DIRECTIVE FROM COMMANDER: <task>", "/directive COMMANDER <task>",
// or bare "<task>" (defaults tasker to DIRECTOR on direct-message path).
export function parseDirective(rawContent) {
  const content = (rawContent || '').trim();

  // Slash-command form: /directive COMMANDER <task>
  const slashMatch = content.match(/^\/directive(?:@\S+)?\s+([A-Z0-9\-_]+)\s+([\s\S]+)$/i);
  if (slashMatch) {
    return {
      tasker: slashMatch[1].toUpperCase(),
      brief: slashMatch[2].trim(),
      form: 'slash',
    };
  }

  // Legacy / free-text form: "DIRECTIVE FROM <CALLSIGN>: <brief>"
  const prefixMatch = content.match(/^DIRECTIVE\s+FROM\s+([A-Z0-9\-_]+)\s*:?\s*([\s\S]*)$/i);
  if (prefixMatch) {
    return {
      tasker: prefixMatch[1].toUpperCase(),
      brief: prefixMatch[2].trim(),
      form: 'prefix',
    };
  }

  return { tasker: null, brief: content, form: 'bare' };
}

export function isAuthorised(tasker) {
  if (!tasker) return false;
  return AUTHORISED_TASKERS.has(tasker.toUpperCase());
}
