# SAM2 Tracker — macOS Quick Start
# Copy-paste each block one by one in Terminal

## 1. Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## 2. Install dependencies
```bash
brew install python@3.11 node ffmpeg git
npm install -g yarn
```

## 3. Clone project
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout mac
```

## 4. Python setup
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"
```

## 5. Frontend setup
```bash
cd demo/frontend && yarn install && cd ../..
```

## 6. Run
```bash
chmod +x run-demo.sh
./run-demo.sh
```

## ✅ Open browser: http://localhost:7262
