import React, { useState, useEffect, useCallback, useRef } from "react";
import mqtt from "mqtt";

// ==================== CONFIGURATION ====================
// UPDATE THESE VALUES!
const MQTT_BROKER = "ws://localhost:9001"; // WebSocket MQTT broker

// Location for weather (Open-Meteo API - FREE, no API key needed!)
// Find your coordinates: https://www.latlong.net/
const DEFAULT_LATITUDE = 31.375; // Your latitude
const DEFAULT_LONGITUDE = 75.625; // Your longitude
const DEFAULT_CITY = "Jalandhar"; // Display name

// MQTT Topics (must match ESP32)
const TOPICS = {
  brightness: "display/brightness",
  message: "display/message",
  weather: "display/weather",
  status: "display/status",
  color: "display/color",
  speed: "display/speed",
  restart: "display/restart",
  announceText: "display/announce/text", // Send text to TTS server
};

// Weather code to description mapping (WMO codes)
const weatherCodes = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Cloudy",
  45: "Foggy",
  48: "Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Light Showers",
  81: "Showers",
  82: "Heavy Showers",
  85: "Snow Showers",
  86: "Heavy Snow",
  95: "Thunderstorm",
  96: "Hail Storm",
  99: "Heavy Hail",
};

function App() {
  // Connection state
  const [mqttClient, setMqttClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [brokerUrl, setBrokerUrl] = useState(MQTT_BROKER);

  // Display state
  const [brightness, setBrightness] = useState(90);
  const [customMessage, setCustomMessage] = useState("Hello World!");
  const [messageInput, setMessageInput] = useState("Hello World!");
  const [scrollSpeed, setScrollSpeed] = useState(150); // Default 150ms

  // Announcement state
  const [announcementText, setAnnouncementText] = useState("");
  const [isAnnouncing, setIsAnnouncing] = useState(false);

  // Weather state
  const [weather, setWeather] = useState({
    temp: "--",
    desc: "Loading...",
    city: DEFAULT_CITY,
  });
  const [latitude, setLatitude] = useState(DEFAULT_LATITUDE);
  const [longitude, setLongitude] = useState(DEFAULT_LONGITUDE);
  const [cityName, setCityName] = useState(DEFAULT_CITY);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Color state for each section
  const [colors, setColors] = useState({
    message: { r: 0, g: 255, b: 0 }, // Green
    time: { r: 0, g: 255, b: 255 }, // Cyan
    weather: { r: 255, g: 165, b: 0 }, // Orange
    weatherDesc: { r: 255, g: 255, b: 0 }, // Yellow
  });

  // Current time
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Debounce timer for color updates
  const colorDebounceRef = useRef(null);

  // Apply dark mode to body
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // MQTT client reference to avoid stale closure issues
  const mqttClientRef = useRef(null);
  // Flag to track if component is mounted (prevents HMR zombie connections)
  const isMountedRef = useRef(false);

  // Connect to MQTT broker
  const connectMQTT = useCallback(() => {
    // Don't connect if unmounted
    if (!isMountedRef.current) {
      console.log("Component unmounted, skipping MQTT connection");
      return;
    }

    console.log("Connecting to MQTT broker:", brokerUrl);
    setConnected(false);

    // Clean up existing client first
    if (mqttClientRef.current) {
      try {
        mqttClientRef.current.removeAllListeners();
        mqttClientRef.current.end(true);
      } catch (e) {
        console.log("Error closing old client:", e);
      }
      mqttClientRef.current = null;
      setMqttClient(null);
    }

    try {
      const client = mqtt.connect(brokerUrl, {
        clientId: "hub75_dashboard_" + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 0, // Disable auto-reconnect, we'll handle it manually
        connectTimeout: 10000,
        keepalive: 60,
        resubscribe: false,
      });

      mqttClientRef.current = client;

      client.on("connect", () => {
        // Check if still mounted before updating state
        if (!isMountedRef.current) {
          client.end(true);
          return;
        }
        console.log("Connected to MQTT broker");
        setConnected(true);
        setMqttClient(client);

        // Subscribe to status topic
        client.subscribe(TOPICS.status, (err) => {
          if (err) {
            console.error("Subscribe error:", err);
          } else {
            console.log("Subscribed to status topic");
          }
        });
      });

      client.on("error", (err) => {
        // Only log if not a normal close
        if (isMountedRef.current) {
          console.error("MQTT error:", err);
        }
      });

      client.on("offline", () => {
        if (isMountedRef.current) {
          console.log("MQTT offline");
          setConnected(false);
        }
      });

      client.on("close", () => {
        if (isMountedRef.current) {
          console.log("MQTT connection closed");
          setConnected(false);
        }
      });

      client.on("message", (topic, message) => {
        console.log("Received:", topic, message.toString());
      });
    } catch (err) {
      console.error("Failed to create MQTT client:", err);
      setConnected(false);
    }
  }, [brokerUrl]);

  // Force reconnect function
  const forceReconnect = useCallback(() => {
    console.log("Force reconnecting...");

    // Clean up existing connection
    if (mqttClientRef.current) {
      try {
        mqttClientRef.current.removeAllListeners();
        mqttClientRef.current.end(true);
      } catch (e) {
        console.log("Error during force disconnect:", e);
      }
      mqttClientRef.current = null;
      setMqttClient(null);
    }

    setConnected(false);

    // Wait a moment then reconnect
    setTimeout(() => {
      if (isMountedRef.current) {
        connectMQTT();
      }
    }, 500);
  }, [connectMQTT]);

  // Restart ESP32 function
  const restartESP32 = useCallback(
    (type) => {
      if (mqttClientRef.current && connected) {
        mqttClientRef.current.publish(TOPICS.restart, type);
        console.log("Sent restart command:", type);
      }
    },
    [connected],
  );

  // Auto-connect on mount and cleanup on unmount
  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        connectMQTT();
      }
    }, 100);

    return () => {
      // Mark as unmounted first to prevent reconnection attempts
      isMountedRef.current = false;
      clearTimeout(timer);

      if (mqttClientRef.current) {
        try {
          mqttClientRef.current.removeAllListeners();
          mqttClientRef.current.end(true);
        } catch (e) {
          // Ignore cleanup errors
        }
        mqttClientRef.current = null;
      }
    };
  }, []);

  // Fetch weather when MQTT connects (and every 10 minutes)
  useEffect(() => {
    if (connected && mqttClient) {
      // Fetch weather immediately when connected
      fetchWeather();
      // Auto-refresh weather every 10 minutes
      const weatherTimer = setInterval(fetchWeather, 600000);
      return () => clearInterval(weatherTimer);
    }
  }, [connected, mqttClient]);

  // Publish brightness
  const publishBrightness = (value) => {
    setBrightness(value);
    if (mqttClient && connected) {
      mqttClient.publish(TOPICS.brightness, value.toString());
      console.log("Published brightness:", value);
    }
  };

  // Publish message
  const publishMessage = () => {
    setCustomMessage(messageInput);
    if (mqttClient && connected) {
      mqttClient.publish(TOPICS.message, messageInput);
      console.log("Published message:", messageInput);
    }
  };

  // Publish scroll speed
  const publishScrollSpeed = (value) => {
    setScrollSpeed(value);
    if (mqttClient && connected) {
      mqttClient.publish(TOPICS.speed, value.toString());
      console.log("Published scroll speed:", value);
    }
  };

  // Publish announcement
  const publishAnnouncement = () => {
    if (!announcementText || announcementText.trim() === "") {
      alert("Please enter announcement text!");
      return;
    }

    if (mqttClient && connected) {
      setIsAnnouncing(true);
      mqttClient.publish(TOPICS.announceText, announcementText);
      console.log("Published announcement:", announcementText);

      // Reset announcing state after 5 seconds
      setTimeout(() => {
        setIsAnnouncing(false);
      }, 5000);
    } else {
      alert("Not connected to MQTT broker!");
    }
  };

  // Fetch weather from Open-Meteo API (FREE - No API key needed!)
  const fetchWeather = async () => {
    setWeatherLoading(true);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=Asia/Kolkata`,
      );

      if (!response.ok) throw new Error("Weather fetch failed");

      const data = await response.json();

      const weatherCode = data.current_weather.weathercode;
      const weatherData = {
        temp: Math.round(data.current_weather.temperature).toString(),
        desc: weatherCodes[weatherCode] || "Unknown",
        city: cityName,
      };

      setWeather(weatherData);

      // Publish to ESP32
      if (mqttClient && connected) {
        mqttClient.publish(TOPICS.weather, JSON.stringify(weatherData));
        console.log("Published weather:", weatherData);
      }
    } catch (error) {
      console.error("Weather fetch error:", error);
    } finally {
      setWeatherLoading(false);
    }
  };

  // Quick message buttons
  const quickMessages = [
    "Hello!",
    "Welcome",
    "Open",
    "Closed",
    "Happy Day!",
    "Meeting...",
  ];

  // Publish color settings
  const publishColors = (newColors) => {
    setColors(newColors);
    const colorPayload = JSON.stringify(newColors);
    console.log("=== PUBLISH PRESET COLORS ===");
    console.log("Connected:", connected);
    console.log("Payload:", colorPayload);

    if (mqttClient && connected) {
      mqttClient.publish(
        TOPICS.color,
        colorPayload,
        { qos: 0, retain: false },
        (err) => {
          if (err) {
            console.error("Publish error:", err);
          } else {
            console.log("Preset colors published successfully!");
          }
        },
      );
    } else {
      console.error("Cannot publish: MQTT not connected");
    }
  };

  // Update a single color section (local state only)
  const updateColor = (section, component, value) => {
    setColors((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [component]: parseInt(value),
      },
    }));
  };

  // Apply all colors to ESP32
  const applyColors = () => {
    const colorPayload = JSON.stringify(colors);
    console.log("=== APPLY COLORS ===");
    console.log("Connected:", connected);
    console.log("MQTT Client:", mqttClient ? "exists" : "null");
    console.log("Payload:", colorPayload);

    if (mqttClient && connected) {
      mqttClient.publish(
        TOPICS.color,
        colorPayload,
        { qos: 0, retain: false },
        (err) => {
          if (err) {
            console.error("Publish error:", err);
          } else {
            console.log("Colors published successfully!");
          }
        },
      );
    } else {
      console.error("Cannot publish: MQTT not connected");
      alert("MQTT not connected! Check connection status.");
    }
  };

  // Preset color themes
  const colorPresets = {
    default: {
      message: { r: 0, g: 255, b: 0 },
      time: { r: 0, g: 255, b: 255 },
      weather: { r: 255, g: 165, b: 0 },
      weatherDesc: { r: 255, g: 255, b: 0 },
    },
    cool: {
      message: { r: 0, g: 150, b: 255 },
      time: { r: 100, g: 200, b: 255 },
      weather: { r: 0, g: 200, b: 200 },
      weatherDesc: { r: 150, g: 255, b: 255 },
    },
    warm: {
      message: { r: 255, g: 100, b: 0 },
      time: { r: 255, g: 200, b: 100 },
      weather: { r: 255, g: 50, b: 50 },
      weatherDesc: { r: 255, g: 150, b: 0 },
    },
    neon: {
      message: { r: 255, g: 0, b: 255 },
      time: { r: 0, g: 255, b: 100 },
      weather: { r: 255, g: 255, b: 0 },
      weatherDesc: { r: 0, g: 255, b: 255 },
    },
  };

  return (
    <div className={`dashboard ${darkMode ? "dark" : ""}`}>
      {/* Header */}
      <header className="header">
        <h1>LED Matrix Control</h1>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <div
            className={`status-badge ${
              connected ? "connected" : "disconnected"
            }`}
          >
            <span className="status-dot"></span>
            {connected ? "Connected" : "Disconnected"}
          </div>
        </div>
      </header>

      {/* Display Preview */}
      <div className="display-preview">
        <div className="preview-title">Live Preview</div>
        <div className="preview-screen">
          <div className="preview-section message">{customMessage}</div>
          <div className="preview-divider"></div>
          <div className="preview-section time">
            {currentTime.toLocaleTimeString()}
          </div>
          <div className="preview-divider"></div>
          <div className="preview-section weather">
            {weather.temp}°C · {weather.desc}
          </div>
        </div>
      </div>

      {/* Control Cards */}
      <div className="cards-grid">
        {/* Brightness Control */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon brightness">☀</div>
            <div className="card-title">Brightness</div>
          </div>

          <div className="slider-container">
            <div className="slider-label">
              <span>Level</span>
              <span className="slider-value">
                {Math.round(brightness / 2.55)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={brightness}
              onChange={(e) => publishBrightness(parseInt(e.target.value))}
            />
          </div>

          <div className="quick-actions">
            <button className="quick-btn" onClick={() => publishBrightness(25)}>
              Low
            </button>
            <button className="quick-btn" onClick={() => publishBrightness(90)}>
              Med
            </button>
            <button
              className="quick-btn"
              onClick={() => publishBrightness(180)}
            >
              High
            </button>
            <button
              className="quick-btn"
              onClick={() => publishBrightness(255)}
            >
              Max
            </button>
          </div>
        </div>

        {/* Scroll Speed Control */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon speed">⏱</div>
            <div className="card-title">Scroll Speed</div>
          </div>

          <div className="slider-container">
            <div className="slider-label">
              <span>Speed</span>
              <span className="slider-value">
                {scrollSpeed <= 50
                  ? "Fast"
                  : scrollSpeed <= 100
                    ? "Medium-Fast"
                    : scrollSpeed <= 200
                      ? "Medium"
                      : scrollSpeed <= 350
                        ? "Slow"
                        : "Very Slow"}
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="500"
              value={scrollSpeed}
              onChange={(e) => publishScrollSpeed(parseInt(e.target.value))}
            />
          </div>

          <div className="quick-actions">
            <button
              className="quick-btn"
              onClick={() => publishScrollSpeed(50)}
            >
              Fast
            </button>
            <button
              className="quick-btn"
              onClick={() => publishScrollSpeed(100)}
            >
              Medium
            </button>
            <button
              className="quick-btn"
              onClick={() => publishScrollSpeed(200)}
            >
              Slow
            </button>
            <button
              className="quick-btn"
              onClick={() => publishScrollSpeed(400)}
            >
              Very Slow
            </button>
          </div>

          <div
            className="help-text"
            style={{ marginTop: "8px", fontSize: "11px", opacity: 0.7 }}
          >
            Lower values = faster scrolling
          </div>
        </div>

        {/* Custom Message */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon message">✎</div>
            <div className="card-title">Message</div>
          </div>

          <div className="input-group">
            <label>Display Text</label>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Enter message..."
              maxLength={50}
              onKeyPress={(e) => e.key === "Enter" && publishMessage()}
            />
          </div>

          <button className="btn btn-primary" onClick={publishMessage}>
            Send
          </button>

          <div className="quick-actions" style={{ marginTop: "12px" }}>
            {quickMessages.map((msg) => (
              <button
                key={msg}
                className="quick-btn"
                onClick={() => {
                  setMessageInput(msg);
                  setCustomMessage(msg);
                  if (mqttClient && connected) {
                    mqttClient.publish(TOPICS.message, msg);
                  }
                }}
              >
                {msg}
              </button>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon announce">🔊</div>
            <div className="card-title">Announcements</div>
          </div>

          <div className="input-group">
            <label>Announcement Text</label>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Type your announcement message here..."
              rows={3}
              maxLength={200}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  publishAnnouncement();
                }
              }}
            />
            <div style={{ fontSize: "11px", opacity: 0.6, marginTop: "4px" }}>
              {announcementText.length}/200 characters
            </div>
          </div>

          <button
            className={`btn ${isAnnouncing ? "btn-success" : "btn-primary"}`}
            onClick={publishAnnouncement}
            disabled={isAnnouncing || !connected}
          >
            {isAnnouncing ? "📢 Announcing..." : "🔊 Announce"}
          </button>

          <div
            className="help-text"
            style={{ marginTop: "12px", fontSize: "12px" }}
          >
            ℹ️ Make sure TTS server is running:{" "}
            <code>python tts_server.py</code>
          </div>

          <div className="quick-actions" style={{ marginTop: "12px" }}>
            <button
              className="quick-btn"
              onClick={() => setAnnouncementText("Attention please")}
            >
              Attention
            </button>
            <button
              className="quick-btn"
              onClick={() => setAnnouncementText("Meeting in 5 minutes")}
            >
              Meeting
            </button>
            <button
              className="quick-btn"
              onClick={() => setAnnouncementText("Lunch break")}
            >
              Lunch
            </button>
            <button
              className="quick-btn"
              onClick={() => setAnnouncementText("Emergency alert")}
            >
              Emergency
            </button>
          </div>
        </div>

        {/* Weather */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon weather">☁</div>
            <div className="card-title">Weather</div>
          </div>

          <div className="weather-display">
            <div className="weather-temp">{weather.temp}°</div>
            <div className="weather-info">
              <div className="weather-desc">{weather.desc}</div>
              <div className="weather-city">{weather.city}</div>
            </div>
          </div>

          <div className="input-group">
            <label>Location</label>
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="City name"
            />
          </div>

          <div className="coords-grid">
            <div className="input-group">
              <label>Latitude</label>
              <input
                type="number"
                step="0.001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                placeholder="31.375"
              />
            </div>
            <div className="input-group">
              <label>Longitude</label>
              <input
                type="number"
                step="0.001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                placeholder="75.625"
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={fetchWeather}
            disabled={weatherLoading}
          >
            {weatherLoading ? (
              <>
                <span className="loading-spinner"></span>
                Updating...
              </>
            ) : (
              "Update Weather"
            )}
          </button>

          <div className="help-text">
            <a href="https://www.latlong.net/" target="_blank" rel="noreferrer">
              Find coordinates →
            </a>
          </div>
        </div>

        {/* Connection Settings */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon settings">⚡</div>
            <div className="card-title">Connection</div>
          </div>

          <div className="connection-settings">
            <div className="input-group">
              <label>Broker URL</label>
              <input
                type="text"
                value={brokerUrl}
                onChange={(e) => setBrokerUrl(e.target.value)}
                placeholder="ws://localhost:9001"
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={forceReconnect}
              style={{ marginBottom: "8px" }}
            >
              🔄 Reconnect Dashboard
            </button>
          </div>

          <div className="connection-info">
            <p>Status: {connected ? "✅ Connected" : "❌ Disconnected"}</p>
          </div>

          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid #e5e5e7",
            }}
          >
            <label
              style={{
                fontSize: "0.875rem",
                color: "#86868b",
                marginBottom: "8px",
                display: "block",
              }}
            >
              ESP32 Controls
            </label>
            <div className="quick-actions">
              <button
                className="quick-btn"
                onClick={() => restartESP32("mqtt")}
                disabled={!connected}
                title="Restart ESP32 MQTT connection"
              >
                MQTT
              </button>
              <button
                className="quick-btn"
                onClick={() => restartESP32("wifi")}
                disabled={!connected}
                title="Restart ESP32 WiFi + MQTT"
              >
                WiFi
              </button>
              <button
                className="quick-btn"
                onClick={() => restartESP32("reboot")}
                disabled={!connected}
                title="Full ESP32 reboot"
                style={{
                  background: connected ? "#ffebee" : undefined,
                  color: connected ? "#c62828" : undefined,
                }}
              >
                Reboot
              </button>
            </div>
          </div>
        </div>

        {/* Color Control */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon color">◐</div>
            <div className="card-title">Colors</div>
          </div>

          <div className="theme-section">
            <label>Themes</label>
            <div className="quick-actions">
              <button
                className="quick-btn"
                onClick={() => publishColors(colorPresets.default)}
              >
                Default
              </button>
              <button
                className="quick-btn"
                onClick={() => publishColors(colorPresets.cool)}
              >
                Cool
              </button>
              <button
                className="quick-btn"
                onClick={() => publishColors(colorPresets.warm)}
              >
                Warm
              </button>
              <button
                className="quick-btn"
                onClick={() => publishColors(colorPresets.neon)}
              >
                Neon
              </button>
            </div>
          </div>

          {/* Message Color */}
          <div className="color-section">
            <div className="color-label">
              <span
                className="color-preview"
                style={{
                  background: `rgb(${colors.message.r},${colors.message.g},${colors.message.b})`,
                }}
              ></span>
              Message
            </div>
            <div className="color-sliders">
              <input
                type="range"
                min="0"
                max="255"
                value={colors.message.r}
                onChange={(e) => updateColor("message", "r", e.target.value)}
                className="slider-r"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={colors.message.g}
                onChange={(e) => updateColor("message", "g", e.target.value)}
                className="slider-g"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={colors.message.b}
                onChange={(e) => updateColor("message", "b", e.target.value)}
                className="slider-b"
              />
            </div>
            <button className="apply-btn" onClick={applyColors}>
              Apply
            </button>
          </div>

          {/* Time Color */}
          <div className="color-section">
            <div className="color-label">
              <span
                className="color-preview"
                style={{
                  background: `rgb(${colors.time.r},${colors.time.g},${colors.time.b})`,
                }}
              ></span>
              Time
            </div>
            <div className="color-sliders">
              <input
                type="range"
                min="0"
                max="255"
                value={colors.time.r}
                onChange={(e) => updateColor("time", "r", e.target.value)}
                className="slider-r"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={colors.time.g}
                onChange={(e) => updateColor("time", "g", e.target.value)}
                className="slider-g"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={colors.time.b}
                onChange={(e) => updateColor("time", "b", e.target.value)}
                className="slider-b"
              />
            </div>
            <button className="apply-btn" onClick={applyColors}>
              Apply
            </button>
          </div>

          {/* Weather Temp Color */}
          <div className="color-section">
            <div className="color-label">
              <span
                className="color-preview"
                style={{
                  background: `rgb(${colors.weather.r},${colors.weather.g},${colors.weather.b})`,
                }}
              ></span>
              Temperature
            </div>
            <div className="color-sliders">
              <input
                type="range"
                min="0"
                max="255"
                value={colors.weather.r}
                onChange={(e) => updateColor("weather", "r", e.target.value)}
                className="slider-r"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={colors.weather.g}
                onChange={(e) => updateColor("weather", "g", e.target.value)}
                className="slider-g"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={colors.weather.b}
                onChange={(e) => updateColor("weather", "b", e.target.value)}
                className="slider-b"
              />
            </div>
            <button className="apply-btn" onClick={applyColors}>
              Apply
            </button>
          </div>

          {/* Weather Desc Color */}
          <div className="color-section">
            <div className="color-label">
              <span
                className="color-preview"
                style={{
                  background: `rgb(${colors.weatherDesc.r},${colors.weatherDesc.g},${colors.weatherDesc.b})`,
                }}
              ></span>
              Weather
            </div>
            <div className="color-sliders">
              <input
                type="range"
                min="0"
                max="255"
                value={colors.weatherDesc.r}
                onChange={(e) =>
                  updateColor("weatherDesc", "r", e.target.value)
                }
                className="slider-r"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={colors.weatherDesc.g}
                onChange={(e) =>
                  updateColor("weatherDesc", "g", e.target.value)
                }
                className="slider-g"
              />
              <input
                type="range"
                min="0"
                max="255"
                value={colors.weatherDesc.b}
                onChange={(e) =>
                  updateColor("weatherDesc", "b", e.target.value)
                }
                className="slider-b"
              />
            </div>
            <button className="apply-btn" onClick={applyColors}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
