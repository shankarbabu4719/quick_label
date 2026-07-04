# SAM2 Tracker — Ubuntu Setup
# SSH key already added to GitLab ✅
# Copy-paste each block in Terminal

---

## STEP 1 — Install dependencies
```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg curl git build-essential
```

---

## STEP 2 — Install Node.js 20 + yarn
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g yarn
```

---

## STEP 3 — Clone project
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout ubuntu
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

## ✅ Open browser → http://localhost:7262
