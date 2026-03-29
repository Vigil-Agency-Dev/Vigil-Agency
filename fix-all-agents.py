#!/usr/bin/env python3
"""Fix ALL agent-related sections in server.mjs"""

path = "/home/vigil/vigil-api/server.mjs"
with open(path) as f:
    content = f.read()

# Strategy: find the GET /api/mission/agents endpoint and replace its entire response
# The endpoint starts with "app.get('/api/mission/agents'" and ends before the next app.get/app.post

import re

# Fix the agents endpoint response body
# Find: the agents array response that's broken
# It should be a clean array of agent objects inside res.json({agents: [...]})

old_agents_endpoint = re.search(
    r"(app\.get\('/api/mission/agents'.*?res\.json\(\{)\s*agents:\s*\[.*?(\}\);)\s*\} catch",
    content,
    re.DOTALL
)

if old_agents_endpoint:
    start = old_agents_endpoint.start(1)
    # Find the full endpoint from app.get to the closing });
    endpoint_match = re.search(
        r"(app\.get\('/api/mission/agents', authRequired.*?\{[^}]*try \{)(.*?)(res\.json.*?\}\);)\s*(\} catch \(err\) \{.*?\}\);)",
        content[start-100:start+2000],
        re.DOTALL
    )

# Simpler approach: just replace all the broken agent arrays with clean ones
# Find pattern: agents: [ ...broken content... ], timestamp
# in the agents endpoint section

# Remove all orphaned agent blocks between the agents endpoint and the next endpoint
lines = content.split('\n')
new_lines = []
skip_orphan = False
seen_agents_endpoint = False

for i, line in enumerate(lines):
    s = line.strip()

    # Track when we're in the agents GET endpoint
    if "app.get('/api/mission/agents'" in line:
        seen_agents_endpoint = True

    # If we see the next endpoint, stop cleaning
    if seen_agents_endpoint and ('app.get(' in line or 'app.post(' in line) and 'mission/agents' not in line:
        seen_agents_endpoint = False

    # Skip orphaned content in agents endpoint
    if seen_agents_endpoint:
        # Skip duplicate ], and timestamp lines that are out of place
        if s == '],':
            # Check if next non-empty line starts with { or timestamp
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines):
                next_s = lines[j].strip()
                if next_s.startswith('{') or next_s.startswith('timestamp:'):
                    # This is an orphaned array close — skip it and the timestamp
                    skip_orphan = True
                    continue

        if skip_orphan:
            if 'timestamp: new Date' in s:
                skip_orphan = False
                continue
            if s.startswith('{'):
                skip_orphan = False
                # Don't skip the opening brace of a real object

    new_lines.append(line)

content = '\n'.join(new_lines)

with open(path, 'w') as f:
    f.write(content)

print("Orphan cleanup done")
