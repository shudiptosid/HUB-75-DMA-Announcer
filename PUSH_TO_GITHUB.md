# 🚀 Push to GitHub

Quick guide to push this project to GitHub.

## Setup

```bash
# 1. Initialize git (if not already done)
git init

# 2. Add remote repository
git remote add origin https://github.com/shudiptosid/HUB-75-DMA-Announcer.git

# 3. Check current branch name
git branch

# 4. If not on main, rename branch
git branch -M main

# 5. Add all files
git add .

# 6. Commit
git commit -m "Complete HUB75 LED Matrix Display System with separated frontend, backend, and firmware"

# 7. Push to GitHub
git push -u origin main
```

## If Repository Already Exists

```bash
# Force push (if repo exists and you want to overwrite)
git push -f origin main
```

## Verify Upload

Visit: https://github.com/shudiptosid/HUB-75-DMA-Announcer

## Next Steps

After pushing:

1. Deploy frontend to Vercel
2. Copy backend to your Raspberry Pi
3. Flash firmware to ESP32

See main README.md for detailed instructions.
