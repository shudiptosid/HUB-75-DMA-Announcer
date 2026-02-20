"""
TTS Server for ESP32 HUB75 Announcement System (Raspberry Pi Optimized)
Listens to MQTT, generates speech, serves audio to ESP32

Optimized for Raspberry Pi 3B+:
- Lightweight HTTP server
- Efficient subprocess-based TTS
- Minimal memory footprint
- Auto cleanup of old audio files

Requirements:
    pip install paho-mqtt pyttsx3

Usage:
    python3 tts_server.py
"""

import paho.mqtt.client as mqtt
import subprocess
import sys
import threading
import os
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver
import glob

# ==================== CONFIGURATION ====================
MQTT_BROKER = "localhost"  # MQTT broker address
MQTT_PORT = 1883
MQTT_TOPIC_ANNOUNCE_TEXT = "display/announce/text"  # Topic to receive text
MQTT_TOPIC_ANNOUNCE_URL = "display/announce"        # Topic to send audio URL

HTTP_SERVER_PORT = 8000  # Port for serving audio files
AUDIO_OUTPUT_DIR = "announcements"  # Directory to store audio files
MAX_AUDIO_FILES = 10  # Maximum number of audio files to keep (save disk space)

# Create audio output directory
if not os.path.exists(AUDIO_OUTPUT_DIR):
    os.makedirs(AUDIO_OUTPUT_DIR)

# ==================== TTS FUNCTIONS ====================
def cleanup_old_audio_files():
    """Remove old audio files to save disk space on Pi"""
    try:
        files = glob.glob(os.path.join(AUDIO_OUTPUT_DIR, "announcement_*.wav"))
        if len(files) > MAX_AUDIO_FILES:
            # Sort by creation time and remove oldest
            files.sort(key=os.path.getctime)
            for old_file in files[:-MAX_AUDIO_FILES]:
                try:
                    os.remove(old_file)
                    print(f"🗑️  Cleaned up old file: {os.path.basename(old_file)}")
                except Exception as e:
                    print(f"⚠️  Could not delete {old_file}: {e}")
    except Exception as e:
        print(f"⚠️  Cleanup error: {e}")

def text_to_speech(text, filename):
    """
    Convert text to speech using espeak (lightweight for Pi)
    Falls back to pyttsx3 if espeak not available
    
    Args:
        text: Text to convert
        filename: Output filename (without extension)
    
    Returns:
        Full path to generated audio file or None
    """
    output_path = os.path.join(AUDIO_OUTPUT_DIR, f"{filename}.wav")
    
    print(f"🎤 Generating speech: '{text}'")
    
    try:
        # Try espeak first (much lighter on Pi)
        result = subprocess.run(
            ["espeak", text, "-w", output_path, "-s", "150"],
            timeout=15,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0 and os.path.exists(output_path):
            print(f"✓ Audio generated with espeak ({os.path.getsize(output_path)} bytes)")
            cleanup_old_audio_files()
            return output_path
            
    except FileNotFoundError:
        print("⚠️  espeak not found, falling back to pyttsx3...")
    except Exception as e:
        print(f"⚠️  espeak error: {e}")
    
    # Fallback to pyttsx3
    try:
        script = f'''
import pyttsx3
engine = pyttsx3.init()
engine.setProperty("rate", 150)
engine.setProperty("volume", 1.0)
engine.save_to_file("{text}", r"{output_path}")
engine.runAndWait()
engine.stop()
'''
        result = subprocess.run(
            [sys.executable, '-c', script],
            timeout=20,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0 and os.path.exists(output_path):
            time.sleep(0.2)
            print(f"✓ Audio generated with pyttsx3 ({os.path.getsize(output_path)} bytes)")
            cleanup_old_audio_files()
            return output_path
        else:
            print(f"✗ TTS error: {result.stderr}")
            return None
            
    except subprocess.TimeoutExpired:
        print("✗ TTS generation timed out!")
        return None
    except Exception as e:
        print(f"✗ Error generating speech: {e}")
        return None

# ==================== HTTP SERVER ====================
class AudioHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Custom HTTP handler to serve audio files"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=AUDIO_OUTPUT_DIR, **kwargs)
    
    def log_message(self, format, *args):
        """Simplified logging for Pi"""
        pass  # Suppress verbose HTTP logs

def start_http_server():
    """Start HTTP server to serve audio files"""
    handler = AudioHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", HTTP_SERVER_PORT), handler) as httpd:
            print(f"✓ HTTP Server started on port {HTTP_SERVER_PORT}")
            httpd.serve_forever()
    except Exception as e:
        print(f"✗ HTTP Server error: {e}")

# Start HTTP server in background thread
http_thread = threading.Thread(target=start_http_server, daemon=True)
http_thread.start()

# ==================== MQTT FUNCTIONS ====================
def get_local_ip():
    """Get local IP address"""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

LOCAL_IP = get_local_ip()

def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        print(f"✓ Connected to MQTT broker")
        client.subscribe(MQTT_TOPIC_ANNOUNCE_TEXT)
        print(f"✓ Subscribed to: {MQTT_TOPIC_ANNOUNCE_TEXT}")
    else:
        print(f"✗ Connection failed with code {rc}")

def on_message(client, userdata, msg):
    """Callback when MQTT message is received"""
    try:
        text = msg.payload.decode('utf-8')
        print(f"\n{'='*50}")
        print(f"📢 Announcement: {text}")
        print(f"{'='*50}")
        
        if not text or len(text.strip()) == 0:
            print("✗ Empty text received")
            return
        
        # Generate unique filename
        filename = f"announcement_{int(time.time())}"
        
        # Generate speech audio
        audio_path = text_to_speech(text, filename)
        
        if audio_path and os.path.exists(audio_path):
            audio_url = f"http://{LOCAL_IP}:{HTTP_SERVER_PORT}/{filename}.wav"
            print(f"🔊 Audio URL: {audio_url}")
            
            # Send URL to ESP32 via MQTT
            client.publish(MQTT_TOPIC_ANNOUNCE_URL, audio_url)
            print(f"✓ Published to ESP32\n")
        else:
            print("✗ Failed to generate audio\n")
            
    except Exception as e:
        print(f"✗ Error: {e}\n")

def on_disconnect(client, userdata, rc):
    """Callback when disconnected from MQTT broker"""
    if rc != 0:
        print(f"⚠️  Disconnected. Reconnecting...")

# ==================== MAIN ====================
def main():
    """Main function"""
    print("\n" + "="*50)
    print("ESP32 HUB75 TTS Server (Pi Optimized)")
    print("="*50)
    print(f"IP: {LOCAL_IP}")
    print(f"HTTP: http://{LOCAL_IP}:{HTTP_SERVER_PORT}")
    print(f"MQTT: {MQTT_BROKER}:{MQTT_PORT}")
    print("="*50)
    print("\nPress Ctrl+C to stop\n")
    
    # Create MQTT client
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_forever()
        
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        client.disconnect()
        print("✓ Server stopped")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    main()
