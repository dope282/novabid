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
| POST | `/api/auth/register` | `{email, password, name?, avatarColor?, referralCode?}` → dev-д `devVerifyCode` буцаана |
| POST | `/api/auth/verify` | `{email, code}` → `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, user}` |
| POST | `/api/auth/google` | `{credential, referralCode?}` — Google ID token → `{token, user}`. `GOOGLE_CLIENT_ID` тохируулаагүй бол `503` |
| GET | `/api/me` | 🔒 Хэрэглэгчийн snapshot |
| PATCH | `/api/me` | 🔒 `{name?, avatarColor?}` — профайл засах |
| GET | `/api/avatar-colors` | Дүрсний өнгөний палитр (8 өнгө) |
| GET | `/api/lots` | Идэвхтэй лотууд + gating, мөн `closed[]` (сүүлд хаагдсан 8 лот: эцсийн үнэ, ялагч) |
| GET | `/api/lots/:id` | Дэлгэрэнгүй + сүүлийн bid-үүд + gating |
| POST | `/api/lots/:id/bid` | 🔒 `{inc: 1\|2\|3}` — атомик транзакц |
| POST | `/api/lots/:id/rejoin` | 🔒 Оролцоогүй шатанд 5 кредит төлж орох |
| GET | `/api/wallet/packs` | Идэвхтэй кредит багцууд (админаас удирддаг, `perCredit` сервер бодно) |
| POST | `/api/wallet/topup` | 🔒 `{packId: number}` — MOCK QPay (шууд амжилттай). Нуусан багц `404` |
| GET | `/api/referral` | 🔒 Урилгын код, статистик (`invited`/`earned`/`pending`) + урьсан хүмүүсийн жагсаалт |
| GET | `/api/wallet/transactions` | 🔒 Гүйлгээний түүх |
| GET | `/api/wallet/tokens` | 🔒 Token үлдэгдэл + хөдөлгөөн (шошго нь сервер талд бэлдэгдсэн) |
| GET | `/api/poll` | Идэвхтэй санал хураалт + миний сонголт. Байхгүй бол `poll: null` |
| POST | `/api/poll/vote` | 🔒 `{candidateId}` — санал өгөх/буцаах (toggle) |
| GET | `/api/shop/items` | Идэвхтэй бараанууд (нуусныг нь буцаахгүй) |
| POST | `/api/shop/redeem` | 🔒 `{itemId}` — Token-оор солих, захиалга үүснэ |
| GET | `/api/shop/orders` | 🔒 Миний захиалгууд |

### Админ (👑)

| Method | Зам | Тайлбар |
|---|---|---|
| GET | `/api/admin/overview` | Үзүүлэлт, 7 хоногийн bid график, сүүлийн үйл явдал |
| GET | `/api/admin/auctions` | Бүх лот (хүснэгтийн + засварын түүхий утгууд) |
| GET | `/api/admin/users` | Бүх хэрэглэгч + `bids`, `blocked`, `deletable` |
| PATCH | `/api/admin/users/:id` | `{credits?, tokens?, blocked?, isAdmin?}` — үлдэгдлийн өөрчлөлт `admin_adjust` гүйлгээгээр бүртгэгдэнэ. Өөрийгөө хаах/эрхээ хасахыг татгалзана |
| DELETE | `/api/admin/users/:id` | Устгах — **зөвхөн bid / захиалга / урилгагүй** хэрэглэгч (эс бөгөөс `409`) |
| GET | `/api/admin/packs` | Бүх кредит багц + `sold` (хэдэн удаа зарагдсан) |
| POST | `/api/admin/packs` | `{credits, priceMnt, best?}` → `201 {pack}` |
| PATCH | `/api/admin/packs/:id` | `{credits?, priceMnt?, best?, status?, sortOrder?}`. `best: true` нь бусдаас нь автоматаар хасна |
| DELETE | `/api/admin/packs/:id` | Устгах — **зөвхөн зарагдаагүй** багц (эс бөгөөс `409`; оронд нь `status: "hidden"`) |
| GET | `/api/admin/payments` | Сүүлийн 100 гүйлгээ |
| POST | `/api/admin/uploads` | `multipart/form-data` зураг → `{url}`. JPG/PNG/WebP/GIF, 5MB хүртэл |
| POST | `/api/admin/lots` | Шинэ лот үүсгэх → `201 {lot}` |
| PATCH | `/api/admin/lots/:id` | Өгсөн талбаруудыг л шинэчилнэ |
| POST | `/api/admin/lots/:id/close` | Гараар хаах — ялагч тодруулж Token буцаана |
| DELETE | `/api/admin/lots/:id` | Устгах — **зөвхөн bid ороогүй** лот (эс бөгөөс `409`) |
| GET | `/api/admin/polls` | Бүх санал хураалт (нэр дэвшигч + саналтай нь) |
| POST | `/api/admin/polls` | Шинэ санал хураалт (`draft` төлөвтэй) → `201` |
| PUT | `/api/admin/polls/:id` | Нэр дэвшигчидтэй нь хамт хадгална (доор үз) |
| DELETE | `/api/admin/polls/:id` | Санал хураалтыг бүх саналын хамт устгана |
| GET | `/api/admin/shop/items` | Бүх бараа (нуусан + хэдэн ширхэг солигдсон) |
| POST | `/api/admin/shop/items` | Бараа нэмэх → `201` |
| PATCH | `/api/admin/shop/items/:id` | Өгсөн талбаруудыг л шинэчилнэ |
| DELETE | `/api/admin/shop/items/:id` | Устгах — **зөвхөн захиалгагүй** бол (эс бөгөөс `409`) |
| GET | `/api/admin/shop/orders` | Сүүлийн 200 захиалга |
| PATCH | `/api/admin/shop/orders/:id` | `{status}` — pending / shipped / done / cancelled |

