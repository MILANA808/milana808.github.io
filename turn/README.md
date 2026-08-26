# AKSI TURN Server

Собственный **coturn** для стабильного WebRTC P2P (NAT traversal).

## Быстрый старт (VPS)

```bash
# 1. Скопировать папку turn/ на сервер
cd turn
cp .env.example .env
# Отредактировать PUBLIC_IP и TURN_SECRET:
#   openssl rand -hex 32

# 2. Подставить IP в конфиг
export $(grep -v '^#' .env | xargs)
sed -i "s/YOUR_PUBLIC_IP/${PUBLIC_IP}/g" turnserver.conf
sed -i "s/CHANGE_ME_LONG_RANDOM_SECRET/${TURN_SECRET}/g" turnserver.conf

# 3. Firewall
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 49152:49200/udp

# 4. Запуск
docker compose up -d
docker logs -f aksi-turn
```

## Учётные данные для браузера

### Вариант A — временные HMAC (рекомендуется)

```bash
TURN_SECRET=... PUBLIC_IP=1.2.3.4 node gen-credentials.js 86400
```

В консоли браузера или в коде:

```js
window.AKSI_P2P_TURN = {
  urls: [
    "turn:1.2.3.4:3478?transport=udp",
    "turn:1.2.3.4:3478?transport=tcp"
  ],
  username: "<expiry:user>",
  credential: "<hmac>"
};
```

### Вариант B — API

```bash
TURN_SECRET=... PUBLIC_IP=1.2.3.4 python3 credentials-api.py
# GET http://VPS:8787/turn
```

В `index.html` до `aksi-p2p.js`:

```html
<script>
window.AKSI_P2P_TURN_URL = "https://api.yourdomain.com/turn";
</script>
```

Модуль P2P сам подтянет `iceServers`.

## Проверка

```bash
# Извне
turnutils_uclient -v -u user -w pass YOUR_PUBLIC_IP
```

В АКСИ: вкладка P2P → Создать Зал / Присоединиться → ping в шапке.

## Безопасность

- Не коммитьте `.env` и реальный `static-auth-secret`
- Откройте только нужные порты
- Для `turns:` положите сертификаты в `turn/certs/`
- Credential API держите за HTTPS + rate limit

Contact: aksilove@internet.ru
