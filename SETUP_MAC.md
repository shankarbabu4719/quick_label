# SAM2 Tracker — macOS Setup
# SSH key already added to GitLab ✅
# Copy-paste each block in Terminal

---

## STEP 1 — Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## STEP 2 — Install dependencies
```bash
brew install python@3.11 node ffmpeg git
npm install -g yarn
```

---

## STEP 3 — Clone project
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout mac
```

---

## STEP 4 — Python setup
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"
```

---

## STEP 5 — Frontend setup
```bash
cd demo/frontend && yarn install && cd ../..
```

---

## STEP 6 — Run
```bash
chmod +x run-demo.sh
./run-demo.sh
```

---

## ✅ Browser opens automatically → http://localhost:7262
