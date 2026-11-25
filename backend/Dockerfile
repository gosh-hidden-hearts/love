# GOSH Backend Container Image
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and data
COPY . .

# Create uploads directory
RUN mkdir -p uploads data

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/server.js"]
