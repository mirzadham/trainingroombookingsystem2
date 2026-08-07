---
name: projects
description: List known projects and their instinct statistics
command: true
---

# Projects Command

List project registry entries and per-project instinct/observation counts for continuous-learning-v2.

## Implementation

Run the instinct CLI (project-local skill):

```bash
python3 .pi/skills/continuous-learning-v2/scripts/instinct-cli.py projects
```

## Usage

```bash
/projects
```

## What to Do

1. Read `~/.local/share/ecc-homunculus/projects.json`
2. For each project, display:
   - Project name, id, root, remote
   - Personal and inherited instinct counts
   - Observation event count
   - Last seen timestamp
3. Also display global instinct totals
