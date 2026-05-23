FROM node:20-alpine

WORKDIR /app

RUN npm install -g expo-cli

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

CMD ["npm", "test"]