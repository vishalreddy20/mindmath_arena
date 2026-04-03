FROM php:8.3-cli-alpine

# Enable SQLite support used by the app backend.
RUN apk add --no-cache sqlite sqlite-dev \
    && docker-php-ext-install pdo pdo_sqlite

WORKDIR /app
COPY . /app

# Cloud platforms usually inject PORT; default to 8080 for local container runs.
EXPOSE 8080
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8080} -t /app"]
