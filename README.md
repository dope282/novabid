# NovaBid

**1₮-өөс эхлэх** penny-auction (нано-аукцион) платформ. Монгол хэл дээрх full-stack веб апп.

Live bid, soft-close countdown, кредит/Token эдийн засаг, QPay (mock), болон админ dashboard-той.

## Технологи

**Frontend** (`/`)
- **Vite** + **React 18** + **TypeScript**, `react-router-dom`
- Realtime: WebSocket (live bid + soft-close)
- Design tokens: CSS variables (`src/styles/tokens.css`), Dark/Light mode
- Фонт: Rubik (гарчиг), Golos Text (текст), JetBrains Mono (тоо)

**Backend** (`/server`)
- **Node.js** + **TypeScript** (`tsx`), Express маягийн REST API + WebSocket сервер
- **SQLite** (`better-sqlite3`) — файлд суурилсан DB, тусдаа сервер шаардахгүй
- JWT authentication, аукционы engine (soft-close, шат, автомат хаалт)

## Урьдчилсан шаардлага

- **Node.js 20 / 22 / 24** (`node --version`) — `better-sqlite3` эдгээр хувилбарт бэлэн
  (prebuilt) binary-тай тул компилятор шаардахгүй. Node 18 дээр ажиллахгүй.
- **Git**

> Хэрэв өөр Node хувилбар дээр `npm install` үед `node-gyp` / Python алдаа гарвал энэ нь
> `better-sqlite3`-г эх кодоос нь компиляц хийхийг оролдож байгаа гэсэн үг. Дээрх LTS
> хувилбаруудын аль нэгийг ашиглана уу.

## Өөр компьютер дээр татаж ажиллуулах

```bash
# 1. Repo-г clone хийх
git clone https://github.com/<таны-нэр>/novabid.git
cd novabid

# 2. Backend суулгаж, DB бэлдэж, асаах  (Терминал 1)
cd server
npm install
cp .env.example .env       # (заавал биш — default утга ажиллана)
npm run seed               # DB-г эхний өгөгдлөөр дүүргэх (ганц удаа)
npm run dev                # API + WS → http://localhost:4000

# 3. Frontend суулгаж, асаах  (Терминал 2 — өөр цонх)
cd ..                      # төслийн root руу
npm install
npm run dev                # веб → http://localhost:5173
```

Дараа нь браузераар **http://localhost:5173** нээнэ. Backend-ийг эхлээд асаана.

> **Windows PowerShell** дээр `cp .env.example .env`-ийн оронд `Copy-Item .env.example .env` ашиглана.

## npm script-ууд

| Хаана | Команд | Тайлбар |
|---|---|---|
| root | `npm run dev` | Vite dev сервер → http://localhost:5173 |
| root | `npm run build` | TypeScript шалгалт + production build → `dist/` |
| root | `npm run typecheck` | Зөвхөн төрлийн шалгалт |
| root | `npm run lint` | ESLint |
| server | `npm run dev` | API + WS (watch горим) → http://localhost:4000 |
| server | `npm start` | API + WS (watch-гүй) |
| server | `npm run seed` | DB хоосон бол demo өгөгдлөөр дүүргэнэ |
| server | `npm run db:reset` | DB-г устгаад шинээр seed хийнэ |
| server | `npm run typecheck` | Backend төрлийн шалгалт |

> `npm run db:reset` ажиллуулахын өмнө backend серверээ **зогсооно** — Windows дээр
> ажиллаж буй процесс DB файлыг түгжсэн байдаг тул устгаж чадахгүй.

## Demo хэрэглэгч

| Төрөл | Имэйл | Нууц үг | Хаяг |
|---|---|---|---|
| Хэрэглэгч | `bat.erdene@gmail.com` | `12345678` | `/` |
| Админ | `admin@novabid.mn` | `12345678` | `/admin` |

## Google-ээр нэвтрэх (заавал биш)

