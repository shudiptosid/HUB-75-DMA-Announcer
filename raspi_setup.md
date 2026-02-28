# 🍓 Raspberry Pi 3B+ Backend Setup

Complete guide to set up your Pi as the backend for the HUB75 LED Matrix system.

```
Your Pi will run:
  ✅ Mosquitto MQTT Broker (TCP:1883 + WebSocket:9001)
  ✅ TTS Announcement Server (Python + HTTP:8000)
```

---

## Step 1: Update the Pi

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Mosquitto MQTT Broker

```bash
sudo apt install -y mosquitto mosquitto-clients
```

### Configure Mosquitto

```bash
sudo nano /etc/mosquitto/conf.d/hub75.conf
```

Paste this:

```conf
# TCP listener for ESP32
listener 1883 0.0.0.0

# WebSocket listener for browser dashboard
listener 9001 0.0.0.0
protocol websockets

# Allow connections without auth (local network only)
# ⚠️ If exposing to internet, change this — see Step 5
allow_anonymous true
```

### Start & enable on boot

```bash
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

### Verify it's running

```bash
# Check both ports are listening
sudo ss -tlnp | grep mosquitto
# Should show :1883 and :9001

# Quick test (open 2 terminals)
# Terminal 1 - Subscribe:
mosquitto_sub -h localhost -t "test"

# Terminal 2 - Publish:
mosquitto_pub -h localhost -t "test" -m "hello from pi"
```

---

## Step 3: Install TTS Server

```bash
# Install Python dependencies
sudo apt install -y python3-pip python3-venv espeak

# Create project directory
mkdir -p ~/hub75-backend
cd ~/hub75-backend

# Copy your tts_server.py to the Pi (from your PC):
# scp d:\HUB75\HUB-75\tts_server.py pi@<PI_IP>:~/hub75-backend/

# Install Python packages
pip3 install paho-mqtt pyttsx3
```

### Test TTS server

```bash
cd ~/hub75-backend
python3 tts_server.py
```

You should see:
```
ESP32 HUB75 TTS Announcement Server
Local IP: 192.168.x.x
HTTP Server: http://192.168.x.x:8000
✓ Connected to MQTT broker at localhost:1883
```

### Run TTS as a system service (auto-start on boot)

```bash
sudo nano /etc/systemd/system/hub75-tts.service
```

Paste this (change `pi` to your username if different):

```ini
[Unit]
Description=HUB75 TTS Announcement Server
After=network.target mosquitto.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/hub75-backend
ExecStart=/usr/bin/python3 /home/pi/hub75-backend/tts_server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start hub75-tts
sudo systemctl enable hub75-tts

# Check status
sudo systemctl status hub75-tts
```

---

## Step 4: Configure ESP32 to Use the Pi

Edit `src/main.cpp` on your PC and set the Pi's local IP:

```cpp
const char *mqtt_server = "192.168.x.x"; // Your Pi's local IP
```

Find your Pi's IP with:
```bash
hostname -I
```

Then flash the firmware to the ESP32.

---

## Step 5: Expose Pi to the Internet (for Vercel Dashboard)

Your Vercel dashboard runs in the browser and needs to reach the Pi's MQTT WebSocket (port 9001). Choose **one** method:

### Option A: Cloudflare Tunnel (Recommended — free, no port forwarding)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Quick tunnel (gives you a temporary public URL)
cloudflared tunnel --url ws://localhost:9001
```

This prints a URL like `https://random-name.trycloudflare.com`. Use this in Vercel:
- Go to Vercel → your project → Settings → Environment Variables
- Set `VITE_MQTT_BROKER` = `wss://random-name.trycloudflare.com`
- Redeploy

> **Note:** The quick tunnel URL changes on every restart. For a permanent URL, set up a [named tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/) with a custom domain.

### Option B: Router Port Forwarding

1. Log into your router (usually `192.168.1.1`)
2. Forward **external port 9001** → Pi's local IP, port 9001
3. Find your public IP: `curl ifconfig.me`
4. In Vercel env vars, set `VITE_MQTT_BROKER` = `ws://YOUR_PUBLIC_IP:9001`

### Option C: Cloud MQTT Broker (e.g., HiveMQ Cloud)

1. Create a free account at [hivemq.com/mqtt-cloud-broker](https://www.hivemq.com/mqtt-cloud-broker/)
2. Get your broker URL, username, and password
3. Point both ESP32 and Vercel dashboard to the cloud broker
4. Requires code changes for authentication

---

## Step 6: Add Security (If Exposing to Internet)

### Enable MQTT password authentication

```bash
# Create a password file
sudo mosquitto_passwd -c /etc/mosquitto/passwd your_username

# Update config
sudo nano /etc/mosquitto/conf.d/hub75.conf
```

Change `allow_anonymous true` to:

```conf
allow_anonymous false
password_file /etc/mosquitto/passwd
```

```bash
sudo systemctl restart mosquitto
```

Then update `src/main.cpp` to use credentials:

```cpp
mqttClient.connect(mqtt_client_id, "your_username", "your_password")
```

And update `dashboard/src/App.jsx` MQTT connection options to include:

```js
const client = mqtt.connect(brokerUrl, {
  username: 'your_username',
  password: 'your_password',
  // ... other options
});
```

---

## Quick Health Check Commands

```bash
# Is Mosquitto running?
sudo systemctl status mosquitto

# Is TTS server running?
sudo systemctl status hub75-tts

# Check MQTT ports
sudo ss -tlnp | grep -E '1883|9001'

# Watch MQTT traffic live
mosquitto_sub -h localhost -t "display/#" -v

# Check TTS server logs
journalctl -u hub75-tts -f

# Check Pi resources
htop
```

---

## Architecture Summary

| Component         | Location           | Port  | Purpose                        |
|-------------------|--------------------|-------|--------------------------------|
| Mosquitto (TCP)   | Raspberry Pi       | 1883  | ESP32 ↔ Pi communication       |
| Mosquitto (WS)    | Raspberry Pi       | 9001  | Vercel dashboard ↔ Pi          |
| TTS Server        | Raspberry Pi       | 8000  | Generates audio for ESP32      |
| Dashboard         | Vercel (cloud)     | 443   | User controls the display      |
| ESP32             | Local network      | —     | Drives the HUB75 LED panel     |
