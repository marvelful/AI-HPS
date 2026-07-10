FROM openwa/wa-automate

ENTRYPOINT []

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh
USER root
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
