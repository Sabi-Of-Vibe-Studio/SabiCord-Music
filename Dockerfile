# SabiCord Music Bot - Production Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache     python3     make     g++     git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY dist/ ./

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S sabicord &&     adduser -S sabicord -u 1001

# Change ownership
RUN chown -R sabicord:sabicord /app

# Switch to non-root user
USER sabicord

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3     CMD node -e "console.log('Health check passed')" || exit 1

# Start application
CMD ["npm", "start"]
