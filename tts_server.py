"""
TTS Server for ESP32 HUB75 Announcement System
Listens to MQTT, generates speech, serves MP3 to ESP32

Requirements:
    pip install paho-mqtt pyttsx3

Usage:
    python tts_server.py
"""

import paho.mqtt.client as mqtt
import pyttsx3
import threading
import os
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver

# ==================== CONFIGURATION ====================
MQTT_BROKER = "localhost"  # MQTT broker address
MQTT_PORT = 1883
MQTT_TOPIC_ANNOUNCE_TEXT = "display/announce/text"  # Topic to receive text
MQTT_TOPIC_ANNOUNCE_URL = "display/announce"        # Topic to send audio URL

HTTP_SERVER_PORT = 8000  # Port for serving MP3 files
AUDIO_OUTPUT_DIR = "announcements"  # Directory to store MP3 files

# Create audio output directory
if not os.path.exists(AUDIO_OUTPUT_DIR):
    os.makedirs(AUDIO_OUTPUT_DIR)

# ==================== TTS ENGINE ====================
tts_engine = pyttsx3.init()

# Configure TTS voice (optional)
def configure_voice():
    """Configure TTS voice settings"""
    voices = tts_engine.getProperty('voices')
    
    # Print available voices
    print("\n=== Available Voices ===")
    for idx, voice in enumerate(voices):
        print(f"{idx}: {voice.name} - {voice.languages}")
    
    # Set voice (0 = male, 1 = female typically on Windows)
    # You can change this index to select different voices
    if len(voices) > 1:
        tts_engine.setProperty('voice', voices[1].id)  # Use index 1 for female voice
    
    # Set speech rate (words per minute) - default is ~200
    tts_engine.setProperty('rate', 150)  # Slower, clearer speech
    
    # Set volume (0.0 to 1.0)
    tts_engine.setProperty('volume', 1.0)
    
    print(f"\nUsing voice: {tts_engine.getProperty('voice')}")
    print(f"Rate: {tts_engine.getProperty('rate')} words/min")
    print(f"Volume: {tts_engine.getProperty('volume')}\n")

configure_voice()

# ==================== TTS FUNCTIONS ====================
def text_to_speech(text, filename):
    """
    Convert text to speech and save as audio file using subprocess
    to avoid pyttsx3 freezing issues
    
    Args:
        text: Text to convert
        filename: Output filename (without extension)
    
    Returns:
        Full path to generated audio file
    """
    import subprocess
    import sys
    
    output_path = os.path.join(AUDIO_OUTPUT_DIR, f"{filename}.wav")
    
    print(f"Generating speech: '{text}'")
    print(f"Output file: {output_path}")
    
    try:
        # Run TTS in a subprocess to avoid freezing
        script = f'''
import pyttsx3
engine = pyttsx3.init()
voices = engine.getProperty('voices')
if len(voices) > 0:
    engine.setProperty('voice', voices[0].id)
engine.setProperty('rate', 200)
engine.setProperty('volume', 1.0)
engine.save_to_file("{text}", r"{output_path}")
engine.runAndWait()
engine.stop()
'''
        result = subprocess.run(
            [sys.executable, '-c', script],
            timeout=30,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"✗ TTS subprocess error: {result.stderr}")
            return None
        
        # Wait a moment for file to be written
        time.sleep(0.3)
        
        if os.path.exists(output_path):
            print(f"✓ Audio file generated successfully ({os.path.getsize(output_path)} bytes)")
            return output_path
        else:
            print("✗ Audio file was not created!")
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
        """Custom logging"""
        print(f"[HTTP] {args[0]} - {args[1]}")

def start_http_server():
    """Start HTTP server to serve audio files"""
    handler = AudioHTTPRequestHandler
    
    with socketserver.TCPServer(("", HTTP_SERVER_PORT), handler) as httpd:
        print(f"✓ HTTP Server started on port {HTTP_SERVER_PORT}")
        print(f"  Serving files from: {os.path.abspath(AUDIO_OUTPUT_DIR)}/")
        httpd.serve_forever()

# Start HTTP server in background thread
http_thread = threading.Thread(target=start_http_server, daemon=True)
http_thread.start()

# ==================== MQTT FUNCTIONS ====================
def get_local_ip():
    """Get local IP address for generating URLs"""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't need to be reachable
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
        print(f"✓ Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC_ANNOUNCE_TEXT)
        print(f"✓ Subscribed to: {MQTT_TOPIC_ANNOUNCE_TEXT}")
    else:
        print(f"✗ Connection failed with code {rc}")

def on_message(client, userdata, msg):
    """Callback when MQTT message is received"""
    try:
        text = msg.payload.decode('utf-8')
        print(f"\n{'='*60}")
        print(f"[ANNOUNCEMENT REQUEST]")
        print(f"Topic: {msg.topic}")
        print(f"Text: {text}")
        print(f"{'='*60}")
        
        if not text or len(text.strip()) == 0:
            print("✗ Empty text received, ignoring")
            return
        
        # Generate unique filename based on timestamp
        filename = f"announcement_{int(time.time())}"
        
        # Generate speech audio
        audio_path = text_to_speech(text, filename)
        
        if audio_path and os.path.exists(audio_path):
            # Generate URL for ESP32 to download
            audio_url = f"http://{LOCAL_IP}:{HTTP_SERVER_PORT}/{filename}.wav"
            
            print(f"\n📢 Publishing audio URL to ESP32:")
            print(f"   {audio_url}")
            
            # Send URL to ESP32 via MQTT
            client.publish(MQTT_TOPIC_ANNOUNCE_URL, audio_url)
            
            print(f"✓ Announcement ready!\n")
        else:
            print("✗ Failed to generate audio file\n")
            
    except Exception as e:
        print(f"✗ Error processing message: {e}\n")

def on_disconnect(client, userdata, rc):
    """Callback when disconnected from MQTT broker"""
    if rc != 0:
        print(f"⚠ Unexpected disconnect. Reconnecting...")

# ==================== MAIN ====================
def main():
    """Main function"""
    print("\n" + "="*60)
    print("ESP32 HUB75 TTS Announcement Server")
    print("="*60)
    print(f"Local IP: {LOCAL_IP}")
    print(f"HTTP Server: http://{LOCAL_IP}:{HTTP_SERVER_PORT}")
    print(f"MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Listening on: {MQTT_TOPIC_ANNOUNCE_TEXT}")
    print("="*60)
    print("\nType messages in the dashboard to hear announcements!")
    print("Press Ctrl+C to stop\n")
    
    # Create MQTT client
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    
    try:
        # Connect to MQTT broker
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        
        # Start MQTT loop
        client.loop_forever()
        
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        client.disconnect()
        print("✓ Server stopped")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    main()
