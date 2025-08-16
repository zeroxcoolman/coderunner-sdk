# Stage 1: Build
FROM node:18 AS builder

# Create a temporary context that includes both client and server
WORKDIR /build

# Copy the server code (including the client folder)
COPY . .

# Build the client
WORKDIR /build/client
RUN npm install && npm run build

# Build the server
WORKDIR /build
RUN npm install && npm run build

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app

# Copy everything from the build stage
COPY --from=builder /build .

CMD ["node", "server.js"]
