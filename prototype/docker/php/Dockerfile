# PHP-FPM 8.2 with Moodle extensions
FROM php:8.2-fpm-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        curl \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libzip-dev \
        libicu-dev \
        libxml2-dev \
        libssl-dev \
        libcurl4-openssl-dev \
        libonig-dev \
        libsodium-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        gd \
        intl \
        zip \
        soap \
        mysqli \
        pdo_mysql \
        exif \
        opcache \
        sodium \
        mbstring \
    && rm -rf /var/lib/apt/lists/*

COPY php.ini /usr/local/etc/php/conf.d/moodle.ini
COPY www.conf /usr/local/etc/php-fpm.d/zz-moodle.conf

RUN mkdir -p /var/www/moodledata \
    && chown -R www-data:www-data /var/www/moodledata \
    && chmod 0777 /var/www/moodledata

WORKDIR /var/www/html

# php-fpm master runs as root; pool workers use www-data (see www.conf)
