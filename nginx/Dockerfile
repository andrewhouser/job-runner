FROM nginx:alpine

# Install openssl for certificate generation
RUN apk add --no-cache openssl

# Generate self-signed certificate at build time
RUN mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /etc/nginx/certs/server.key \
    -out /etc/nginx/certs/server.crt \
    -subj "/C=US/ST=Local/L=Local/O=JobRunner/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 443 80
