# NovaBid API Server

Node.js + Fastify + SQLite (better-sqlite3) + WebSocket. Web болон mobile (React Native/Expo) клиентүүд **нэг ижил** энэ API-г хэрэглэнэ.

## Ажиллуулах

```bash
cd server
npm install
npm run seed   # demo дата (нэг л удаа; дахин эхлэхдээ data/novabid.db устгана)
npm run dev    # http://localhost:4000 · WS: ws://localhost:4000/ws
```

**Demo нэвтрэлт:** `bat.erdene@gmail.com` / `12345678` (24 кредит, 132 token) · Админ: `admin@novabid.mn` / `12345678`

## API

| Method | Зам | Тайлбар |
|---|---|---|
| GET | `/api/health`, `/api/time` | Сервер цаг (countdown sync) |
| POST | `/api/auth/register` | `{email, password, name?, referralCode?}` → dev-д `devVerifyCode` буцаана |
| POST | `/api/auth/verify` | `{email, code}` → `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, user}` |
| GET | `/api/me` | 🔒 Хэрэглэгчийн snapshot |
| GET | `/api/lots` | Идэвхтэй лотууд + gating |
| GET | `/api/lots/:id` | Дэлгэрэнгүй + сүүлийн bid-үүд + gating |
| POST | `/api/lots/:id/bid` | 🔒 `{inc: 1\|2\|3}` — атомик транзакц |
| POST | `/api/lots/:id/rejoin` | 🔒 Оролцоогүй шатанд 5 кредит төлж орох |
| GET | `/api/wallet/packs` | Кредит багцууд |
| POST | `/api/wallet/topup` | 🔒 `{packId}` — MOCK QPay (шууд амжилттай) |
| GET | `/api/wallet/transactions` | 🔒 Гүйлгээний түүх |

🔒 = `Authorization: Bearer <token>`

## WebSocket (`/ws`)

Бүх клиентэд цацна (клиент `lotId`-аар шүүнэ):

- `{type:'bid', lotId, price, endsAt, stage, bidCount, bid:{user,inc}, serverNow}`
- `{type:'lot_closed', lotId, code, finalPrice, winner, serverNow}`

Countdown-ыг клиент дээр `endsAt - serverNow` зөрүүгээр тооцно (сервер цаг эрх мэдэлтэй).

## Тоглоомын дүрэм (сервер талд)

- 1 bid = 1 кредит, үнэ +1/2/3₮, soft-close: bid бүрт `ends_at = now + 15с`
- Хугацаа дуусмагц лот хаагдана — сүүлийн bid хийсэн хүн ялна
- Шат: bid-ийн тоогоор урагшилна (`bids_per_stage`); өмнөх шатанд оролцоогүй бол **5 кредит** төлж орно
- Хаагдахад ялагчаас бусад оролцогчийн bid бүр = **1 Token** (consolation)
- Referral: урьсан хүн анхны худалдан авалт хиймэгц urьсан хүнд +2 кредит

## Дараагийн алхам (production)

- Имэйл илгээгч холбох (одоо `devVerifyCode` хариунд буцдаг — УСТГАХ!)
- Жинхэнэ QPay merchant API
- `JWT_SECRET` env тавих
- Hosting: үргэлж асаалттай орчин шаардлагатай (аукцион хаагч engine) — Oracle Cloud Always Free / VPS. Унтдаг үнэгүй hosting (Render free) тохирохгүй.
- Өсөлтөд: SQLite → Postgres (Neon) шилжилт
