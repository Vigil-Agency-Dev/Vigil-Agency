#!/usr/bin/env python3
"""Fix server.mjs — clean insert BASTION agent into agents array"""
import re

path = "/home/vigil/vigil-api/server.mjs"
with open(path) as f:
    content = f.read()

# Remove any broken bastion insertions
lines = content.split('\n')
fixed = []
skip_until_close = False
for line in lines:
    if 'id: "bastion"' in line or "id: 'bastion'" in line:
        skip_until_close = True
        continue
    if skip_until_close:
        if line.strip().startswith('},') or line.strip() == '},':
            skip_until_close = False
            continue
        if 'timestamp:' in line and 'new Date' in line:
            skip_until_close = False
            continue
        continue
    # Remove duplicate ], and timestamp lines
    if line.strip() == '],' and fixed and fixed[-1].strip() == '],':
        continue
    if 'timestamp: new Date' in line and fixed and 'timestamp: new Date' in fixed[-1]:
        continue
    fixed.append(line)

content = '\n'.join(fixed)

# Find the AXIOM closing brace and insert BASTION before the array close
bastion_block = """        {
          id: 'bastion',
          name: 'BASTION',
          realm: 'Cyber',
          platform: 'VPS / All Platforms',
          status: 'ACTIVE',
          role: 'Cyber Security and Counter-Intelligence',
        },"""

# Look for the pattern: AXIOM entry closing }, followed by ],
pattern = r"(role: 'Human Realm agent.*?',\n\s*\},)\n(\s*\],)"
replacement = r"\1\n" + bastion_block + r"\n\2"
content = re.sub(pattern, replacement, content, count=1, flags=re.DOTALL)

with open(path, 'w') as f:
    f.write(content)

print("BASTION inserted successfully")
