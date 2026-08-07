---
description: Sync the project's ECC skills and commands from the upstream ECC repo.
disable-model-invocation: true
---

# Auto Update

Re-sync this project's ECC surface (`.pi/skills/`, `.pi/prompts/`, `.pi/scripts/`) from the upstream ECC repository.

## Usage

```bash
# Preview what would change (git diff --stat on .pi/)
git fetch https://github.com/affaan-m/ECC.git && git diff --stat FETCH_HEAD -- .pi/

# Full resync of the ECC surface from the upstream repo
git pull https://github.com/affaan-m/ECC.git --allow-unrelated-histories --no-edit
# or, if this project's .pi/ was applied manually rather than via git:
#   rsync -a --delete /path/to/ecc/clone/skills/ .pi/skills/
#   rsync -a --delete /path/to/ecc/clone/commands/ .pi/prompts/
#   rsync -a --delete /path/to/ecc/clone/scripts/ .pi/scripts/
```

## What to Do

1. Pull the latest upstream ECC changes (or re-clone into a temp dir).
2. Re-apply the changed surfaces:
   - `skills/` → `.pi/skills/`
   - `commands/` → `.pi/prompts/`
   - `scripts/` → `.pi/scripts/`
3. Re-run the path adaptations documented in the apply notes:
   - `.claude/` artifact conventions → `.pi/`
   - `CLAUDE_PLUGIN_ROOT` script paths → project-relative `.pi/...` paths
   - Keep `.pi/scripts/package.json` (`"type": "commonjs"`) so ECC's CJS scripts run despite the root `"type": "module"`.
4. Verify: `node .pi/scripts/harness-audit.js skills --format text`

## Notes

- This project does not use the ECC plugin installer; the surface is applied manually, so `scripts/auto-update.js` (plugin-install machinery) does not apply here.
- Skills are updated in place — existing learned/evolved content under `~/.local/share/ecc-homunculus/` is never touched.
