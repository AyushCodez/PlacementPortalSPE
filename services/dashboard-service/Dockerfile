FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Dashboard Service usually runs on 5001, but we might override it or map it.
EXPOSE 5001

CMD ["npm", "start"]