**Лотын бие** (`POST` / `PATCH`):

```jsonc
{
  "code": "LOT 046",          // давхардвал 409
  "title": "Samsung 55\" QLED TV",
  "subtitle": "…",            // заавал биш
  "description": "…",         // заавал биш, 4000 тэмдэгт хүртэл
  "imageUrl": "/uploads/…",   // /api/admin/uploads-аас буцсан зам; '' → зураг авах
  "startPrice": 1,            // зөвхөн үүсгэхэд
  "status": "scheduled",      // scheduled | live
  "startsAt": 1756738800000,  // ноорог лот автоматаар live болох unix ms эсвэл ISO; '' = хуваарьгүй
  "rounds": [                 // Round бүрийн тохиргоо; өгвөл бүтнээр нь солино
    { "durationMin": 30, "resetSec": 30, "bidsRequired": 15 },   // 30 мин, 30с сэргэх
    { "durationMin": 60, "resetSec": 30, "bidsRequired": 20 },   // 1 цаг
    { "durationMin": 30, "resetSec": 5,  "bidsRequired": null }  // босгогүй, 5с уралдаан
  ]
}
```

> **Нэгж**: `durationMin` нь **минут**, `resetSec` нь **секунд**. DB-д хоёулаа секундээр
> хадгалагдана (`duration_sec`, `reset_sec`).

`resetSec` нь Round-ын уртаас урт байж болохгүй. `rounds` өгөөгүй бол анхдагчаар
**10 Round × 30 мин (30с сэргэх) × 15 bid + сүүлийн Round босгогүй**.

`GET /api/lots/:id` нь `schedule[]` буцаана — Round бүрийн товлосон эхлэх/дуусах цаг.
Хэрэглэгчид лотын хуудсанд ил харагдана.
`total_stages` нь массивын уртаас гарна. PATCH-д `rounds` өгвөл одоогийн Round хүрээнд багтаж,
**таймер шинэ хугацаагаар дахин эхэлнэ**.

`status: "closed"` гэж PATCH хийхийг татгалзана — хаахдаа `/close` дуудна (ялагч, Token
тооцоо хийгдэх ёстой). Хаагдсан лотыг дахин нээх боломжгүй.

## Санал хураалт

`PUT /api/admin/polls/:id` нь нэр дэвшигчдийн жагсаалтыг **бүтнээр нь тааруулна**:

```jsonc
{
  "title": "Дараагийн лотыг та сонго",
  "subtitle": "…",
  "maxPicks": 1,              // хэрэглэгч бүр хэдэн бараанд санал өгөх вэ
  "closesInMin": 1080,        // closes_at = одоо + энэ минут
  "status": "open",           // draft | open | closed
  "candidates": [
    { "id": 4, "title": "…", "tag": "Техник", "baseVotes": 412 },  // id-тай нь шинэчилнэ
    { "title": "Шинэ бараа", "tag": "Гаджет" }                      // id-гүй нь шинээр үүснэ
  ]
}
```

