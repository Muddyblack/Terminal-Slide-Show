#!/bin/bash
#
# Terminal Slideshow Manager
# Manages a fullscreen slideshow with MPV player, including scheduling and network checks
# Features automatic display management, file monitoring, and backend health checks
#
# Author: Muddyblack
# Date: 11.11.2024
# Version: 1.0

# -----------------------------------------------------------------------------
# Dependencies and initialization
# -----------------------------------------------------------------------------

source "$(dirname "${BASH_SOURCE[0]}")/project-utils.sh" || {
    echo "Failed to source project-utils.sh" >&2
    exit 1
}

# Cleanup processes on exit
cleanup() {
    log_info "Cleaning up..."
    if [ -n "$MPV_PID" ]; then
        kill $MPV_PID 2>/dev/null
    fi
    rm -f "$MPV_SOCKET"
    pkill -f "npm run dev:backend"
    pkill -f "monitor_backend"
    pkill -f "inotifywait"
    tput cnorm
    exit 0
}

# -----------------------------------------------------------------------------
# Configuration management
# -----------------------------------------------------------------------------

# Parse JavaScript config file using Node.js
# Handles schedule, network, and path configurations
parse_config() {
    # Use node to parse the JavaScript config file and extract needed values using dynamic import
    local config_values
    config_values=$(node --input-type=module -e "
        import { createRequire } from 'module';
        const require = createRequire(import.meta.url);
        const path = require('path');
        const configPath = path.resolve('${CONFIG_FILE}');
        
        import(configPath)
            .then(module => {
                const config = module.config;
                // Ensure date formats are standardized
                const formatDate = (date) => {
                    if (!date) return '';
                    return date.replace(/\./g, '-');
                };
                
                // Format vacation periods
                const vacationPeriods = config.schedule.vacationPeriods.map(period => ({
                    start: formatDate(period.start),
                    end: formatDate(period.end)
                }));

                console.log(JSON.stringify({
                    schedule_enabled: Boolean(config.schedule.enabled),
                    on_time: config.schedule.onTime,
                    off_time: config.schedule.offTime,
                    days: Array.isArray(config.schedule.days) ? config.schedule.days : [],
                    backend_port: Number(config.backend.port),
                    backend_host: String(config.backend.host),
                    vacation_periods: config.schedule.vacationPeriods,
                    paths_downloadPath: String(config.paths.downloadPath)
                }, null, 2));
            })
            .catch(error => {
                console.error('Error loading config:', error);
                process.exit(1);
            });
    ")
    
    if [ $? -ne 0 ]; then
        log_error "Failed to parse config file"
        exit 1
    fi
    
    # Parse JSON output into variables
    if [ -n "$config_values" ]; then
        SCHEDULE_ENABLED=$(echo "$config_values" | jq -r '.schedule_enabled // false')
        ON_TIME=$(echo "$config_values" | jq -r '.on_time // "'"$DEFAULT_ON_TIME"'"')
        OFF_TIME=$(echo "$config_values" | jq -r '.off_time // "'"$DEFAULT_OFF_TIME"'"')
        ALLOWED_DAYS=$(echo "$config_values" | jq -r '.days[]')
        BACKEND_PORT=$(echo "$config_values" | jq -r '.backend_port // "3000"')
        BACKEND_HOST=$(echo "$config_values" | jq -r '.backend_host // "127.0.0.1"')
        VACATION_PERIODS=$(echo "$config_values" | jq -r '.vacation_periods // []')
        DOWNLOAD_PATH=$(echo "$config_values" | jq -r '.paths_downloadPath // "'"$DEFAULT_DOWNLOAD_PATH"'"')
    else
        log_error "No config values returned"
        # Set default values
        SCHEDULE_ENABLED=true
        ON_TIME="$DEFAULT_ON_TIME"
        OFF_TIME="$DEFAULT_OFF_TIME"
        ALLOWED_DAYS="1 2 3 4 5"
        BACKEND_PORT=3000
        BACKEND_HOST="127.0.0.1"
        VACATION_PERIODS="[]"
        DOWNLOAD_PATH="$DEFAULT_DOWNLOAD_PATH"
    fi
    
    log_info "Configuration loaded: Schedule enabled: $SCHEDULE_ENABLED, On time: $ON_TIME, Off time: $OFF_TIME, download path: $DOWNLOAD_PATH"
}

# -----------------------------------------------------------------------------
# Schedule management
# -----------------------------------------------------------------------------

# Check if current date falls within configured vacation periods
is_vacation_period() {
    local current_date=$(date +%Y-%m-%d)
    
    if [ "$VACATION_PERIODS" = "[]" ] || [ -z "$VACATION_PERIODS" ]; then
        return 1
    fi
    
    echo "$VACATION_PERIODS" | jq -r '.[] | "\(.start) \(.end)"' | while IFS=' ' read -r start_date end_date; do
        # Convert dates to standard format
        start_date=$(date -d "${start_date//./-}" +%Y-%m-%d 2>/dev/null)
        end_date=$(date -d "${end_date//./-}" +%Y-%m-%d 2>/dev/null)
        
        if [ $? -eq 0 ] && \
           [ "$(date -d "$current_date" +%s)" -ge "$(date -d "$start_date" +%s)" ] && \
           [ "$(date -d "$current_date" +%s)" -le "$(date -d "$end_date" +%s)" ]; then
            return 0
        fi
    done
    return 1
}

# Determine if system should be operating based on schedule
is_operating_hours() {
    # Check if schedule is enabled
    if [ "$SCHEDULE_ENABLED" != "true" ]; then
        return 0
    fi
    
    # Check if current day is in allowed days
    local current_day
    current_day=$(date +%u)
    log_debug "Allowed days" $ALLOWED_DAYS "Current day" $current_day
    if echo "$ALLOWED_DAYS" | grep -q "^${current_day}$"; then
        log_debug "Current day is allowed"
    else
        log_debug "Current day is not allowed"
        return 1
    fi
    
    # Check if in vacation period
    if is_vacation_period; then
        log_debug "Currently in vacation period"
        return 1
    fi
    
    # Convert times to minutes since midnight for easier comparison
    local current_time=$(date +%H:%M)
    local current_minutes=$((10#$(date -d "$current_time" +%H) * 60 + 10#$(date -d "$current_time" +%M)))
    local on_minutes=$((10#$(date -d "$ON_TIME" +%H) * 60 + 10#$(date -d "$ON_TIME" +%M)))
    local off_minutes=$((10#$(date -d "$OFF_TIME" +%H) * 60 + 10#$(date -d "$OFF_TIME" +%M)))
    
    log_debug "Minutes since midnight - Current: $current_minutes, On: $on_minutes, Off: $off_minutes"
    
    if [ $current_minutes -ge $on_minutes ] && [ $current_minutes -lt $off_minutes ]; then
        return 0
    else
        log_info "Outside operating hours"
        return 1
    fi
}

# Monitor and manage display state based on schedule
check_display_state() {
    # Do initial state check and MPV start
    if is_operating_hours; then
        log_info "Within operating hours - starting with images"
        CURRENT_STATE="on"
        start_mpv
    else
        log_info "Outside operating hours - starting with black screen"
        CURRENT_STATE="off"
        start_mpv_black
    fi

    # Then continue with periodic checks
    while true; do
        if is_operating_hours; then
            if [ "$CURRENT_STATE" = "off" ]; then
                log_info "Entering operating hours - starting slideshow"
                CURRENT_STATE="on"
                if [ -n "$MPV_PID" ]; then
                    kill $MPV_PID 2>/dev/null
                fi
                start_mpv
            fi
        else
            if [ "$CURRENT_STATE" = "on" ]; then
                log_info "Outside operating hours - displaying black screen"
                CURRENT_STATE="off"
                if [ -n "$MPV_PID" ]; then
                    kill $MPV_PID 2>/dev/null
                fi
                start_mpv_black
            fi
        fi
        sleep 60
    done
}

# -----------------------------------------------------------------------------
# System dependencies
# -----------------------------------------------------------------------------

# Suggest installation command based on package manager
suggest_install() {
    if command -v apt-get >/dev/null 2>&1; then
        log_info "Install with: apt-get install $1"
    elif command -v pacman >/dev/null 2>&1; then
        log_info "Install with: pacman -S $1"
    else
        log_info "Please install $1 using your system's package manager"
    fi
}

# Verify all required system dependencies are installed
check_dependencies() {
    # Check for required commands
    local required_commands=("mpv" "socat" "inotifywait" "find" "node" "jq" "ffmpeg")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_error "ERROR: Missing required package: $cmd"
            case "$cmd" in
                "mpv")
                    suggest_install "mpv"
                    ;;
                "socat")
                    suggest_install "socat"
                    ;;
                "inotifywait")
                    suggest_install "inotify-tools"
                    ;;
            esac
            exit 1
        fi
    done
}

# -----------------------------------------------------------------------------
# Display management
# -----------------------------------------------------------------------------

# Create black screen SVG for off-hours display
create_black_image() {
    local black_image="${PROJECT_DIR}/black.svg"
    local max_retries=5
    local retry_count=0
    
    # Create a simple black SVG if it doesn't exist
    if [ ! -f "$black_image" ]; then
        # Ensure directory exists
        mkdir -p "$(dirname "$black_image")"
        
        # Create file with atomic write
        cat > "${black_image}.tmp" << 'EOF'
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="black"/>
</svg>
EOF
        mv "${black_image}.tmp" "$black_image"
    fi

    # Verify file exists and is readable
    while [ $retry_count -lt $max_retries ]; do
        if [ -f "$black_image" ] && [ -r "$black_image" ]; then
            log_debug "Black image verified at: $black_image" >/dev/null
            printf "%s" "$black_image"
            return 0
        fi
        log_warn "Waiting for black image to be accessible (attempt $((retry_count + 1)))" >/dev/null
        sleep 1
        retry_count=$((retry_count + 1))
    done

    return 1
}

# Start MPV instance with black screen
start_mpv_black() {
    local black_image
    local max_retries=3
    local retry_count=0
    
    # Kill current MPV if running
    if [ -n "$MPV_PID" ]; then
        kill $MPV_PID 2>/dev/null
        rm -f "$MPV_SOCKET"
        sleep 1  # Increased wait time
    fi

    while [ $retry_count -lt $max_retries ]; do
        black_image=$(create_black_image)
        
        if [ $? -ne 0 ] || [ ! -f "$black_image" ]; then
            log_error "Failed to create black image, retrying..."
            retry_count=$((retry_count + 1))
            sleep 1
            continue
        fi
        
        log_debug "Starting MPV with image: $black_image"
        
        # Start MPV with just the black image
        mpv --input-ipc-server="$MPV_SOCKET" \
            --force-window=yes \
            --fullscreen \
            --no-audio \
            --image-display-duration=inf \
            --loop-file=inf \
            "$black_image" >/dev/null 2>&1 &
            
        MPV_PID=$!
        
        # Wait for process to start
        sleep 1
        
        # Verify MPV process is running
        if kill -0 $MPV_PID 2>/dev/null; then
            log_info "MPV started successfully with black screen"
            return 0
        else
            log_warn "MPV failed to start, retrying..."
            retry_count=$((retry_count + 1))
            sleep 1
        fi
    done

    log_error "Failed to start MPV with black screen after $max_retries attempts"
    return 1
}

# Send commands to MPV through socket with retry logic
send_mpv_command() {
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if [ -S "$MPV_SOCKET" ]; then
            if echo "$1" | socat - "$MPV_SOCKET" 2>/dev/null; then
                return 0
            fi
        fi
        
        log_warn "MPV socket communication failed, attempt $((retry_count + 1))/$max_retries"
        retry_count=$((retry_count + 1))
        
        if [ $retry_count -eq $max_retries ]; then
            log_error "MPV socket communication failed, restarting MPV"
            kill $MPV_PID 2>/dev/null
            start_mpv
            return 1
        fi
        
        sleep 1
    done
}

# -----------------------------------------------------------------------------
# Playlist management
# -----------------------------------------------------------------------------

# Update MPV playlist with current media files
update_playlist() {
    log_info "Updating playlist..."
    
    # Get list of current files
    local files=()
    while IFS= read -r -d '' file; do
        files+=("$file")
    done < <(find "$MEDIA_DIR" -type f -print0)
    
    # If no files exist, show a message or placeholder
    if [ ${#files[@]} -eq 0 ]; then
        log_info "No images found in media directory"
        return
    fi
    
    # Clear current playlist completely
    send_mpv_command '{ "command": ["playlist-clear"] }'
    
    # Add all files one by one
    for file in "${files[@]}"; do
        send_mpv_command "{\"command\":[\"loadfile\",\"$file\",\"append\"]}"
        # Small delay to ensure command is processed
        sleep 0.1
    done
    
    # Force playlist refresh
    send_mpv_command '{ "command": ["playlist-play-index", "0"] }'
}

create_placeholder_image() {
    local placeholder="${MEDIA_DIR}/placeholder.svg"
    
    # Create directory if it doesn't exist
    mkdir -p "$MEDIA_DIR"
    
    # Create a simple placeholder SVG if directory is empty
    cat > "$placeholder" << 'EOF'
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#2d2d2d"/>
    <text x="50%" y="50%" font-family="Arial" font-size="48" fill="white" text-anchor="middle">
        Waiting for content...
    </text>
</svg>
EOF

    echo "$placeholder"
}

# Start MPV instance with media playlist
start_mpv() {
    # Remove socket if it exists
    rm -f "$MPV_SOCKET"
    
    # Base MPV options
    local mpv_opts=(
        --input-ipc-server="$MPV_SOCKET"
        --force-window=yes
        --image-display-duration=5
        --loop-playlist=inf
        --fullscreen
        --no-audio
        --idle=yes
        --reset-on-next-file=all
    )

    # Check if media directory is empty
    if [ -z "$(ls -A "$MEDIA_DIR" 2>/dev/null)" ]; then
        log_info "Media directory empty, creating placeholder"
        local placeholder=$(create_placeholder_image)
        mpv "${mpv_opts[@]}" --image-display-duration=inf --loop-file=inf "$placeholder" &
    else
        mpv "${mpv_opts[@]}" "$MEDIA_DIR"/* &
    fi
    
    MPV_PID=$!
    
    # Wait for socket with timeout
    local max_attempts=50
    local attempts=0
    while [ ! -S "$MPV_SOCKET" ] && [ $attempts -lt $max_attempts ]; do
        sleep 0.1
        attempts=$((attempts + 1))
    done
    
    if [ ! -S "$MPV_SOCKET" ]; then
        log_error "Failed to create MPV socket"
        return 1
    fi
    
    if [ -n "$(ls -A "$MEDIA_DIR" 2>/dev/null)" ]; then
        sleep 1
        update_playlist
    fi
}


# Monitor media directory for changes
monitor_files() {
    local last_change=0
    local debounce_delay=1  # Delay in seconds to group rapid changes
    
    log_info "Starting file monitor..."
    
    while true; do
        inotifywait -q -r -e modify,create,delete,move "$MEDIA_DIR" >/dev/null 2>&1
        
        # Get current timestamp
        current_time=$(date +%s)
        
        # Check if enough time has passed since last update
        if (( current_time - last_change > debounce_delay )); then
            log_info "Detected changes in media directory, updating playlist..."
            # Small delay to ensure filesystem operations are complete
            sleep 0.5
            update_playlist
            last_change=$current_time
        fi
    done
}

# -----------------------------------------------------------------------------
# Backend services
# -----------------------------------------------------------------------------

# Run npm development server
run_npm_commands() {
    log_info "Installing npm dependencies..."
    npm install || {
        log_error "npm install failed"
        exit 1
    }

    log_info "Starting development server..."
    npm run dev:backend & # Run in background
}

# Check backend API health
check_backend_health() {
    local endpoint="http://127.0.0.1:3000/api/server-status"
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
    echo "Status code: $status_code"
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        return 0
    fi
    return 1
}

# Monitor backend health periodically
monitor_backend() {
    while true; do
        if ! check_backend_health; then
            log_error "Backend health check failed"
        else
            log_info "Backend health check passed"
        fi
        sleep 30
    done
}

# -----------------------------------------------------------------------------
# Main execution
# -----------------------------------------------------------------------------

main() {
    # Configuration
    local mpv_socket="/tmp/mpv-socket"
    local mpv_pid=""
    local config_file
    local current_state="off"
    local default_on_time="07:30"
    local default_off_time="20:00" 
    local default_media_path="./downloads"
    local media_dir
    local project_dir="$(find_project_dir)"
    local scrip_dir="$(get_script_dir)"

    config_file="${project_dir}/server/config/config.js"
    media_dir="${project_dir}/${default_media_path}"

    # Export needed variables for child processes
    export MPV_SOCKET="$mpv_socket"
    export MPV_PID="$mpv_pid"
    export CURRENT_STATE="$current_state"
    export CONFIG_FILE="$config_file"
    export PROJECT_DIR="$project_dir"
    export MEDIA_DIR="$media_dir"
    export DEFAULT_ON_TIME="$default_on_time"
    export DEFAULT_OFF_TIME="$default_off_time"
    export DEFAULT_DOWNLOAD_PATH="$default_media_path" 

    init_project_logging "terminal_slideshow"
    parse_config
    MEDIA_DIR="${project_dir}/${DOWNLOAD_PATH}"
    

    # Run network manager and capture status
    # "$scrip_dir/network-manager.sh"
    # network_status=$?
    # if [ $network_status -ne 0 ]; then
    #     log_error "Network setup failed with status $network_status"
    #     exit 1
    # fi
    log_info "Network setup completed successfully"
    log_info "Starting kiosk mode..."
    check_dependencies
    
    # Create required directories
    mkdir -p "$MEDIA_DIR" "$LOG_DIR"
    
    # Set up signal handlers
    setup_signal_traps "cleanup" 0
    
    # Run npm commands before slideshow
    run_npm_commands
    
    # Start backend monitor
    monitor_backend &

        # Start file monitor
    monitor_files &

    # Start display state monitor
    check_display_state
    
    # Wait for cleanup
    wait
}

main "$@"