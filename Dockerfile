# ── Production image ──
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Unpack pre-built Vite output
COPY dist.tar.gz /usr/share/nginx/html/
RUN tar -xzf /usr/share/nginx/html/dist.tar.gz --strip-components=1 -C /usr/share/nginx/html \
    && rm /usr/share/nginx/html/dist.tar.gz

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