Жагсаалтад байхгүй болсон нэр дэвшигч саналынхаа хамт устана. `status: "open"` болгоход
**бусад нээлттэй санал хураалт автоматаар хаагдана** — нэг зэрэг зөвхөн нэг нь идэвхтэй.

Саналын тоо = `base_votes` (админ тавьдаг суурь) **+** `poll_votes`-д бүртгэгдсэн бодит санал.
Нэг хэрэглэгч нэг нэр дэвшигчид нэг л удаа санал өгнө (PK хангана); `maxPicks: 1` үед өөр
барааг сонговол санал шилжинэ, ижлийг нь дахин дарвал буцаана.

## Хэрэглэгчийн дүрс

Bid feed дэх дугуй дүрсний өнгийг хэрэглэгч өөрөө сонгоно (`users.avatar_color`).
Палитр нь сервер талд эрх мэдэлтэй жагсаалт (`AVATAR_COLORS`) — клиент дурын hex
илгээж чадахгүй, палитраас гадуур утга `400` буцаана.

Сонгоогүй хэрэглэгчид `id % 8`-аар **тогтвортой** өнгө оноогдоно — нэг хүн үргэлж
ижил өнгөтэй харагдана. (Өмнө нь өнгийг feed дэх байрлалаар онооход нэг хүн мөр
солигдох бүрт өнгөө сольдог байсан.)

## Token дэлгүүр

Token эдийн засгийн гарц: аукцион хаагдахад ялаагүй оролцогчид Token авдаг (`token_earn`),
дэлгүүрээс бараа солиход зарцуулагдана (`token_spend`).

`POST /api/shop/redeem` нь **нэг транзакцад**: үлдэгдэл шалгах → Token хасах → нөөц
хорогдуулах → захиалга үүсгэх → гүйлгээ бичих. Үлдэгдлийг транзакц дотор дахин уншдаг тул
зэрэг ирсэн хоёр хүсэлт нэг Token-ыг хоёр удаа зарцуулж чадахгүй.

- `stock: null` = хязгааргүй. Тоотой бол 0 болмогц `soldOut`.
- Захиалгад `title`/`tokens`-ийг тухайн үеийн байдлаар нь хуулж хадгална — бараа хожим
  засагдсан ч түүх өөрчлөгдөхгүй.
- Захиалга **цуцлахад Token болон нөөц буцна**; цуцлаастай нь буцааж идэвхжүүлэхэд дахин
  хасагдана. Хоёр талдаа тэнцүү тул цуцлаад сэргээх циклээр агуулах хийсвэрээр өсөхгүй.
- Захиалгатай барааг устгах боломжгүй (`409`) — түүхийг таслахгүйн тулд нуухыг санал болгоно.

## Кредит багц

Багцууд `credit_packs` хүснэгтэд байна — Хэтэвч хуудас mock жагсаалтгүй, шууд эндээс уншина.
Анхны migration нь хүснэгт хоосон бол 10/25/50/100 кредитийн 4 багцыг үүсгэнэ.

- `perCredit` (нэг кредитийн үнэ) нь **сервер талд** бодогдоно — админ гараар оруулахгүй тул
  үнэ засахад тэс өөр тоо үлдэх эрсдэлгүй.
- `best` ("ХАМГИЙН АШИГТАЙ") **нэг л багцад** байна — өөр багцад тавихад бусдаас нь автоматаар хасагдана.
- `status: "hidden"` багц `/api/wallet/packs`-д гарахгүй, `topup`-д ч `404` буцаана.
- Зарагдсан багцыг устгах боломжгүй (`409`) — гүйлгээний түүх багцын `id`-г лавладаг тул нуухыг санал болгоно.

## Хэрэглэгч удирдах

`PATCH /api/admin/users/:id` нь `credits`/`tokens`-ыг **шинэ үлдэгдэл** болгож тавина; зөрүү нь
`admin_adjust` гүйлгээгээр (`meta: {by, field}`) бүртгэгдэнэ — Төлбөр хуудсанд "Админ гараар
өөрчлөв · <имэйл>" гэж харагдана.

- `blocked=1` хэрэглэгч нэвтэрч ч чадахгүй (`login`, `google`), **өмнө авсан токен нь ч**
  `requireUser`-т `403` авна — блок нь идэвхтэй session-ыг тэр дор нь тасална.
- Админ **өөрийгөө хаах / өөрийн эрхээ хасах** боломжгүй (сүүлчийн админ түгжигдэхээс сэргийлнэ).
- `DELETE` нь зөвхөн **bid, захиалга, урилгагүй** хэрэглэгчид ажиллана. Эс бөгөөс `409` нь
  яг ямар түүх саад болж байгааг нэрлэнэ (`users.referred_by` FK тул урьсан хүнтэйг нь устгавал холбоос тасарна).

