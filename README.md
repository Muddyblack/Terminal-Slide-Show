# Terminal Slide Show

A modern, full-featured digital signage solution built with React and Node.js that automatically synchronizes and displays media content from Google Drive. Perfect for information displays, digital signage, and automated presentations.

## Features

- 🖼️ Seamless display of images and videos from Google Drive
- ⚡ Real-time updates via WebSocket connections
- 📦 Intelligent caching system for optimal performance
- 🔄 Automatic content synchronization with change detection
- 📅 Advanced scheduling with vacation periods and daily time windows
- ⌚ Configurable display times and operating days
- 🎯 Date-based content targeting through filename parsing
- 📱 Touch and swipe support for navigation
- 🖥️ Full kiosk mode support
- 🎨 Smooth transitions and animations
- 🌅 Dynamic day/night mode transitions
- 🌡️ Live weather updates and animations
- 🚀 NASA Astronomy Picture of the Day integration
- 📊 Health monitoring and automatic recovery
- 🔒 Secure operation with minimal dependencies

## Real-Time Updates

The application uses WebSocket connections to provide real-time updates:
- Instant content updates when files change in Google Drive
- Live schedule status synchronization
- Immediate system health notifications
- Automatic reconnection handling
- Reduced server load compared to polling

## Caching System

Multi-level caching strategy for optimal performance:
- **Browser Cache**: 
  - Media files cached with appropriate headers
  - Conditional requests using ETags
  - Cache invalidation on content updates

- **Server-Side Cache**:
  - Efficient media file storage
  - Metadata caching for quick access
  - Automatic cache cleanup

## Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v8.0.0 or higher)
- A Google Cloud Platform account
- For kiosk mode: Debian-based Linux system (e.g., Raspberry Pi OS)
- WebSocket-capable browser

## Project Structure

```
terminal-slide-show/
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── slideshow/      # Slideshow components
│   │   │   └── dynamic_daily_view/  # Dynamic view components
│   │   ├── hooks/        # Custom React hooks
│   │   │   └── useWebSocket.js # WebSocket connection hook
│   │   ├── utils/        # Utility functions
│   │   └── styles/       # CSS stylesheets
├── server/                # Backend application
│   ├── config/               # Configuration files
│   │   ├── config.js        # Main configuration
│   │   └── frontend.config.js # Frontend-specific config
│   ├── src/
│   │   ├── services/     # Core services
│   │   │   ├── websocket/     # WebSocket server
│   │   │   └── cache/         # Caching service
│   │   └── utils/        # Utility functions
│   └── data/             # Local data (quotes, facts)
├── scripts/             # Shell scripts
└── downloads/           # Local media storage
```

## Setup Instructions

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/asta-dhbw/Terminal-Slide-Show.git
cd terminal-slide-show

# Install dependencies
npm install

# Create necessary directories
mkdir -p downloads logs cache

# Create configuration files
cp server/config/config.example.js server/config/config.js
cp server/config/.env.example server/config/.env
```

### 2. Google Drive Authentication
You have two options for authenticating with Google Drive:
#### Option A: Using API Key (Simpler, for personal use)
1. Create a new project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Drive API
3. Create API credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
4. Add the API key to `config.js`:
   ```javascript
   google: {
     useServiceAccount: false,
     apiKey: 'YOUR_API_KEY',
     folderId: 'YOUR_FOLDER_ID'
   }
   ```
5. Make your Google Drive folder publicly accessible (with link)
#### Option B: Using Service Account (More secure, recommended for production)
1. Create a new project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Drive API
3. Create a Service Account:
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Grant the role "Drive File Viewer" or necessary permissions
   - Create and download JSON key
4. Place the downloaded JSON key in `server/config/service-account.json`
5. Share your Google Drive folder with the service account email
6. Configure `config.js`:
   ```javascript
   google: {
     useServiceAccount: true,
     serviceAccountPath: './config/service-account.json',
     folderId: 'YOUR_FOLDER_ID'
   }
   ```

### 3. Cache Configuration

Configure caching behavior in `config.js`:

```javascript
cache: {
  // Browser cache settings
  browser: {
    maxAge: 86400,        // Cache lifetime in seconds
    revalidate: true,     // Enable revalidation
    etags: true           // Enable ETag support
  },
  // Server cache settings
  server: {
    mediaCache: {
      maxSize: '1GB',     // Maximum cache size
      cleanupInterval: '1h' // Cache cleanup interval
    },
    metadataCache: {
      ttl: 300,           // Time-to-live in seconds
      checkPeriod: 600    // Cleanup check interval
    }
  }
}
```

### 4. WebSocket Configuration

Configure WebSocket behavior in `config.js`:

```javascript
websocket: {
  // WebSocket server settings
  server: {
    port: 3001,
    heartbeat: 30000,     // Heartbeat interval
    reconnectTimeout: 5000 // Client reconnection timeout
  },
  // Client settings
  client: {
    reconnectAttempts: 5,
    reconnectInterval: 1000,
    messageTimeout: 5000
  }
}
```

## File Naming Convention
Files in Google Drive should follow this naming pattern to enable scheduling:
- Single date: `filename_DD-MM-YYYY.ext`
- Date range: `filename_DD-MM-YYYY@DD-MM-YYYY.ext`
- Short format: `filename_DD-MM@DD-MM.ext`
- Custom duration: `filename_Xs.ext` (where X is duration in seconds)

It is possible to also use just `YY` and use any of these separators: `-._`
You can combine both date and duration patterns:
Examples:
```
banner_01-01-2024@31-01-2024.jpg  # Show in January 2024
notice_15-03.jpg                  # Show on March 15th (any year)
event_01-06@15-06.jpg            # Show June 1-15 (any year)

image_5s_25-12-2024.jpg    ✅ (works)
image_10s_.jpg             ✅ (works)
image5s_25-12-2024.jpg     ❌ (won't work - missing leading _)
image_5s25-12-2024.jpg     ❌ (won't work - missing trailing _)
```

## Scheduling

Configure display times in `config.js`:

```javascript
schedule: {
  enabled: true,
  onTime: '06:30',      // Display start time
  offTime: '20:00',     // Display end time
  days: [1, 2, 3, 4, 5], // Monday to Friday
  vacationPeriods: [    // Optional vacation periods
    { start: '24.06.2024', end: '24.07.2024' }
  ]

}
```

## WebSocket Events

The application supports the following WebSocket events:

```javascript
// Client-side subscription
ws.subscribe('media-update', (data) => {
  // Handle media updates
});

ws.subscribe('schedule-update', (data) => {
  // Handle schedule changes
});

ws.subscribe('system-health', (data) => {
  // Handle system health updates
});
```

## Cache Headers

The application sets appropriate cache headers for different types of content:

```javascript
// Example cache headers for media files
{
  'Cache-Control': 'public, max-age=86400',
  'ETag': true,
  'Last-Modified': timestamp
}

// Example cache headers for dynamic content
{
  'Cache-Control': 'no-cache, must-revalidate',
  'ETag': true
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.