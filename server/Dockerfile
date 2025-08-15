# Stage 1: Build client
FROM node:20 AS client-builder
WORKDIR /app
# Copy client files from parent directory
COPY ../client/package.json ../client/package-lock.json ./client/
RUN cd client && npm install
COPY ../client/ ./client/
RUN cd client && npm run build

# Stage 2: Build server
FROM node:20
WORKDIR /app

# Install system tools
RUN apt-get update && apt-get install -y python3 gcc g++

# Copy SERVER files (relative to server/ directory)
COPY ./package.json ./package-lock.json ./
RUN npm install --omit=dev

# Copy built client from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Copy server source
COPY ./server.js ./

# Set env vars
ENV PORT=8080
ENV ALLOWED_ORIGINS="*"

# Start server
CMD ["node", "server.js"]