Имэйл+нууц үгийн зэрэгцээ Google Account-аар нэвтрэх боломжтой. Тохируулаагүй бол тэр товч
**харагдахгүй**, бусад бүх зүйл хэвийн ажиллана.

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → төсөл үүсгэх
2. **OAuth consent screen** бөглөх (External, апп нэр, имэйл)
3. **Create credentials → OAuth client ID → Web application**
4. **Authorized JavaScript origins**-д нэмэх:
   - `http://localhost:5173` (локал хөгжүүлэлт)
   - production домэйнээ (жишээ нь `https://novabid.mn`)
5. Гарсан **Client ID**-г хоёр газарт тавина:

```bash
# .env.local (frontend)
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# server/.env (backend) — ЯГ ИЖИЛ утга
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

Дараа нь хоёр серверээ **дахин асаана** (env нь ачаалах үед л уншигддаг).

> **Client secret хэрэггүй.** Энэ нь ID token урсгал — Google клиентэд гарын үсэгтэй JWT өгч,
> сервер түүнийг Google-ийн нийтийн түлхүүрээр шалгана. Client ID нь нууц биш, frontend-д ил гардаг.

**Аюулгүй байдлын логик:**

- Сервер клиентийн илгээсэн имэйлд **итгэхгүй** — зөвхөн Google-ийн гарын үсэгтэй token-оос уншина
- `email_verified: false` бол татгалзана (эс бөгөөс өөр хүний бүртгэлийг булаах эрсдэлтэй)
- Ижил имэйлтэй нууц үгтэй бүртгэл байвал **автоматаар холбоно** (Google имэйлийг баталгаажуулсан тул)
- Google-ээр үүссэн бүртгэлд нууц үгийн hash хоосон — нууц үгээр нэвтрэх боломжгүй

## Механик

- **1 bid = 1 кредит** — буцаагдахгүй. Үнэ зөвхөн +1/+2/+3₮-өөр өснө.
- **Timer дээр гүйж байгаа нь сэргэх хугацаа** (секундээр, ж: 30с) — bid ирэх бүрд
  эхнээсээ. **Тэглэвэл аукцион дуусаж, хамгийн сүүлд bid хийсэн хүн ялна.**
- **Bid босго давбал дараагийн Round эхэлнэ** — timer шинээр эхэлж, хуваарь урагшилна.
  Босго хязгааргүй бол тэр Round зөвхөн timer тэглэхэд дуусна.
- **Үргэлжлэх хугацаа** (минутаар) нь зөвхөн Round бүр хэдээс хэд хүртэл үргэлжлэхийг
  тооцож харуулах зорилготой — аукционы явцад нөлөөлөхгүй. Хуваарь лотын хуудсанд ил гарна.
- **Хуваарьт эхлэл** — ноорог лот товлосон цагт автоматаар нээгдэнэ.
- **Round-ын gating** — өмнөх Round-д оролцоогүй бол дараагийнхад орохын тулд **5 кредит** төлнө.
- **Token** — зарцуулсан кредит бүр 1 Token болж буцна, дэлгүүрт зарцуулна.
- **QPay** — кредит цэнэглэлт (одоогоор mock).

## Бүтэц

```
novabid/
├─ src/                    # Frontend (React)
│  ├─ components/          # SiteHeader, Footer, LotCard, Ticker, VotingPoll, ...
│  ├─ pages/               # Home, AuctionDetail, Wallet, Tokens, Shop, Profile, Referral, AuctionResult
│  ├─ admin/               # Админ layout, auth, pages (Тойм/Аукцион/Хэрэглэгч/Төлбөр/Багц/Дэлгүүр/Санал)
│  ├─ hooks/               # useLiveAuction — WS + countdown
│  ├─ lib/                 # api.ts (REST client), format.ts
│  ├─ user.tsx, theme.tsx  # Session + Theme provider
│  └─ router.tsx
├─ server/                 # Backend (Node + SQLite)
│  ├─ src/
│  │  ├─ index.ts          # Fastify HTTP + WS сервер
│  │  ├─ db.ts             # SQLite холболт + бүдүүвч (CREATE TABLE)
│  │  ├─ auth.ts           # JWT, нууц үг hash, эрхийн шалгалт
│  │  ├─ uploads.ts        # Лотын зураг хадгалах/устгах
│  │  ├─ auction.ts        # Bid, gating, soft-close engine, лот хаалт
│  │  ├─ ws.ts             # WebSocket broadcast
│  │  ├─ routes/           # auth, lots, wallet, admin
│  │  └─ seed.ts           # Эхний өгөгдөл
│  └─ data/                # SQLite файл + uploads/ (git-д ordoggүй)
└─ README.md
```

## Орчны хувьсагч

- **Frontend** (`.env.local`, заавал биш): `VITE_API_URL`, `VITE_WS_URL` — default нь `localhost:4000`.
  Vite өөрөө уншина.
- **Backend** (`server/.env`, заавал биш): `PORT` (default 4000), `JWT_SECRET` — production дээр
  ЗААВАЛ солино. Node-ын `--env-file-if-exists` флагаар ачаалагддаг (`server/package.json`
  script-үүдэд бичигдсэн), тул файл байхгүй байсан ч алдаа өгөхгүй.

## NAS дээр deploy (Docker)

Нэг контейнер: Fastify API + WebSocket + frontend-ийн статик файл, бүгд **нэг порт** дээр.
Ийм учраас CORS, тусдаа веб сервер, `VITE_API_URL` тохируулах шаардлагагүй — frontend
өөрийгөө үйлчилж буй хаяг руугаа хандана (HTTPS дээр WS нь автоматаар `wss://`).

