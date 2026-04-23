FROM php:8.4-cli

WORKDIR /app

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_CACHE_DIR=/tmp/composer-cache

RUN apt-get update \
    && apt-get install -y git unzip libpq-dev nodejs npm chromium fonts-dejavu-core \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    CHROME_PATH=/usr/bin/chromium

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

CMD ["docker-entrypoint.sh"]