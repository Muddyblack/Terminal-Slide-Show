export const frontendConfig = {
    info: {
        location: "Friedrichshafen", // Location setting for geolocation services
    },
    slideshow: {
        watchInterval: 1000, // Interval for watching media files in downloadPath in milliseconds
        defaultSlideDuration: 10000, // Default slide duration in milliseconds
        controlsInterval: 3000, // Interval for showing/hiding controls in milliseconds
    },
    polling: {
        serverStatusInterval: 1000, // Interval for polling server status in milliseconds
    },
    schedule: {
        enabled: true, // Enable or disable the schedule feature
        onTime: '07:35', // Time to turn on the slideshow (24-hour format)
        offTime: '19:30', // Time to turn off the slideshow (24-hour format)
        days: [1, 2, 3, 4, 5], // Days to run the slideshow (1 for Monday, ..., 7 for Sunday)
        vacationPeriods: [
            { start: '24.06.2024', end: '24.07.2024' }, // Example vacation period
        ],
    },
    mediaTypes: {
        imageTypes: ['.jpg', '.jpeg', '.png', '.gif'], // Supported image types
        videoTypes: ['.mp4', '.webm', '.ogg'], // Supported video types
        loop: false, // Loop media files
        autoplay: true, // Autoplay media files
        muted: true // Mute media files
    },
    websocket: {
        heartbeatInterval: 30000, // Enable or disable the WebSocket server
        reconnectInterval: 5000, // Interval for reconnecting WebSocket clients in milliseconds
        maxReconnectAttempts: 5, // Maximum number of reconnect attempts
        path: '/ws', // WebSocket path
    },
};
