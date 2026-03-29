#!/usr/bin/env python3
path = "/home/vigil/vigil-api/server.mjs"
with open(path) as f:
    content = f.read()

herald_block = """        {
          id: 'herald',
          name: 'HERALD',
          realm: 'Media/Distribution',
          platform: 'Cowork Scheduled Task',
          status: 'ACTIVE',
          role: 'Media vetting, package production, distribution pathway management',
        },"""

# Insert after BASTION's closing },
content = content.replace(
    "          role: 'Cyber Security and Counter-Intelligence',\n        },",
    "          role: 'Cyber Security and Counter-Intelligence',\n        },\n" + herald_block,
    1
)

with open(path, 'w') as f:
    f.write(content)
print("HERALD registered")
