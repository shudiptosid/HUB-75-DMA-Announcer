#!/bin/bash

# HUB75 TTS Backend Setup Script for Raspberry Pi 3B+
# Run with: bash setup.sh

set -e

echo "=========================================="
echo "HUB75 TTS Backend Setup"
echo "=========================================="

# Update system
echo ""
echo "[1/5] Updating system packages..."
sudo apt-get update

# Install Mosquitto MQTT Broker
echo ""
echo "[2/5] Installing Mosquitto MQTT Broker..."
sudo apt-get install -y mosquitto mosquitto-clients

# Install espeak (lightweight TTS for Pi)
echo ""
echo "[3/5] Installing espeak (Text-to-Speech)..."
sudo apt-get install -y espeak

# Install Python dependencies
echo ""
echo "[4/5] Installing Python dependencies..."
pip3 install -r requirements.txt

# Copy Mosquitto config
echo ""
echo "[5/5] Configuring Mosquitto..."
sudo cp mosquitto.conf /etc/mosquitto/conf.d/hub75.conf

# Create announcements directory
mkdir -p announcements

# Enable and start Mosquitto
sudo systemctl enable mosquitto
sudo systemctl restart mosquitto

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Backend Services:"
echo "  MQTT Broker: mqtt://$LOCAL_IP:1883"
echo "  WebSocket:   ws://$LOCAL_IP:9001"
echo "  HTTP Server: http://$LOCAL_IP:8000"
echo ""
echo "Next Steps:"
echo "  1. Start the TTS server:"
echo "     python3 tts_server.py"
echo ""
echo "  2. Configure your ESP32 firmware with:"
echo "     MQTT_SERVER = \"$LOCAL_IP\""
echo ""
echo "  3. Configure your Vercel dashboard with:"
echo "     MQTT_BROKER = \"ws://$LOCAL_IP:9001\""
echo ""
echo "To run at boot, see systemd service instructions in README.md"
echo ""