## Зураг

Байршуулсан файл `server/data/uploads/`-д санамсаргүй UUID нэрээр хадгалагдаж, `/uploads/<файл>` замаар статикаар үйлчилнэ (git-д ordoggүй). `imageUrl` талбар зөвхөн энэ хэлбэрийн замыг хүлээж авна — гадны URL болон `..` агуулсан замыг татгалзана.

Файл автоматаар цэвэрлэгдэх тохиолдол: зураг солих (хуучин нь устана), лот устгах. Хэмжээ хэтэрсэн upload дутуу бичигдсэн файлаа өөрөө устгана.

> **Frontend талд:** API өөр origin дээр (`:4000`) сууж байгаа тул зургийн замыг `imageSrc()` (`src/lib/api.ts`) -ээр бүтэн URL болгоно.

🔒 = `Authorization: Bearer <token>` · 👑 = админ эрх (`403` эс бөгөөс)

## WebSocket (`/ws`)

Бүх клиентэд цацна (клиент `lotId`-аар шүүнэ):

- `{type:'bid', lotId, price, endsAt, stage, bidCount, bid:{user,inc}, serverNow}`
- `{type:'round', lotId, stage, endsAt, roundDurationSec, roundBidsRequired, serverNow}` — Round ахив
- `{type:'lot_closed', lotId, code, finalPrice, winner, serverNow}`

Countdown-ыг клиент дээр `endsAt - serverNow` зөрүүгээр тооцно (сервер цаг эрх мэдэлтэй).

## Тоглоомын дүрэм (сервер талд)

- 1 bid = 1 кредит, үнэ +1/2/3₮
Round бүр **хоёр хугацаатай**, гэхдээ ажиллагаа нь тэс өөр:

- `reset_sec` — **сэргэх** (секундээр). **Timer дээр гүйж байгаа хугацаа энэ.**
  Bid ирэх бүрд эхнээсээ тавигдана (`ends_at = now + reset_sec`).
- `duration_sec` — **үргэлжлэх** (админд минутаар). **Engine-д огт нөлөөлөхгүй** —
  зөвхөн Round бүр хэдээс хэд хүртэл үргэлжлэхийг тооцож хэрэглэгчид харуулах зорилготой.

Хоёр л дүрэм:

1. **Timer тэглэвэл аукцион ХААГДАНА** — хэн ч bid хийлгүй `reset_sec` өнгөрсөн тул
   хамгийн сүүлд bid хийсэн хүн ялна. (Round ахихгүй.)
2. **Bid босго давбал дараагийн Round эхэлнэ** — timer шинэ Round-ын `reset_sec`-ээр
   дахин эхэлж, хуваарь урагшилж дахин тооцоологдоно.
   `bids_required = 0` → хязгааргүй: тэр Round зөвхөн 1-р дүрмээр л дуусна.
   Сүүлийн Round дээр босго давбал үргэлжлэх Round үлдээгүй тул аукцион хаагдана.

Хуваарь: `GET /api/lots/:id` → `schedule[]` (Round бүрийн товлосон эхлэх/дуусах цаг).
- Сүүлийн Round дуусмагц лот хаагдана
- `starts_at` тавьсан ноорог лотыг engine товлосон цагт нь автоматаар live болгоно
- Өмнөх Round-д оролцоогүй бол **5 кредит** төлж орно (gating)
- Хаагдахад ялагчаас бусад оролцогчийн bid бүр = **1 Token** (consolation)
- Referral: урьсан хүн **анхны** худалдан авалтаа хиймэгц урьсан хүнд +2 кредит.
  `GET /api/referral` нь `pending`-ийг "бүртгүүлсэн ч худалдан авалт хийгээгүй" гэж тоолно.

## Дараагийн алхам (production)

- Имэйл илгээгч холбох (одоо `devVerifyCode` хариунд буцдаг — УСТГАХ!)
- Жинхэнэ QPay merchant API
- `JWT_SECRET` env тавих
- Hosting: үргэлж асаалттай орчин шаардлагатай (аукцион хаагч engine) — Oracle Cloud Always Free / VPS. Унтдаг үнэгүй hosting (Render free) тохирохгүй.
- Өсөлтөд: SQLite → Postgres (Neon) шилжилт
