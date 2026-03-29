#!/usr/bin/env python3
"""Fix server.mjs agents object in the overview endpoint — clean rebuild"""

path = "/home/vigil/vigil-api/server.mjs"
with open(path) as f:
    lines = f.readlines()

# Find the overview endpoint's agents: { section and replace it
# Strategy: find "agents: {" after the overview endpoint, collect until we find
# the next top-level key (like "stats:" or "latestIntel:"), then replace

in_agents = False
agents_start = None
agents_end = None
brace_depth = 0

for i, line in enumerate(lines):
    stripped = line.strip()

    if 'agents: {' in stripped and not in_agents and i > 500 and i < 560:
        in_agents = True
        agents_start = i
        brace_depth = 1
        continue

    if in_agents:
        brace_depth += stripped.count('{') - stripped.count('}')
        # Look for the closing of the agents object
        if brace_depth <= 0 or ('timestamp:' in stripped and 'new Date' in stripped):
            # Check if next meaningful line starts a new property
            agents_end = i
            break

if agents_start and agents_end:
    # Build clean agents section
    new_agents = """      agents: {
        clarion: {
          name: 'ClarionAgent',
          realm: 'AI',
          platform: 'Moltbook',
          status: gatewayStatus.active ? 'ACTIVE' : 'OFFLINE',
          gateway: gatewayStatus,
          lastHeartbeat: lastHBTime?.toISOString() || null,
        },
        missionControl: {
          name: 'Mission Control Analyst',
          realm: 'C2',
          platform: 'VPS (Claude API)',
          status: mcStatus ? 'ACTIVE' : 'UNKNOWN',
          lastAnalysis: mcStatus?.last_analysis || null,
          model: mcStatus?.model_used || null,
          priority: mcStatus?.priority || null,
        },
        axiom: {
          name: 'AXIOM',
          realm: 'Human',
          platform: 'X / Instagram / YouTube',
          status: 'ACTIVE',
          lastActivity: null,
        },
        bastion: {
          name: 'BASTION',
          realm: 'Cyber',
          platform: 'VPS / All Platforms',
          status: 'ACTIVE',
          lastActivity: null,
        },
      },
"""

    # Find where to end the replacement — skip any orphaned ], or timestamp lines
    end = agents_end
    while end < len(lines) and (lines[end].strip() in ['', '],', '},'] or 'timestamp:' in lines[end]):
        end += 1

    # Replace
    lines[agents_start:end] = [new_agents]

    with open(path, 'w') as f:
        f.writelines(lines)
    print(f"Fixed agents section: lines {agents_start}-{end} replaced")
else:
    print(f"Could not find agents section. Start: {agents_start}, End: {agents_end}")
