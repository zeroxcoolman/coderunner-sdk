# Stage 1: Build the client application
FROM node:18-alpine AS client-builder

WORKDIR /build/client

# Copy client package files
COPY client/package*.json ./
RUN npm ci --only=production

# Copy client source code
COPY client/ ./

# Build the client application
RUN npm run build

# Stage 2: Server dependencies
FROM node:18-alpine AS server-deps

WORKDIR /build/server

# Copy server package files
COPY package*.json ./
RUN npm ci --only=production

# Stage 3: Runtime environment with compilers and tools
FROM node:18-alpine AS runtime

# Install system dependencies and programming language toolchains
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
    && rm -rf /var/cache/apk/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Go
RUN wget -O /tmp/go.tar.gz https://go.dev/dl/go1.21.0.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf /tmp/go.tar.gz \
    && rm /tmp/go.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install additional tools
RUN apk add --no-cache \
    php \
    lua5.3 \
    ruby \
    openjdk11-jdk \
    && ln -sf /usr/bin/lua5.3 /usr/bin/lua

# Create app user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Create application directory
WORKDIR /app

# Copy server dependencies
COPY --from=server-deps --chown=appuser:appuser /build/server/node_modules ./node_modules

# Copy built client application
COPY --from=client-builder --chown=appuser:appuser /build/client/dist ./client/dist

# Copy server source code
COPY --chown=appuser:appuser server.js ./
COPY --chown=appuser:appuser package*.json ./

# Create necessary directories with proper permissions
RUN mkdir -p temp_files user_files backups themes logs && \
    chown -R appuser:appuser temp_files user_files backups themes logs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV EXEC_TIMEOUT_MS=15000
ENV MAX_FILE_SIZE=1048576

# Start the application
CMD ["node", "server.js"]
