# Deploying MultiSS (staging first)

Target: one small Ubuntu VPS running Node, MySQL 8 and Nginx. Deploy a staging site **early**:
PayFast needs a public HTTPS URL for its payment notifications (Phase 4), and early deployment
surfaces hosting problems while they are cheap to fix. Pick a South African or nearby EU region to
keep page and database latency low.

## 1. Server setup (once)

```bash
# Node 22, Nginx, MySQL 8
sudo apt update && sudo apt install -y nginx mysql-server certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2

sudo mysql -e "CREATE DATABASE multiss_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'multiss'@'localhost' IDENTIFIED BY 'CHOOSE_A_STRONG_PASSWORD';
GRANT ALL ON multiss_ecommerce.* TO 'multiss'@'localhost';"
```

## 2. First deploy

```bash
git clone <your repo> /var/www/multiss && cd /var/www/multiss
cp .env.example .env     # set DATABASE_URL, AUTH_SECRET (openssl rand -base64 32),
                         # AUTH_URL and NEXT_PUBLIC_SITE_URL = https://your-staging-domain
npm ci
mysql -u multiss -p multiss_ecommerce < database/multiss_ecommerce_dev.sql
npm run db:migrate
npm run build
SEED_ADMIN_PASSWORD='a-strong-password' npm run db:seed   # staging only; use real data in production

# `output: "standalone"` needs static assets copied next to the server bundle:
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

PORT=3000 HOSTNAME=127.0.0.1 pm2 start .next/standalone/server.js --name multiss --update-env
pm2 save && pm2 startup
```

Environment variables for the running app must also be present when it starts: load them with
`pm2 start ecosystem.config.cjs` or `set -a; source .env; set +a` before `pm2 start`.

## 3. Nginx + HTTPS

```nginx
server {
  server_name staging.example.co.za;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
```

```bash
sudo certbot --nginx -d staging.example.co.za
```

## 4. Updating

```bash
git pull && npm ci && npm run db:migrate && npm run build
cp -r .next/static .next/standalone/.next/static
pm2 restart multiss
```

## 5. Before going live

- Daily MySQL backups (`mysqldump` cron to off-server storage) and a tested restore.
- Production `AUTH_SECRET`; never reuse the staging one.
- Email provider with SPF and DKIM on the domain (password reset emails).
- PayFast live credentials (`PAYFAST_SANDBOX=false`) and the notify URL set in the PayFast dashboard.
- Replace placeholder contact details in `src/config/site.ts` and the seed's VAT number.

## PayFast (Phase 4)

1. Create the PayFast sandbox account and put its merchant ID, key and passphrase in `.env` (`PAYFAST_SANDBOX="true"`).
2. `NEXT_PUBLIC_SITE_URL` must be the public **https** address. PayFast calls `NEXT_PUBLIC_SITE_URL/api/payfast/notify`
   from its own servers, so it must be reachable from the internet and Nginx must pass `X-Forwarded-For` (it is used to
   check the caller is really PayFast) and `X-Forwarded-Proto`.
3. Never set `PAYFAST_DEV_SIMULATE`, `PAYFAST_SKIP_SERVER_CONFIRM` or `PAYFAST_CHECK_IP` on staging or production.
4. Going live: new live merchant ID/key/passphrase, `PAYFAST_SANDBOX="false"`, then place a small real order and refund it.
