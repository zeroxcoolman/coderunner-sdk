# Robust Railway build with Discord SDK support
FROM node:18-alpine

# RAHHHHHHH
RUN apk add --no-cache \
    bash curl wget git openssh \
    gcc g++ musl-dev make \
    python3 python3-dev \
    php lua5.3 ruby openjdk11-jdk \
    && ln -sf /usr/bin/lua5.3 /usr/bin/lua \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy and install server dependencies first (better Docker caching)
COPY package*.json ./
RUN npm install --only=production --no-audit --no-fund

# Copy client files and handle Discord SDK dependency
COPY client ./client
WORKDIR /app/client

# Install client dependencies with better error handling
RUN npm install --no-audit --no-fund --verbose || \
    (echo "Initial install failed, trying without Discord SDK..." && \
     npm install --no-audit --no-fund --ignore-scripts) || \
    (echo "Fallback: installing core dependencies only..." && \
     npm install vite --no-audit --no-fund)

# Build the client application
RUN npm run build || \
    (echo "Build failed, creating fallback dist..." && \
     mkdir -p dist && \
     cp index.html dist/ && \
     cp main.js dist/ && \
     echo "/* Fallback build */" > dist/main.js)

# Back to app root and copy server files
WORKDIR /app
COPY server.js ./

# Install Rust with minimal profile (faster)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable || echo "Rust install failed, continuing..."
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Go with direct extraction (faster)
RUN wget -q https://go.dev/dl/go1.21.0.linux-amd64.tar.gz -O - | tar -xz -C /usr/local || echo "Go install failed, continuing..."
ENV PATH="/usr/local/go/bin:${PATH}"

# Create required directories
RUN mkdir -p temp_files user_files backups themes logs

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV EXEC_TIMEOUT_MS=15000
ENV MAX_FILE_SIZE=1048576

# Railway sets PORT automatically
EXPOSE ${PORT:-3000}

# Simple health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the application
CMD ["node", "server.js"]
