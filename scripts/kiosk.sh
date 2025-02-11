#!/bin/bash
#
# Kiosk Mode Manager
# Manages a fullscreen Chromium browser in kiosk mode with automatic recovery
# Features X server management, Firefox profile configuration, and process monitoring
#
# Author: Muddyblack
# Date: 11.11.2024
# Version: 1.0

# -----------------------------------------------------------------------------
# Dependencies and initialization
# -----------------------------------------------------------------------------

source "$(dirname "${BASH_SOURCE[0]}")/project-utils.sh" || exit 1

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
readonly TARGET_URL="${TARGET_URL:-https://www.google.com}"
readonly DISPLAY_NUM="${DISPLAY_NUM:-:0}"

# -----------------------------------------------------------------------------
# Cleanup and signal handling
# -----------------------------------------------------------------------------
cleanup() {
    pkill -f chromium || true
    pkill -f openbox || true
    pkill Xorg || true
    for lock in /tmp/.X${DISPLAY_NUM#:}-lock /tmp/.X11-unix/X${DISPLAY_NUM#:}; do
        [ -e "$lock" ] && rm -f "$lock"
    done
}

setup_signal_handlers() {
    trap cleanup EXIT INT TERM
}

# -----------------------------------------------------------------------------
# Display management
# -----------------------------------------------------------------------------
start_x_server() {
    log_info "Starting minimal X server..."
    cleanup  # Now cleanup is defined before being used
    xinit /usr/bin/openbox-session -- $DISPLAY_NUM vt1 -nocursor &
    sleep 3
}

# -----------------------------------------------------------------------------
# Browser launch
# -----------------------------------------------------------------------------
launch_browser() {
    log_info "Launching Chromium in kiosk mode..."
    
    # Disable screen blanking and power management
    DISPLAY=$DISPLAY_NUM xset s off
    DISPLAY=$DISPLAY_NUM xset s noblank
    DISPLAY=$DISPLAY_NUM xset -dpms

    # Launch Chromium with minimal features
    DISPLAY=$DISPLAY_NUM chromium \
        --kiosk \
        --user-agent="Mozilla/5.0 (TERMINAL-SLIDE-SHOW) Gecko/20100101 Chrome/123.0" \
        --disable-features=TranslateUI \
        --disable-suggestions-service \
        --disable-save-password-bubble \
        --disable-session-crashed-bubble \
        --disable-infobars \
        --disable-dev-shm-usage \
        --disable-gpu \
        --disable-software-rasterizer \
        --no-first-run \
        --start-maximized \
        --noerrdialogs \
        --disable-pinch \
        --overscroll-history-navigation=0 \
        "$TARGET_URL" &

    sleep 2
}

check_error_page() {
    # Use xdotool to get the current window title
    local title=$(DISPLAY=$DISPLAY_NUM xdotool getwindowname $(DISPLAY=$DISPLAY_NUM xdotool getactivewindow) 2>/dev/null)
    
    if [[ "$title" =~ "404" ]] || \
       [[ "$title" =~ "Bad Gateway" ]] || \
       [[ "$title" =~ "502" ]] || \
       [[ "$title" =~ "503" ]] || \
       [[ "$title" =~ "504" ]] || \
       [[ "$title" =~ "Connection refused" ]] || \
       [[ "$title" =~ "Not Found" ]]; then
        return 0  # Error page detected
    fi
    return 1  # No error page detected
}

main() {
    setup_signal_handlers  
    clear
    init_project_logging "kiosk"

    start_x_server || exit 1
    launch_browser || exit 1

    while true; do
        if ! pgrep -f chromium > /dev/null; then
            log_warn "Browser crashed, restarting..."
            launch_browser || exit 1
        elif check_error_page; then
            log_warn "Error page detected, refreshing browser..."
            DISPLAY=$DISPLAY_NUM xdotool key F5
            sleep 10 
        fi
        sleep 5
    done
}

[ "${BASH_SOURCE[0]}" = "$0" ] && main "$@"