# SAM2 Tracker — Ubuntu Quick Start
# Copy-paste each block one by one in Terminal

## 1. Install dependencies
```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg curl git build-essential
```

## 2. Install Node.js 20 + yarn
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g yarn
```

## 3. Clone project (SSH key required — add your key to GitLab first)
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout ubuntu
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
