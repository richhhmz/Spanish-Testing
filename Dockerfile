# 1. Use Node.js 20 as the base image
FROM node:20-slim
WORKDIR /app

# 2. Copy dependency files for Root, Frontend, and Backend
# This helps with layer caching so 'npm install' only runs when dependencies change
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# 3. Install all dependencies
# We install root dependencies first, then the sub-folders
RUN npm install
RUN cd frontend && npm install
RUN cd backend && npm install

# 4. Copy the entire source code into the container
COPY . .

# 5. Build the React frontend
# This generates the 'frontend/dist' folder
RUN cd frontend && npm run build

# 6. Move the build artifacts to where index.js expects them
# This creates 'backend/frontend-dist' and copies the fresh build into it
RUN mkdir -p backend/frontend-dist && cp -r frontend/dist/* backend/frontend-dist/

# 7. Final Configuration
# Cloud Run typically uses port 8080 by default
EXPOSE 8080

# Start the backend server
CMD ["node", "backend/index.js"]