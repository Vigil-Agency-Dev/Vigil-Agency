import { mkdirSync, appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export function createLogger(agentName, logDir) {
  mkdirSync(logDir, { recursive: true });

  let sessionId = null;
  let sessionFile = null;
  let sessionEntries = [];

  return {
    startSession() {
      const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      sessionId = `session_${ts}_${agentName}`;
      sessionFile = join(logDir, `${sessionId}.jsonl`);
      sessionEntries = [];
      console.log(`[${agentName}] Session started: ${sessionId}`);
      return sessionId;
    },

    log({ direction, author, content, channel, tokenCount = 0, meta = null }) {
      if (!sessionId) this.startSession();

      const entry = {
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        channel,
        agent: agentName,
        direction,
        author,
        content,
        token_count: tokenCount,
      };
      if (meta) entry.meta = meta;

      sessionEntries.push(entry);
      appendFileSync(sessionFile, JSON.stringify(entry) + '\n', 'utf-8');
    },

    endSession() {
      if (!sessionId || sessionEntries.length === 0) return;

      const mdFile = join(logDir, `${sessionId}.md`);
      const lines = [
        `# CAIRN Session Transcript`,
        `**Agent:** ${agentName}`,
        `**Session ID:** ${sessionId}`,
        `**Messages:** ${sessionEntries.length}`,
        `**Started:** ${sessionEntries[0].timestamp}`,
        `**Ended:** ${sessionEntries[sessionEntries.length - 1].timestamp}`,
        '',
        '---',
        '',
      ];

      for (const entry of sessionEntries) {
        const time = entry.timestamp.slice(11, 19);
        lines.push(`### [${time}] ${entry.author}`);
        lines.push('');
        lines.push(entry.content);
        lines.push('');
        if (entry.token_count > 0) {
          lines.push(`*Tokens: ${entry.token_count}*`);
          lines.push('');
        }
        lines.push('---');
        lines.push('');
      }

      const totalInput = sessionEntries
        .filter((e) => e.direction === 'incoming')
        .reduce((sum, e) => sum + e.token_count, 0);
      const totalOutput = sessionEntries
        .filter((e) => e.direction === 'outgoing')
        .reduce((sum, e) => sum + e.token_count, 0);

      lines.push(`## Token Summary`);
      lines.push(`- Input tokens: ${totalInput}`);
      lines.push(`- Output tokens: ${totalOutput}`);
      lines.push(`- Total: ${totalInput + totalOutput}`);

      writeFileSync(mdFile, lines.join('\n'), 'utf-8');
      console.log(`[${agentName}] Session ended. Transcript: ${mdFile}`);

      const ended = sessionId;
      sessionId = null;
      sessionFile = null;
      sessionEntries = [];
      return ended;
    },

    getSessionId() {
      return sessionId;
    },
  };
}
