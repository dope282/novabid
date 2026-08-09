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

- **Node.js 18+** (`node --version`)
- **Git**

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

## Demo хэрэглэгч

| Төрөл | Имэйл | Нууц үг | Хаяг |
|---|---|---|---|
| Хэрэглэгч | `bat.erdene@gmail.com` | `12345678` | `/` |
| Админ | `admin@novabid.mn` | `12345678` | `/admin` |

## Механик

- **1 bid = 1 кредит** — буцаагдахгүй. Үнэ зөвхөн +1/+2/+3₮-өөр өснө.
- **Soft close** — сүүлийн секундэд bid ирвэл countdown дахин эхэлнэ. Хамгийн сүүлд bid хийсэн хүн ялна.
- **Шатны gating** — өмнөх шатанд оролцоогүй бол дараагийн шатанд орохын тулд **5 кредит** төлнө.
- **Token** — зарцуулсан кредит бүр 1 Token болж буцна, дэлгүүрт зарцуулна.
- **QPay** — кредит цэнэглэлт (одоогоор mock).

## Бүтэц

```
novabid/
├─ src/                    # Frontend (React)
│  ├─ components/          # SiteHeader, Footer, LotCard, Ticker, VotingPoll, ...
│  ├─ pages/               # Home, AuctionDetail, Wallet, Tokens, Shop, Profile, Referral, AuctionResult
│  ├─ admin/               # Админ layout, auth, pages (Overview/Auctions/Users/Payments)
│  ├─ hooks/               # useLiveAuction — WS + countdown
│  ├─ lib/                 # api.ts (REST client), format.ts
│  ├─ user.tsx, theme.tsx  # Session + Theme provider
│  └─ router.tsx
├─ server/                 # Backend (Node + SQLite)
│  ├─ src/
│  │  ├─ index.ts          # HTTP + WS сервер
│  │  ├─ db.ts, schema.sql # SQLite холболт, бүдүүвч
│  │  ├─ auth.ts           # JWT
│  │  ├─ engine.ts         # Аукционы soft-close engine
│  │  ├─ routes/           # auth, lots, wallet, admin
│  │  └─ seed.ts           # Эхний өгөгдөл
│  └─ data/                # SQLite файл (git-д ordoggүй)
└─ README.md
```

## Орчны хувьсагч

- **Frontend** (`.env.local`, заавал биш): `VITE_API_URL`, `VITE_WS_URL` — default нь `localhost:4000`.
- **Backend** (`server/.env`, заавал биш): `PORT` (default 4000), `JWT_SECRET` — production дээр ЗААВАЛ солино.

## Production build

```bash
npm run build        # frontend → dist/
cd server && npm start
```

## Хийгдсэн

Нүүр (live ticker + санал хураалт) · Auction detail (live WS countdown, bid, gating, кредит дууссан, анхны-bid modal) · Ялалт/Consolation · Хэтэвч/Token/Дэлгүүр · Профайл · Referral · Dark mode · **Backend** (auth, аукцион+bid, кредит/Token данс) · **Админ dashboard** (Тойм/Аукцион/Хэрэглэгч/Төлбөр).
