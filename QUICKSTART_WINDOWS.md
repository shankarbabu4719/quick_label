# SAM2 Tracker — Windows Quick Start
# Open PowerShell as Administrator and copy-paste each block

## 1. Install dependencies (PowerShell as Admin)
```powershell
winget install Python.Python.3.11
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Git.Git
```

## 2. Restart PowerShell, then install yarn
```powershell
npm install -g yarn
```

## 3. Clone project (PowerShell or Git Bash)
```powershell
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout windows
```

## 4. Python setup
```powershell
python -m venv venv
venv\Scripts\activate
pip install -e ".[demo]"
```

## 5. Frontend setup
```powershell
cd demo\frontend
yarn install
cd ..\..
```

## 6. Run
```powershell
powershell -ExecutionPolicy Bypass -File run-demo.ps1
```

## ✅ Browser opens automatically at http://localhost:7262
