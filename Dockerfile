FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash
RUN npm install -g expo-cli @expo/ngrok@^4.1.0
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8081 19000 19001