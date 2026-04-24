import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;

export function estimateCostUsd(inputTokens, outputTokens) {
  return (
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M
  );
}

export function logDirectiveCost(logPath, record) {
  mkdirSync(dirname(logPath), { recursive: true });
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...record,
  });
  appendFileSync(logPath, line + '\n', 'utf-8');
}

export function readDailySpend(logPath) {
  if (!existsSync(logPath)) {
    return { todayUsd: 0, totalUsd: 0, entries: 0 };
  }
  const today = new Date().toISOString().slice(0, 10);
  const content = readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  let todayUsd = 0;
  let totalUsd = 0;
  for (const line of lines) {
    try {
      const rec = JSON.parse(line);
      const recDate = (rec.ts || '').slice(0, 10);
      const cost = Number(rec.est_cost_usd || 0);
      totalUsd += cost;
      if (recDate === today) todayUsd += cost;
    } catch {
      // skip malformed lines
    }
  }
  return { todayUsd, totalUsd, entries: lines.length };
}
