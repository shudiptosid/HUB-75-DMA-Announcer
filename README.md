# 🌈 HUB75 LED Matrix Display System

[![GitHub](https://img.shields.io/badge/GitHub-shudiptosid%2FHUB--75--DMA--Announcer-blue?style=flat&logo=github)](https://github.com/shudiptosid/HUB-75-DMA-Announcer)
[![ESP32](https://img.shields.io/badge/ESP32--S3-Supported-green?style=flat&logo=espressif)](https://www.espressif.com/en/products/socs/esp32-s3)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)](LICENSE)

A complete IoT solution for controlling HUB75 RGB LED Matrix displays with MQTT, featuring a modern web dashboard, voice announcements, and real-time control.

**🔗 Repository**: https://github.com/shudiptosid/HUB-75-DMA-Announcer

---

## 📺 Display Layout

```
┌────────────────────────────────────────────────────────────────┐
│  📝 SCROLLING MESSAGE (Custom text, adjustable speed)          │
├────────────────────────────────────────────────────────────────┤
│  🕐 TIME & DATE (NTP synchronized, auto-updating)              │
├────────────────────────────────────────────────────────────────┤
│  🌤️ WEATHER (Real-time temperature & conditions)               │
└────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

- 🎨 **Modern Web Dashboard** - Control display from anywhere via web browser
- 🌙 **Dark Mode** - Eye-friendly interface with theme toggle
- 🎚️ **Brightness Control** - Smooth 0-255 adjustment with quick presets
- 📜 **Scrolling Messages** - Custom text with adjustable animation speed
- 🔊 **Voice Announcements** - Text-to-speech with I2S audio output
- 🕐 **Smart Clock** - NTP-synchronized time display with seconds
- 🌤️ **Live Weather** - Real-time updates from Open-Meteo API (free, no key needed)
- 🎨 **Color Customization** - Independent RGB control for each display section
- 📡 **MQTT Protocol** - Reliable real-time communication
- 🔄 **Auto-Reconnect** - Robust WiFi and MQTT recovery
- 📱 **Mobile Responsive** - Works on desktop, tablet, and mobile

---

## 🛠️ Hardware Requirements

### Required Components
- **ESP32-S3 Mini** (or any ESP32 board with enough GPIO)
- **HUB75 64x32 RGB LED Matrix Panel**
- **Raspberry Pi 3B+** (or any Linux server, even Pi Zero 2W works)
- **5V Power Supply** (2-3A for LED panel, 5V for ESP32)
- **Jumper wires** for connections

### Optional (for Voice Announcements)
- **MAX98357A I2S Audio Amplifier**
- **Speaker** (4Ω-8Ω, 3W recommended)

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Deploy Frontend to Vercel (2 minutes)

```bash
cd frontend
npm install
npm run build
```

**Then deploy**:
1. Push to GitHub: https://github.com/shudiptosid/HUB-75-DMA-Announcer
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Set root directory to `frontend`
4. Click Deploy

**Your dashboard will be live at**: `https://your-project.vercel.app`

### Step 2: Setup Raspberry Pi Backend (3 minutes)

```bash
# Copy backend folder to your Pi
scp -r backend/ pi@raspberrypi.local:~/hub75-backend

# SSH into Pi
ssh pi@raspberrypi.local
cd ~/hub75-backend

# Run auto-installer
chmod +x setup.sh
./setup.sh

# Start TTS server (or setup auto-start)
python3 tts_server.py
```

**Get your Pi's IP**: Run `hostname -I` on Pi (e.g., `192.168.1.4`)

### Step 3: Flash ESP32 Firmware (2 minutes)

1. **Edit** `firmware/src/main.cpp`:
```cpp
// Update these lines
const char *ssid = "YOUR_WIFI_NAME";
const char *password = "YOUR_WIFI_PASSWORD";
const char *mqtt_server = "192.168.1.4";  // Your Pi's IP from Step 2
```

2. **Upload firmware**:
```bash
cd firmware
pio run --target upload
pio device monitor  # View serial output
```

### Step 4: Connect Dashboard

1. Open your Vercel dashboard URL
2. Go to "Connection" section
3. Enter: `ws://YOUR_PI_IP:9001` (e.g., `ws://192.168.1.4:9001`)
4. Click "Reconnect"
5. ✅ Status should show "Connected"

**Done!** Send a test message from the dashboard.

---

## 📂 Project Structure

```
HUB-75/
├── frontend/          # React Dashboard (Vercel)
│   ├── src/
│   │   ├── App.jsx           # Main dashboard component
│   │   ├── main.jsx          # React entry point
│   │   └── styles.css        # Styling
│   ├── package.json          # Dependencies
│   ├── vite.config.js        # Build config
│   └── vercel.json           # Vercel deployment config
│
├── backend/           # Raspberry Pi Services
│   ├── tts_server.py         # TTS + HTTP server (Pi-optimized)
│   ├── mosquitto.conf        # MQTT broker config
│   ├── requirements.txt      # Python dependencies
│   ├── setup.sh              # Auto-install script
│   └── hub75-tts.service     # Systemd service file
│
└── firmware/          # ESP32 Code
    ├── src/main.cpp          # ESP32 firmware
    ├── platformio.ini        # Build config
    └── lib/                  # Libraries
```

---

## 🔌 Pin Configuration

### HUB75 Display Pins (ESP32 ↔ LED Matrix)

| HUB75 Pin | ESP32 GPIO | Function |
|-----------|------------|----------|
| R1 | GPIO 2 | Red (upper half) |
| G1 | GPIO 3 | Green (upper half) |
| B1 | GPIO 4 | Blue (upper half) |
| R2 | GPIO 5 | Red (lower half) |
| G2 | GPIO 6 | Green (lower half) |
| B2 | GPIO 7 | Blue (lower half) |
| A | GPIO 16 | Row select A |
| B | GPIO 17 | Row select B |
| C | GPIO 18 | Row select C |
| D | GPIO 8 | Row select D |
| E | GPIO 15 | Row select E |
| CLK | GPIO 9 | Clock signal |
| LAT | GPIO 10 | Latch |
| OE | GPIO 11 | Output Enable |
| GND | GND | Ground |
| VCC | 5V (external) | Power (2-3A) |

### MAX98357A Audio Pins (Optional)

| MAX98357A | ESP32 GPIO | Function |
|-----------|------------|----------|
| DIN | GPIO 40 | I2S Data |
| BCLK | GPIO 42 | I2S Bit Clock |
| LRC | GPIO 41 | I2S Word Select |
| SD | GPIO 21 | Shutdown (HIGH=on) |
| VIN | 5V | Power |
| GND | GND | Ground |

**Speaker**: Connect 4Ω-8Ω speaker to MAX98357A output terminals (+/-)

---

## ⚙️ Detailed Configuration

### Frontend Configuration

**Environment Variables** (optional, create `frontend/.env.local`):
```bash
VITE_MQTT_BROKER=ws://192.168.1.4:9001
VITE_DEFAULT_CITY=YourCity
VITE_DEFAULT_LATITUDE=31.375
VITE_DEFAULT_LONGITUDE=75.625
```

**Vercel Deployment**:
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite

### Backend Configuration

**Auto-start on Boot** (recommended):
```bash
# Edit service file
nano ~/hub75-backend/hub75-tts.service

# Update paths:
WorkingDirectory=/home/pi/hub75-backend
ExecStart=/usr/bin/python3 /home/pi/hub75-backend/tts_server.py

# Install service
sudo cp ~/hub75-backend/hub75-tts.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hub75-tts
sudo systemctl start hub75-tts

# Check status
sudo systemctl status hub75-tts
```

**Backend Ports**:
- `1883` - MQTT (ESP32 connection)
- `9001` - WebSocket (Dashboard connection)
- `8000` - HTTP (Audio file serving)

### Firmware Configuration

**Edit** `firmware/src/main.cpp`:

```cpp
// WiFi Settings
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// MQTT Settings
const char *mqtt_server = "192.168.1.4";  // Your Pi's IP
const int mqtt_port = 1883;

// Timezone (GMT offset in seconds)
const long gmtOffset_sec = 19800;  // GMT+5:30 for India
// Find yours: https://en.wikipedia.org/wiki/List_of_UTC_time_offsets
```

**PlatformIO Upload**:
```bash
cd firmware
pio run --target upload      # Upload firmware
pio device monitor           # View serial output (115200 baud)
```

**Arduino IDE** (alternative):
1. Install ESP32 board support
2. Install libraries: ESP32-HUB75-MatrixPanel-I2S-DMA, PubSubClient, ArduinoJson, ESP8266Audio
3. Select board: "ESP32-S3 Dev Module"
4. Upload

---

## 📡 MQTT Topics

The system uses these MQTT topics for communication:

| Topic | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `display/brightness` | Dashboard → ESP32 | `0-255` | Set display brightness |
| `display/message` | Dashboard → ESP32 | `"Hello"` | Set scrolling message |
| `display/speed` | Dashboard → ESP32 | `50-500` | Scroll speed in ms |
| `display/color` | Dashboard → ESP32 | JSON | RGB colors for sections |
| `display/weather` | Dashboard → ESP32 | JSON | Weather data |
| `display/restart` | Dashboard → ESP32 | `mqtt/wifi/reboot` | Restart ESP32 |
| `display/announce/text` | Dashboard → TTS | `"Text"` | Text to speak |
| `display/announce` | TTS → ESP32 | `http://url` | Audio file URL |
| `display/status` | ESP32 → Dashboard | JSON | Device status |

**Example Color JSON**:
```json
{
  "message": {"r": 0, "g": 255, "b": 0},
  "time": {"r": 0, "g": 255, "b": 255},
  "weather": {"r": 255, "g": 165, "b": 0},
  "weatherDesc": {"r": 255, "g": 255, "b": 0}
}
```

---

## 🎯 System Architecture

```
┌─────────────────┐
│  User Browser   │  Access dashboard from anywhere
│   (Anywhere)    │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│     Vercel      │  Frontend - React Dashboard
│   Cloud CDN     │  - No backend needed
└────────┬────────┘  - Static files only
         │ WebSocket (ws://PI_IP:9001)
         ▼
┌─────────────────┐
│  Raspberry Pi   │  Backend - Services
│  192.168.1.x    │
│                 │
│  Port 1883 ─────┼──► MQTT Broker (Mosquitto)
│  Port 9001 ─────┼──► WebSocket (for dashboard)
│  Port 8000 ─────┼──► HTTP Server (audio files)
└────────┬────────┘
         │ MQTT (port 1883)
         │
         ▼
┌─────────────────┐
│     ESP32-S3    │  Firmware - Display Controller
│   192.168.1.y   │
│                 │
│  • WiFi Client  │
│  • MQTT Client  │
│  • HUB75 Driver │
│  • Audio Player │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   LED Matrix    │  64x32 RGB Display
│   + Speaker     │  (Optional audio)
└─────────────────┘
```

---

## 🐛 Troubleshooting

### Dashboard Connection Issues

**Problem**: Dashboard shows "Disconnected"

**Solutions**:
1. Verify Pi IP is correct
2. Check Mosquitto is running:
   ```bash
   sudo systemctl status mosquitto
   ```
3. Test WebSocket connection:
   ```bash
   mosquitto_sub -h YOUR_PI_IP -p 9001 -t '#' -v
   ```
4. Check firewall (if enabled):
   ```bash
   sudo ufw allow 9001/tcp
   ```

### ESP32 Won't Connect to MQTT

**Problem**: Serial monitor shows "MQTT connection failed"

**Solutions**:
1. Verify MQTT server IP matches Pi's IP
2. Check Mosquitto is running on Pi
3. Test from another device:
   ```bash
   mosquitto_pub -h PI_IP -t 'test' -m 'hello'
   ```
4. Check WiFi credentials in firmware
5. View serial output for detailed errors

### ESP32 Won't Connect to WiFi

**Problem**: Serial shows "WiFi connection failed"

**Solutions**:
1. Verify SSID and password are correct
2. Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
3. Check WiFi signal strength
4. Try moving ESP32 closer to router
5. Restart ESP32

### Audio Not Working

**Problem**: No sound from speaker

**Solutions**:
1. Check TTS server is running:
   ```bash
   sudo systemctl status hub75-tts
   # OR
   ps aux | grep tts_server
   ```
2. Test espeak:
   ```bash
   espeak "test message"
   ```
3. Verify MAX98357A wiring
4. Check SD pin is HIGH (GPIO 21)
5. Test audio file accessibility:
   ```bash
   curl http://PI_IP:8000/announcement_xxxxx.wav
   ```

### Display Not Showing Anything

**Problem**: LED matrix is dark or shows garbage

**Solutions**:
1. Check 5V power supply (must be 2-3A)
2. Verify all HUB75 cable connections
3. Check GPIO pin configuration in `main.cpp`
4. Ensure panel is 64x32 (adjust `PANEL_RES_X/Y` if different)
5. View serial monitor for initialization errors

### Pi Performance Issues

**Problem**: TTS generation is slow

**Solutions**:
1. Verify espeak is installed (lighter than pyttsx3):
   ```bash
   which espeak
   ```
2. Check CPU usage:
   ```bash
   htop
   ```
3. Reduce max audio files in `tts_server.py`:
   ```python
   MAX_AUDIO_FILES = 5  # Default is 10
   ```

### View Logs

**Mosquitto**:
```bash
sudo tail -f /var/log/mosquitto/mosquitto.log
```

**TTS Server** (if using systemd):
```bash
sudo journalctl -u hub75-tts -f
```

**ESP32**:
```bash
pio device monitor --baud 115200
```

---

## 🔒 Network & Security

### Firewall Configuration (Pi)

If you have a firewall enabled:
```bash
# Allow required ports
sudo ufw allow 1883/tcp  # MQTT
sudo ufw allow 9001/tcp  # WebSocket
sudo ufw allow 8000/tcp  # HTTP

# Check status
sudo ufw status
```

### Security Recommendations

**For Production Use**:

1. **Enable MQTT Authentication**:
```bash
# Create password file
sudo mosquitto_passwd -c /etc/mosquitto/passwd yourusername

# Edit mosquitto.conf
sudo nano /etc/mosquitto/conf.d/hub75.conf

# Add these lines:
allow_anonymous false
password_file /etc/mosquitto/passwd

# Restart
sudo systemctl restart mosquitto
```

2. **Use TLS/SSL** for MQTT (advanced)
3. **Set up VPN** for remote access
4. **Keep software updated**:
```bash
sudo apt update && sudo apt upgrade
```

### Port Forwarding (Optional)

To access dashboard remotely:
1. Forward ports 9001 (WebSocket) on your router to Pi
2. Use dynamic DNS service for stable URL
3. Consider using Tailscale or Cloudflare Tunnel (recommended over port forwarding)

---

## 💾 Resource Usage (Raspberry Pi 3B+)

**Expected Usage**:
- **CPU**: 5-15% (idle), 30-40% (during TTS generation)
- **RAM**: 50-100 MB total
- **Disk**: ~50 MB installation + 10 MB for audio files (auto-cleaned)
- **Network**: Minimal (MQTT messages are <1KB each)

**Optimization Tips**:
- TTS server uses espeak (lightweight, ~10 MB RAM)
- Old audio files are auto-deleted (keeps last 10)
- Systemd service has CPU/memory limits configured

---

## 🔄 Updates & Maintenance

### Update Frontend
```bash
cd frontend
git pull
npm install
npm run build
# Vercel auto-deploys on git push
```

### Update Backend
```bash
ssh pi@raspberrypi.local
cd ~/hub75-backend
git pull  # or upload new files
sudo systemctl restart hub75-tts
```

### Update Firmware
```bash
cd firmware
git pull
# Edit main.cpp if needed
pio run --target upload
```

---

## 📖 Additional Resources

### Libraries Used
- **Frontend**: React, Vite, MQTT.js
- **Backend**: paho-mqtt, pyttsx3 (fallback), espeak
- **Firmware**: ESP32-HUB75-MatrixPanel-I2S-DMA, PubSubClient, ArduinoJson, ESP8266Audio

### Useful Links
- [HUB75 Library](https://github.com/mrfaptastic/ESP32-HUB75-MatrixPanel-DMA)
- [Eclipse Mosquitto](https://mosquitto.org/)
- [Vercel Documentation](https://vercel.com/docs)
- [PlatformIO](https://platformio.org/)
- [Find GPS Coordinates](https://www.latlong.net/)
- [Timezone Offsets](https://en.wikipedia.org/wiki/List_of_UTC_time_offsets)

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit pull requests
- 📖 Improve documentation

**Repository**: https://github.com/shudiptosid/HUB-75-DMA-Announcer

---

## 📄 License

MIT License - Free for personal and commercial use.

---

## 🙏 Acknowledgments

Built with:
- [ESP32-HUB75-MatrixPanel-DMA](https://github.com/mrfaptastic/ESP32-HUB75-MatrixPanel-DMA) by mrfaptastic
- [Eclipse Mosquitto](https://mosquitto.org/)
- [React](https://react.dev/)
- [MQTT.js](https://github.com/mqttjs/MQTT.js)

---

## 📧 Support

- **GitHub Issues**: https://github.com/shudiptosid/HUB-75-DMA-Announcer/issues
- **Discussions**: Check GitHub Discussions for Q&A

---

**Made with ❤️ by [Shudipto Siddaqi](https://github.com/shudiptosid)**

**⭐ Star this repo if you find it useful!**

## 📺 Display Layout

```
┌────────────────────────────────────────────────────────────────┐
│  📝 SCROLLING MESSAGE                    (Custom, adjustable)  │
├────────────────────────────────────────────────────────────────┤
│  🕐 TIME & DATE                         (NTP synchronized)    │
├────────────────────────────────────────────────────────────────┤
│  🌤️ WEATHER                              (Real-time updates)   │
└────────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Dashboard Features
- 🎨 Modern, responsive UI
- 🌙 Dark mode support
- 📱 Mobile friendly
- ⚡ Real-time MQTT control
- 🎚️ Brightness & speed control
- 🎨 Custom RGB colors
- 📍 Weather with location selection

### Backend Features
- 🔊 Text-to-speech announcements
- 🚀 Optimized for Raspberry Pi 3B+
- 🔄 Auto-reconnect
- 📁 Automatic audio file cleanup
- 💾 Low memory footprint

### Firmware Features
- 🕐 NTP-synced clock
- 🌤️ Weather display
- 📜 Scrolling messages
- 🔊 I2S audio playback
- 🎨 Custom colors
- 📡 MQTT control
- 🔄 Remote restart

## 🔌 System Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Vercel    │◄───WS──►│  Raspberry Pi    │◄──MQTT──►│   ESP32     │
│  Dashboard  │         │  (MQTT + TTS)    │         │  (Display)  │
└─────────────┘         └──────────────────┘         └─────────────┘
     User                   Port 9001                   WiFi Client
   Interface               Port 1883
                           Port 8000 (HTTP)
```

### Communication Flow
1. **User** controls display via web dashboard (Vercel)
2. **Dashboard** sends MQTT commands via WebSocket (port 9001)
3. **Mosquitto** broker on Pi routes messages
4. **ESP32** receives commands and updates display
5. **TTS Server** generates audio for announcements
6. **ESP32** downloads and plays audio via HTTP

## 🛠️ Hardware Requirements

### Required
- **ESP32-S3 Mini** (or compatible ESP32 board)
- **HUB75 64x32 RGB LED Matrix** panel
- **Raspberry Pi 3B+** (or any Linux server, Pi Zero 2W works too)
- **5V Power Supply** (2-3A for LED panel)
- **Jumper wires** for connections

### Optional (for announcements)
- **MAX98357A I2S Audio Amplifier**
- **Speaker** (4Ω-8Ω)

## 📋 Network Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Mosquitto MQTT | 1883 | TCP | ESP32 ↔ Broker |
| Mosquitto WebSocket | 9001 | WS | Dashboard ↔ Broker |
| TTS HTTP Server | 8000 | HTTP | ESP32 downloads audio |

## 🐛 Troubleshooting

### Dashboard can't connect to MQTT
- Verify Pi IP address
- Check firewall: `sudo ufw allow 9001/tcp`
- Test: `mosquitto_sub -h YOUR_PI_IP -p 9001 -t '#'`

### ESP32 can't connect to MQTT
- Verify Pi IP in firmware
- Check if Mosquitto is running: `sudo systemctl status mosquitto`
- Check ESP32 serial monitor for errors

### Audio not working
- Ensure TTS server is running: `python3 tts_server.py`
- Check if espeak is installed: `espeak "test"`
- Verify MAX98357A wiring

### Display issues
- Check HUB75 cable connections
- Verify 5V power supply is adequate (2-3A minimum)
- Check GPIO pin definitions match your wiring

## 🎯 Development

### Frontend
```bash
cd frontend
npm install
npm run dev        # Development server
npm run build      # Production build
```

### Backend
```bash
cd backend
pip3 install -r requirements.txt
python3 tts_server.py
```

### Firmware
```bash
cd firmware
pio run              # Build
pio run -t upload    # Upload
pio device monitor   # Serial monitor
```

## 🔒 Security Notes

**This setup uses anonymous MQTT connections for simplicity.**

For production:
1. Enable MQTT authentication
2. Use TLS/SSL for MQTT
3. Set up firewall rules
4. Use VPN for remote access

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Credits

Built with:
- [ESP32-HUB75-MatrixPanel-DMA](https://github.com/mrfaptastic/ESP32-HUB75-MatrixPanel-DMA)
- [Eclipse Mosquitto](https://mosquitto.org/)
- [React](https://react.dev/)
- [MQTT.js](https://github.com/mqttjs/MQTT.js)
- [pyttsx3](https://github.com/nateshmbhat/pyttsx3)

---

**Made with ❤️ for makers and tinkerers**

- **Timezone Support** - Configurable GMT offset for any location

### 🌤️ Weather Integration

- **Live Weather Data** - Real-time temperature and conditions
- **City Display** - Shows location name with weather description
- **Open-Meteo API** - Free, no API key required!

### 📡 Connectivity

- **MQTT Protocol** - Reliable pub/sub messaging for instant updates
- **WebSocket Support** - Browser-based control without additional software
- **Auto-Reconnection** - Robust WiFi and MQTT recovery mechanisms
- **Remote Device Control** - Restart ESP32's MQTT, WiFi, or full reboot from dashboard

### 🎨 Modern Web Dashboard

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-Time Status** - Live connection indicators and device feedback
- **Intuitive Controls** - Sliders, color pickers, and quick-action buttons
- **Dark Theme** - Easy on the eyes with beautiful gradients

---

## 🔧 Hardware Requirements

| Component           | Specification                             |
| ------------------- | ----------------------------------------- |
| **Microcontroller** | ESP32-S3 Mini (LOLIN S3 Mini recommended) |
| **LED Panel**       | HUB75 64x32 RGB LED Matrix (1/16 scan)    |
| **Power Supply**    | 5V 4A+ (depending on brightness)          |
| **Connection**      | WiFi 2.4GHz                               |

### 📌 Wiring Diagram

```
ESP32-S3 Pin    HUB75 Panel
───────────────────────────
GPIO2   ──────► R1
GPIO3   ──────► G1
GPIO4   ──────► B1
GPIO5   ──────► R2
GPIO6   ──────► G2
GPIO7   ──────► B2
GPIO16  ──────► A
GPIO17  ──────► B
GPIO18  ──────► C
GPIO8   ──────► D
GPIO15  ──────► E
GPIO9   ──────► CLK
GPIO10  ──────► LAT
GPIO11  ──────► OE
GND     ──────► GND
```

---

## 📦 Installation

### Prerequisites

- [PlatformIO](https://platformio.org/) (VS Code extension recommended)
- [Node.js](https://nodejs.org/) v18+
- [Mosquitto MQTT Broker](https://mosquitto.org/download/)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/HUB75-LED-Matrix.git
cd HUB75-LED-Matrix
```

### 2️⃣ Configure ESP32 Firmware

Edit `src/main.cpp` and update your credentials:

```cpp
// WiFi Settings
const char *ssid = "Your_WiFi_SSID";
const char *password = "Your_WiFi_Password";

// MQTT Broker IP (your PC's local IP)
const char *mqtt_server = "192.168.1.x";

// Timezone (seconds offset from GMT)
const long gmtOffset_sec = 19800;  // Example: GMT+5:30 for India
```

### 3️⃣ Upload Firmware

```bash
# Using PlatformIO CLI
pio run -t upload

# Or use PlatformIO IDE upload button
```

### 4️⃣ Configure MQTT Broker

Create or update `mosquitto.conf`:

```conf
# TCP listener for ESP32
listener 1883 0.0.0.0

# WebSocket listener for browser dashboard
listener 9001 0.0.0.0
protocol websockets

# Allow connections without authentication (local network only!)
allow_anonymous true
```

Start Mosquitto:

```bash
# Windows
mosquitto -c mosquitto.conf -v

# Linux/macOS
mosquitto -c /path/to/mosquitto.conf -v
```

### 5️⃣ Run the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### 6️⃣ Setup Announcement System (Optional)

For audio announcements with MAX98357A:

1. **Hardware**: Connect MAX98357A to ESP32 (see [ANNOUNCEMENT_SETUP.md](ANNOUNCEMENT_SETUP.md))
2. **Software**: Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. **Run TTS Server**:
   ```bash
   python tts_server.py
   ```

📖 **Full Guide**: [ANNOUNCEMENT_SETUP.md](ANNOUNCEMENT_SETUP.md)  
⚡ **Quick Start**: [ANNOUNCEMENT_QUICKSTART.md](ANNOUNCEMENT_QUICKSTART.md)

---

## 🎮 Usage

### Dashboard Overview

| Section          | Description                                                                    |
| ---------------- | ------------------------------------------------------------------------------ |
| **Brightness**   | Adjust LED panel brightness with slider or quick presets (25%, 50%, 75%, 100%) |
| **Message**      | Enter custom scrolling text to display                                         |
| **Scroll Speed** | Control text animation speed (Fast → Slow)                                     |
| **Colors**       | Pick individual colors for message, time, and weather sections                 |
| **Weather**      | Automatic weather updates from Open-Meteo (configurable city)                  |
| **Connection**   | MQTT status, reconnect controls, and ESP32 device management                   |

### ESP32 Remote Controls

The dashboard includes buttons to remotely manage the ESP32:

- **🔌 MQTT** - Reconnect MQTT client only
- **📶 WiFi** - Restart WiFi + MQTT connections
- **🔄 Reboot** - Full ESP32 hardware restart

---

## 📡 MQTT Topics

| Topic                | Direction         | Payload              | Description                      |
| -------------------- | ----------------- | -------------------- | -------------------------------- |
| `display/brightness` | Dashboard → ESP32 | `0-255`              | Set brightness level             |
| `display/message`    | Dashboard → ESP32 | `string`             | Set scrolling message text       |
| `display/speed`      | Dashboard → ESP32 | `20-500`             | Set scroll delay in milliseconds |
| `display/weather`    | Dashboard → ESP32 | `JSON`               | Weather data object              |
| `display/color`      | Dashboard → ESP32 | `JSON`               | Section color configuration      |
| `display/restart`    | Dashboard → ESP32 | `mqtt\|wifi\|reboot` | Device control commands          |
| `display/status`     | ESP32 → Dashboard | `online`             | Connection status                |

### Weather JSON Format

```json
{
  "temp": "25",
  "desc": "Partly Cloudy",
  "city": "New York"
}
```

### Color JSON Format

```json
{
  "message": { "r": 255, "g": 255, "b": 0 },
  "time": { "r": 0, "g": 255, "b": 255 },
  "weather": { "r": 255, "g": 165, "b": 0 },
  "weatherDesc": { "r": 255, "g": 255, "b": 255 }
}
```

---

## 🏗️ Project Structure

```
HUB75-LED-Matrix/
├── 📁 src/
│   └── main.cpp           # ESP32 firmware
├── 📁 dashboard/
│   ├── 📁 src/
│   │   ├── App.jsx        # React dashboard application
│   │   ├── main.jsx       # React entry point
│   │   └── styles.css     # Dashboard styling
│   ├── index.html         # HTML template
│   ├── package.json       # Node.js dependencies
│   └── vite.config.js     # Vite build configuration
├── 📁 include/            # Header files
├── 📁 lib/                # External libraries
├── mosquitto.conf         # MQTT broker configuration
├── platformio.ini         # PlatformIO project config
└── README.md
```

---

## 🔌 Dependencies

### ESP32 Firmware

- [ESP32-HUB75-MatrixPanel-I2S-DMA](https://github.com/mrfaptastic/ESP32-HUB75-MatrixPanel-I2S-DMA) - LED matrix driver
- [PubSubClient](https://github.com/knolleary/pubsubclient) - MQTT client
- [ArduinoJson](https://arduinojson.org/) - JSON parsing
- [Adafruit GFX Library](https://github.com/adafruit/Adafruit-GFX-Library) - Graphics primitives

### Web Dashboard

- [React 18](https://react.dev/) - UI framework
- [MQTT.js](https://github.com/mqttjs/MQTT.js) - MQTT client for browser
- [Vite](https://vitejs.dev/) - Build tool

---

## 🌐 Weather API

This project uses the **Open-Meteo API** - a free, open-source weather API that requires no API key!

Default location: Jalandhar, India (configurable in `App.jsx`)

```javascript
const WEATHER_CONFIG = {
  latitude: 31.375,
  longitude: 75.625,
  city: "Jalandhar",
};
```

---

## 🛠️ Troubleshooting

### Common Issues

| Issue                              | Solution                                                   |
| ---------------------------------- | ---------------------------------------------------------- |
| **Dashboard shows "Disconnected"** | Ensure Mosquitto is running with WebSocket on port 9001    |
| **ESP32 not connecting**           | Verify WiFi credentials and MQTT broker IP in `main.cpp`   |
| **Weather not updating**           | Check internet connection; Open-Meteo may have rate limits |
| **Display flickering**             | Use adequate 5V power supply (4A+ recommended)             |

### Debug Commands

```bash
# Check if Mosquitto is running
netstat -an | findstr "1883"
netstat -an | findstr "9001"

# Monitor MQTT traffic
mosquitto_sub -h localhost -t "display/#" -v
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [mrfaptastic](https://github.com/mrfaptastic) for the amazing HUB75 DMA library
- [Eclipse Mosquitto](https://mosquitto.org/) for the reliable MQTT broker
- [Open-Meteo](https://open-meteo.com/) for the free weather API

---

<div align="center">

**Made with ❤️ for the maker community**

⭐ Star this repo if you find it useful!

</div>
