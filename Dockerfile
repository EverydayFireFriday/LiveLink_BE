# 1. Base Image: Node.js 18 on Alpine Linux for a smaller image size
FROM node:18-alpine

# 2. Set working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json for dependency installation
# This leverages Docker's layer caching. These files are copied first,
# so dependencies are only re-installed if they change.
COPY package*.json ./

# 4. Install production dependencies
# Using --only=production in a multi-stage build is a good practice,
# but for simplicity here we install all dependencies first and prune later if needed.
RUN npm install

# 5. Copy all other source files into the working directory
COPY . .

# 6. Build TypeScript to JavaScript
# This command compiles the .ts files into .js files in the 'dist' directory.
RUN npm run build

# 7. Expose the application port
EXPOSE 3000

# 8. Define the command to run the application
# This will start the server when the container launches.
CMD [ "node", "dist/app.js" ]

