# Auto-Save & Recovery Guide

## ఏమి Add చేశాను?

SAM2 video tracking ఇప్పుడు **automatically progress save చేస్తుంది**!

### Features:
- ✅ **Every 20 frames** auto-save
- ✅ **On crash** emergency save
- ✅ **On completion** final save
- ✅ **Recovery API** to restore lost work

## How It Works:

### During Tracking Terminal Shows:
```
Forward: processed 20 frames
💾 Auto-saved forward progress: 20 frames so far
Forward: processed 40 frames  
💾 Auto-saved forward progress: 40 frames so far
```

### If Tracking Stops/Crashes:
Your work is saved! Last 20 frames worth of data preserved.

## Recovery:

### Check Auto-Saves:
```bash
curl http://localhost:7263/list_autosaves
```

### Recover One:
```bash
curl -X POST http://localhost:7263/recover_autosave/FOLDER_NAME
```

### Manual Recovery:
```bash
cd demo/data/exports
ls -la | grep autosave
# Found: video_name_autosave_1734168000

# Convert to regular export:
mv video_name_autosave_1734168000 video_name_recovered
rm video_name_recovered/.autosave
```

Now appears in "Previous Projects"!

## Benefits:

1. **No Data Loss** - Even if crash, max 19 frames lost
2. **Peace of Mind** - Work saved automatically
3. **Easy Recovery** - Simple API to restore

---

**Test it:** Start tracking, stop midway (Ctrl+C), check `/list_autosaves` - your progress is saved! 🎉
