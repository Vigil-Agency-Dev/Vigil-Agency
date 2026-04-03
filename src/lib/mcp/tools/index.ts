import { missionTools } from './mission';
import { intelTools } from './intel';
import { strategyTools } from './strategy';
import { threatTools } from './threats';
import { hypothesisTools } from './hypotheses';
import { patternTools } from './patterns';
import { allyTools } from './allies';
import { reportTools } from './reports';
import { dashboardTools } from './dashboard';
import { deadDropTools } from './deaddrop';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export const ALL_TOOLS: MCPTool[] = [
  ...missionTools,
  ...intelTools,
  ...strategyTools,
  ...threatTools,
  ...hypothesisTools,
  ...patternTools,
  ...allyTools,
  ...reportTools,
  ...dashboardTools,
  ...deadDropTools,
];

export function getToolList() {
  return ALL_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
}

export function findTool(name: string): MCPTool | undefined {
  return ALL_TOOLS.find(t => t.name === name);
}
