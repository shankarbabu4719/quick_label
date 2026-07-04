# SAM2 Tracker — Windows Setup
# SSH key already added to GitLab ✅
# Open PowerShell as Administrator and copy-paste each block

---

## STEP 1 — Install dependencies
```powershell
winget install Python.Python.3.11
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Git.Git
```
> ⚠️ Restart PowerShell after this step

---

## STEP 2 — Install yarn
```powershell
npm install -g yarn
```

---

## STEP 3 — Clone project
```powershell
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout windows
```

---

## STEP 4 — Python setup
```powershell
python -m venv venv
venv\Scripts\activate
pip install -e ".[demo]"
```

---

## STEP 5 — Frontend setup
```powershell
cd demo\frontend
yarn install
cd ..\..
```

---

## STEP 6 — Run
```powershell
powershell -ExecutionPolicy Bypass -File run-demo.ps1
```

---

## ✅ Browser opens automatically → http://localhost:7262
