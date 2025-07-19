# Stage 1: Build
FROM node:18-alpine as builder

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

# Install runtime dependencies for canvas
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    librsvg \
    ttf-dejavu

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vocard -u 1001

# Set the working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=vocard:nodejs /app/dist ./dist
COPY --from=builder --chown=vocard:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=vocard:nodejs /app/package*.json ./

# Copy configuration files
COPY --chown=vocard:nodejs .env.example ./.env.example

# Create logs directory
RUN mkdir -p logs && chown vocard:nodejs logs

# Switch to non-root user
USER vocard

# Expose port (if needed for IPC)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check')" || exit 1

# Run the application
CMD ["node", "dist/index.js"]