```bash
# 1. Кодоо NAS руу хуулах (git clone эсвэл File Station)
git clone https://github.com/<таны-нэр>/novabid.git
cd novabid

# 2. Орчны хувьсагч
cp .env.docker.example .env
nano .env          # JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD заавал бөглөнө

# 3. Build + асаах
docker compose up -d --build

# 4. Шалгах
curl http://localhost:4000/api/health
docker compose logs -f
```

**Synology / QNAP**: Container Manager (эсвэл Container Station) → Project → "Create" →
төслийн хавтсаа зааж `docker-compose.yml`-ийг сонгоно. SSH-тэй бол дээрх командууд шууд ажиллана.

### Өгөгдөл хаана хадгалагдах вэ

`./data` хавтас контейнерийн `/srv/data` руу холбогдоно — SQLite болон байршуулсан зураг
энд үлдэнэ. **Контейнер устгаад дахин үүсгэсэн ч өгөгдөл алдагдахгүй.** NAS-ын өөр share
руу заах бол `docker-compose.yml`-ийн volume мөрийг өөрчилнө (ж: `/volume1/docker/novabid:/srv/data`).

Нөөцлөхөд тэр хавтсыг бүхэлд нь хуулахад хангалттай (сервер зогсоосон үед хуулбал WAL
файлууд зөв таарна).

### Домэйн + HTTPS

Контейнер нь HTTP-ээр 4000 порт дээр сонсдог. Гаднаас домэйнээр нээхдээ **reverse proxy**
ашиглана — Synology бол DSM → Login Portal → Advanced → Reverse Proxy, эсвэл Nginx Proxy
Manager / Caddy.

Proxy дээр **WebSocket-ийг заавал зөвшөөрнө** (`Upgrade`, `Connection` толгой дамжуулах) —
эс бөгөөс live countdown болон bid шинэчлэлт ажиллахгүй. Synology-д "WebSocket" checkbox
байдаг; Nginx бол:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Proxy-гийн ард орсны дараа портоо гадагш нээх шаардлагагүй — `docker-compose.yml`-д
`ports` мөрийг `127.0.0.1:${HOST_PORT:-4000}:4000` болговол зөвхөн NAS дотроос хандана.

### Шинэчлэх

```bash
git pull
docker compose up -d --build
```

