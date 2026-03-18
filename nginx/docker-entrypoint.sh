#!/bin/sh
set -e

# If GOOGLE_MAPS_API_KEY is set, inject it into a script
if [ -n "$GOOGLE_MAPS_API_KEY" ]; then
  cat > /usr/share/nginx/html/config.js << EOF
// Auto-injected from environment variable
if (typeof localStorage !== 'undefined') {
  localStorage.setItem('googleMapsApiKey', '$GOOGLE_MAPS_API_KEY');
}
EOF
else
  # Create empty config.js if no API key provided
  cat > /usr/share/nginx/html/config.js << EOF
// No API key provided - user will need to configure it in the app
EOF
fi

# Start nginx
exec nginx -g "daemon off;"
