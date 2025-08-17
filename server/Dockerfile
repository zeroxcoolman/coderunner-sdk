# Railway-optimized multi-stage Dockerfile for Enhanced CodeRunner
FROM node:18-alpine AS base

# Install system dependencies that will be needed
RUN apk add --no-cache \
    gcc \
    g++ \
    musl-dev \
    python3 \
    python3-dev \
    py3-pip \
    bash \
    curl \
    git \
    make \
    wget

# Stage 1: Build the client application
FROM base AS client-builder

WORKDIR /build/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies (Railway prefers npm install for flexibility)
RUN npm install

# Copy client source code
COPY client/ ./

# Build the client application
RUN npm run build

# Stage 2: Server dependencies
FROM base AS server-deps

WORKDIR /build/server

# Copy server package files  
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Stage 3: Final runtime image
FROM base AS runtime

# Install additional language runtimes
RUN apk add --no-cache \
    php \
    lua5.3 \
    ruby \
    openjdk11-jdk \
    && ln -sf /usr/bin/lua5.3 /usr/bin/lua

# Install Rust (Railway has good caching for this)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Go
RUN wget -Q -O /tmp/go.tar.gz https://go.dev/dl/go1.21.0.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf /tmp/go.tar.gz \
    && rm /tmp/go.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy built assets and dependencies
COPY --from=server-deps /build/server/node_modules ./node_modules
COPY --from=client-builder /build/client/dist ./client/dist

# Copy server source code
COPY server.js ./
COPY package*.json ./

# Create necessary directories
RUN mkdir -p temp_files user_files backups themes logs

# Railway will set PORT automatically, but we provide defaults
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV EXEC_TIMEOUT_MS=15000
ENV MAX_FILE_SIZE=1048576

# Railway uses PORT from environment
EXPOSE $PORT

# Health check for Railway's health monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the application
CMD ["node", "server.js"]
