# AKSI TURN (coturn) — проприетарный контур

© AKSI · aksilove@internet.ru · см. ../LICENSE

## Важно

GitHub Pages **не** запускает TURN. Этот каталог — конфиг для **вашего VPS**.

## Быстрый старт

```bash
cd turn
cp .env.example .env
# PUBLIC_IP=…  TURN_SECRET=$(openssl rand -hex 32)

export $(grep -v '^#' .env | xargs)
sed -i "s/YOUR_PUBLIC_IP/${PUBLIC_IP}/g" turnserver.conf
sed -i "s/CHANGE_ME_LONG_RANDOM_SECRET/${TURN_SECRET}/g" turnserver.conf

ufw allow 3478/tcp && ufw allow 3478/udp
ufw allow 5349/tcp && ufw allow 49152:49200/udp

docker compose up -d
TURN_SECRET=… PUBLIC_IP=… python3 credentials-api.py   # :8787/turn
```

В АКСИ (до aksi-p2p.js):

```html
<script>window.AKSI_P2P_TURN_URL = "https://api.DOMAIN/turn";</script>
```

Пакет и API — часть проприетарного продукта AKSI. Redistribution without license prohibited.
