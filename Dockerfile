FROM node:22-alpine

WORKDIR /app

# Build the React client
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Install server production deps
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
