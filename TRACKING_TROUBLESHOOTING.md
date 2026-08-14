# SAM2 Video Tracking Troubleshooting Guide

## Issue: Tracking Stops in the Middle

### Symptoms:
- Click "Start Object Tracking"
- Progress bar moves for a while
- Then suddenly stops/freezes
- No error message shown

### Common Causes:

#### 1. **Memory Overflow (Most Common)**
**Cause:** MPS GPU runs out of memory
**Signs:** 
- Happens on longer videos (>30 seconds)
- Happens when tracking many objects (>3)
- System becomes slow/unresponsive

**Solution:**
```bash
# Stop the demo
pkill -f "app.py"

# Restart with reduced settings
# Edit run-demo.sh:
SAM2_MAX_FRAMES=150  # Reduce from 200
VIDEO_ENCODE_MAX_WIDTH=320  # Reduce from 480

# Or force CPU mode (slower but more stable):
SAM2_DEMO_FORCE_CPU_DEVICE=1
```

#### 2. **Backend Crash**
**Cause:** Python process crashed silently
**Check:**
```bash
ps aux | grep "app.py"
```
If no output → backend crashed

**Solution:**
```bash
# Check terminal logs for errors
# Look for: "Error", "Traceback", "Killed", "Segmentation fault"

# Restart demo:
./run-demo.sh
```

#### 3. **Browser Timeout**
**Cause:** Frontend lost connection to backend
**Signs:**
- Network tab shows "pending" requests
- Console shows connection errors

**Solution:**
- Refresh browser (F5)
- Check backend still running
- Restart demo if needed

#### 4. **Video Too Long**
**Cause:** Video has too many frames
**Check:** Original video duration

**Solution:**
- Trim video before importing
- Use "Crop Range" feature in demo
- Or increase timeout (not recommended)

### Monitoring Progress

#### Backend Logs (Terminal):
Look for these messages:
```
Starting forward propagation from frame X
Forward: processed 10 frames (current: XX)
Forward: processed 20 frames (current: XX)
Forward propagation complete: XX frames processed
Starting backward propagation from frame X
Backward: processed 10 frames (current: XX)
✅ Tracking complete for session XXX: XX total frames tracked
```

If logs stop suddenly → process crashed or hung

#### If Tracking Hangs:
1. **Wait 2-3 minutes** - might just be slow
2. **Check logs** - look for last frame number
3. **Check system monitor** - is Python using CPU/GPU?
   - Activity Monitor (Mac) → Python process
   - If 0% CPU → process stuck
   - If high CPU → still working (be patient)

### Quick Fixes:

#### Fix 1: Reduce Video Quality
```bash
# Before importing, convert video:
ffmpeg -i input.mp4 -vf scale=480:320 -r 8 -t 30 output.mp4
# Then import output.mp4
```

#### Fix 2: Force CPU Mode
Edit `run-demo.sh`:
```bash
env $EXTRA_ENV \
  SAM2_DEMO_FORCE_CPU_DEVICE=1 \
  ...
```
Slower but more stable.

#### Fix 3: Process Fewer Frames
Edit `run-demo.sh`:
```bash
SAM2_MAX_FRAMES=100  # Very conservative
VIDEO_ENCODE_FPS=6   # Lower FPS
```

#### Fix 4: Track Fewer Objects
- Don't select too many objects at once
- Complete tracking for 1-2 objects first
- Then add more objects in a new session

### Error Messages:

#### "RuntimeError: MPS backend out of memory"
**Solution:** Force CPU mode or reduce max frames

#### "Session not found"
**Solution:** Backend restarted, need to import video again

#### "Connection refused" / "Network error"
**Solution:** Backend crashed, restart with `./run-demo.sh`

### Best Practices:

1. **Start Small:**
   - Test with short videos (<10 seconds)
   - Track 1-2 objects first
   - Increase complexity gradually

2. **Monitor Performance:**
   - Watch terminal logs
   - Check Activity Monitor
   - Note which videos work well

3. **Prepare Videos:**
   - Trim to relevant section only
   - Lower resolution if possible (480p is enough)
   - Remove unnecessary beginning/end

4. **Save Progress:**
   - Use "Save Draft" after successful tracking
   - Export YOLO dataset when done
   - Don't rely on keeping session open

### Still Having Issues?

Check logs for specific errors:
```bash
cd /Users/pinklotusai/Documents/sam2_labelme/demo/backend/server
cat app.log  # or check terminal output
```

Common error patterns:
- `torch.*MPS.*memory` → Memory issue, reduce frames
- `SIGKILL` / `Killed` → System killed process (out of memory)
- `cuda` errors → Ignore, expected on Mac (no CUDA)
- `dtype mismatch` → Should be fixed, report if seen

### Performance Expectations:

| Video Length | Objects | Expected Time | Success Rate |
|--------------|---------|---------------|--------------|
| 5 sec | 1-2 | 20-30 sec | ✅ 99% |
| 10 sec | 1-2 | 40-60 sec | ✅ 95% |
| 20 sec | 1-2 | 1-2 min | ✅ 90% |
| 30 sec | 1-2 | 2-3 min | ⚠️ 80% |
| 30 sec | 3-5 | 3-5 min | ⚠️ 70% |
| >60 sec | any | - | ❌ Often fails |

**Recommendation:** Keep videos under 20 seconds for best reliability.
