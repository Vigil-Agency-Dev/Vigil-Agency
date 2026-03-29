#!/usr/bin/env python3
path = "/home/vigil/vigil-api/server.mjs"
with open(path) as f:
    lines = f.readlines()

# Find the broken block: from line with "role: 'Field operative" to before "GET /api/mission/threats"
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if "role: 'Field operative" in line and start_idx is None:
        start_idx = i + 1  # Start after this line
    if "GET /api/mission/threats" in line and start_idx is not None:
        end_idx = i - 3  # End before the comment block
        break

if start_idx and end_idx:
    replacement = """        },
        {
          id: 'mission-control',
          name: 'Mission Control Analyst',
          realm: 'C2',
          platform: 'VPS (Claude API)',
          status: mcStatus ? 'ACTIVE' : 'UNKNOWN',
          lastAnalysis: mcStatus?.last_analysis || null,
          model: mcStatus?.model_used || null,
          role: 'Strategic analysis — reads intel, writes strategy orders',
        },
        {
          id: 'meridian',
          name: 'MERIDIAN',
          realm: 'OSINT',
          platform: 'Cowork Scheduled Task',
          status: 'ACTIVE',
          role: 'OSINT analysis — geopolitics, institutional accountability, Epstein intel',
        },
        {
          id: 'sentinel',
          name: 'SENTINEL',
          realm: 'Sales',
          platform: 'ASI Portal',
          status: 'ACTIVE',
          role: 'AI sales consultant — pipeline, outreach, revenue tracking',
        },
        {
          id: 'axiom',
          name: 'AXIOM',
          realm: 'Human',
          platform: 'X / Instagram / YouTube',
          status: 'ACTIVE',
          role: 'Human Realm agent — truth content, consciousness elevation, revenue generation',
        },
        {
          id: 'bastion',
          name: 'BASTION',
          realm: 'Cyber',
          platform: 'VPS / All Platforms',
          status: 'ACTIVE',
          role: 'Cyber Security and Counter-Intelligence',
        },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

"""
    lines[start_idx:end_idx] = [replacement]

    with open(path, 'w') as f:
        f.writelines(lines)
    print(f"Replaced lines {start_idx}-{end_idx}")
else:
    print(f"Could not find block. Start: {start_idx}, End: {end_idx}")
