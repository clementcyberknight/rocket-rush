FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG REACT_APP_SYNXED_API_KEY
ARG REACT_APP_SYNXED_SERVER_URL
ARG REACT_APP_SYNXED_PLAYLIST_CODE
ARG REACT_APP_SYNXED_ENABLE_VOICE=false
ARG PUBLIC_URL=/

ENV REACT_APP_SYNXED_API_KEY=$REACT_APP_SYNXED_API_KEY
ENV REACT_APP_SYNXED_SERVER_URL=$REACT_APP_SYNXED_SERVER_URL
ENV REACT_APP_SYNXED_PLAYLIST_CODE=$REACT_APP_SYNXED_PLAYLIST_CODE
ENV REACT_APP_SYNXED_ENABLE_VOICE=$REACT_APP_SYNXED_ENABLE_VOICE
ENV PUBLIC_URL=$PUBLIC_URL

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
