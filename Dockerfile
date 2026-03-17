FROM nginx:stable-alpine

# Copy dashboard files
COPY dashboard/ /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