Схемийн өөрчлөлт (шинэ багана, хүснэгт) асах үедээ автоматаар хийгддэг — гар аргаар
migration ажиллуулах шаардлагагүй.

### Анхаарах зүйлс

- **`npm run seed`-ийг production дээр битгий ажиллуул** — нийтэд мэдэгдэх нууц үгтэй
  (`12345678`) demo хэрэглэгчид үүснэ. Админаа `ADMIN_EMAIL`/`ADMIN_PASSWORD`-оор үүсгэнэ.
- **`.env.local` файл байвал** `VITE_API_URL=http://localhost:4000` нь frontend build дотор
  шингэнэ. Docker build энэ файлыг `.dockerignore`-оор хасдаг тул асуудалгүй, гэхдээ гараар
  build хийж байвал анхаарна уу.
- **Google Client ID** нь build үед шингэдэг. Өөрчилвөл `--build` дахин хийнэ.
- Аукционы engine нь тасралтгүй ажиллах шаардлагатай (Round хаах, ялагч тодруулах) —
  `restart: unless-stopped` тавьсан тул NAS дахин асахад өөрөө сэргэнэ.

## Production build (Docker-гүйгээр)

Docker хэрэглэхгүй бол гараар мөн адил бүтэц гаргаж болно — сервер `server/public/`-оос
frontend-ээ үйлчилнэ:

```bash
npm run build                        # frontend → dist/
cp -r dist server/public             # сервер эндээс үйлчилнэ

cd server
npm run build                        # TypeScript → dist/ (tsx хэрэггүй болно)
NODE_ENV=production JWT_SECRET=<санамсаргүй> \
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=<нууц үг> \
  npm run start:prod                 # бүгд :4000 дээр
```

`server/public/index.html` байхгүй бол сервер статик үйлчилгээг алгасна (dev-д Vite
үйлчилдэг тул). Өгөгдлийн хавтсыг `DATA_DIR`-ээр өөр байрлал руу заана.

> `npm start` (tsx watch-гүй хувилбар) нь dev-д зориулсан. Production-д compile хийсэн
> `start:prod`-ыг ашиглах нь хурдан бөгөөд `tsx`-ийг production dependency болгохгүй.

## Хийгдсэн

Нүүр (live ticker + санал хураалт + идэвхтэй лот алга үеийн мэдэгдэл + хаагдсан лотын архив) · Auction detail (live WS countdown, bid, gating, кредит дууссан, анхны-bid modal) · Ялалт/Consolation · Хэтэвч/Token/Дэлгүүр · Профайл · Dark mode · **Backend** (auth, аукцион+bid, кредит/Token данс) · **Админ dashboard** (Тойм/Аукцион/Хэрэглэгч/Төлбөр) · **Админ лот CRUD** (үүсгэх/засах/хаах/устгах, зураг байршуулах, дэлгэрэнгүй тайлбар) ·
**Санал хураалт** (админаас удирддаг, санал нь DB-д хадгалагдана) ·
**Token дэлгүүр** (админаас бараа удирдах, Token-оор солих, захиалга хянах) ·
**Кредит багц** (админаас үнэ/төлөв удирдана, Хэтэвч хуудас шууд тусгана) ·
**Хэрэглэгч удирдах** (хаах/нээх, админ эрх, кредит-Token гараар засах — `admin_adjust` гүйлгээгээр бүртгэгдэнэ, түүхгүй хэрэглэгчийг устгах) ·
**Referral** (`/api/referral` — жинхэнэ урилгын код, статистик, урьсан хүмүүсийн жагсаалт) ·
**Гар утасны responsive** (hamburger цэс, эвхэгддэг формууд, 375px-д бүрэн тохирсон).

## Дараагийн алхам

QPay mock, имэйл илгээгч, rate limiting, автомат тест байхгүй. Дэлгэрэнгүйг
[server/README.md](server/README.md)-ийн "Дараагийн алхам" хэсгээс уншина уу.
