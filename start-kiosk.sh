#!/bin/bash
# Start Receipt Booth in Google Chrome Kiosk Mode with Silent Printing

URL="http://localhost:5173"

echo "Closing running instances of Google Chrome to apply kiosk flags..."
osascript -e 'quit app "Google Chrome"'
sleep 1.5

echo "Launching Receipt Booth in Chrome Kiosk mode with silent (automatic) printing..."
echo "Target URL: $URL"
echo "Make sure your thermal receipt printer is set as the Default Printer in macOS System Settings."

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --kiosk-printing "$URL"
