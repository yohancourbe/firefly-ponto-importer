# Use the official Deno image from the Docker Hub
FROM denoland/deno:alpine-2.1.4

# Set the working directory
WORKDIR /app

# Copy the project files to the working directory
COPY . .

# Run the Deno application
CMD ["task", "prod"]