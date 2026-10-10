# 独立站全流程练习

用两种方式走一遍跨境独立站的完整链路：**上架商品 → 买家下单 → 支付 → 供应商代发 / 自己发货 → 填运单号 → 通知买家 → 售后退款**。

| | 自建站（`web/`） | Shopify（[docs/shopify-guide.md](docs/shopify-guide.md)） |
|---|---|---|
| 目的 | 弄懂每个环节的数据和接口怎么流转 | 熟悉行业里主流 SaaS 的操作方式 |
| 技术 | Next.js 16 + Prisma + SQLite | 后台配置 + App |
| 支付 | PayPal（沙箱）/ 本地模拟 | Bogus Gateway 测试网关 / PayPal |
| 代发 | 直接对接 CJdropshipping API | 安装 CJ / DSers App |

---

## 自建站：快速开始

```bash
cd web
pnpm install
pnpm db:setup   # 建表 + 写入 3 个示例商品
pnpm dev        # http://localhost:3000
```

- 店铺前台：http://localhost:3000
- 管理后台：http://localhost:3000/admin（密码见 `web/.env` 的 `ADMIN_PASSWORD`，默认 `admin`）

配置都在 `web/.env`（模板见 `web/.env.example`）。**外部服务都是可选的**：没配 PayPal 就自动用模拟支付，没配 CJ 就只能手动发货，没配 Resend 邮件就只记录到后台「发件箱」。

## 当前店铺：Tidy Transit（旅行收纳）

垂直品牌站，极简米白风格，**全站包邮、仅发美国**。商品线：

| 商品 | 构成 | 售价 | 单件毛利（估） |
|---|---|---|---|
| The Carry-On Kit | 8 件套收纳袋 + 挂式洗漱包 + RFID 护照夹（CJ 仓） | $38.99 | ~$14.4 |
| The Tech Duo | 双层理线包 + 小号理线包（供应商直发） | $49.99 | ~$20.6 |
| Double-Layer Tech Organizer | 单品 | $34.99 | ~$18.2 |
| Compact Tech Pouch | 单品，灰 / 黑 | $29.99 | ~$13.4 |

- 目录由 `pnpm catalog:tidy` 生成（`web/scripts/catalog-tidy-transit.ts`）：从 CJ 拉取最新成本和运费，按 slug 更新商品，并下架目录外的商品。改价格、文案、套装组成都改这个文件，然后重新运行
- 套装主图在 `web/public/kits/`，是用 CJ 规格图拼成的 2×2 网格。买到样品后建议换成自己拍的图
- **套装只能用同一个仓库的商品组合**：CJ 仓和供应商直发的商品没有共同的物流线路。买家混买时，推送 CJ 会自动拆成多个包裹
- 政策页面在 `web/src/lib/policies.ts`，是模板，**上线前务必按实际情况修改**（尤其是退货条款）
- 商品文案里「splash-resistant（防泼水）」等描述来自供应商资料，收到样品后请核实

## 走一遍完整流程

### 1. 上架商品

两种来源：

- **自己发货的商品**：后台 → 商品 → 新建商品，填标题、图片 URL、规格和售价、成本。适合自己有货，或者从 1688 采购后自己发的情况。
- **CJ 代发的商品**：后台 → CJ 选品，搜索英文关键词，点「导入」。导入时会带上 CJ 的商品和规格 id（`pid` / `vid`）。**导入后默认是下架状态**，检查标题和价格后勾选「上架」。

### 定价：全站包邮

店铺对买家**全部包邮**，运费由我们承担并计入售价：

```
售价   = 商品成本 × 加价倍数(CJ_MARKUP，默认 2.5) + 发往 CJ_SHIP_TO(默认 US) 最便宜线路的运费，尾数取 .99
毛利   = 售价 − 商品成本 − 运费成本 − 支付手续费（估，4.4% + $0.30）
```

例：CJ 托特包成本 $6.51，发往美国运费 $10.47 → 售价 $26.99，单件毛利约 $8.52（32%）。

- 运费按重量试算：同重量的规格只调一次接口。CJ 接口限制每秒 1 次，代码里已经做了排队
- 商品编辑页会实时显示每个规格的毛利：红色表示亏损，黄色表示低于 15%。运费试算失败的规格会标红，提示你补填
- 自己发货的商品，需要手动填写「运费成本」，并把它算进售价
- 订单详情显示这一单的预估毛利
- 注意：定价按发往美国的运费计算，发往其他国家的运费可能更高

### 2. 买家下单并支付

前台选商品 → 加购物车 → 结账页填邮箱和收货地址 → 点 PayPal 按钮。

PayPal 沙箱付款需要一个**沙箱买家账号**：登录 [developer.paypal.com](https://developer.paypal.com) → Testing Tools → Sandbox Accounts，里面有一个自动生成的 `Personal` 账号，点开就能看到邮箱和密码。在弹出的 PayPal 窗口里用这个账号登录并付款即可，不会扣真钱。

支付链路（对应 `src/app/api/`）：

```
浏览器                     我们的服务端                         PayPal
  │ 点击 PayPal 按钮            │                                   │
  ├── POST /api/checkout ──────►│ 创建本地订单（PENDING）             │
  │                             ├── 创建 PayPal 订单 ──────────────►│
  │◄──────── paypalOrderId ─────┤                                   │
  │ 弹窗登录沙箱买家、确认付款 ────────────────────────────────────►│
  ├── POST /api/payments/capture►│                                   │
  │                             ├── capture 扣款 ─────────────────►│
  │                             │ 校验金额 → 订单 PAID → 发确认邮件  │
  │                             │ → 按供应商拆分履约单                │
  │◄──── 跳转订单页 ─────────────┤                                   │
  │                             │◄── webhook（兜底，需公网地址）─────┤
```

### 3. 发货

后台 → 订单 → 订单详情。一个订单会**按供应商拆成多个履约单**：

- **手动发货**：填物流商和运单号，点「标记已发货」，系统自动给买家发邮件，邮件里带 17track 的追踪链接。
- **CJ 代发**：点「推送到 CJ 下单」，系统会先试算运费、自动选最便宜的线路，再调用 CJ 接口创建订单。然后**到 CJ 后台给这笔订单付款**（我们不自动扣你的 CJ 余额），CJ 才会发货。CJ 发货后点「从 CJ 同步物流」，或者定时调用 `pnpm cj:sync`，拿到运单号后自动标记发货并通知买家。
  - `.env` 里设 `CJ_AUTO_ORDER=true` 后，买家一付款就自动推送到 CJ。
  - CJ 没有沙箱：推送过去的订单只要不付款就不会发货，测完到 CJ 后台取消即可。

所有履约单都发货后，订单状态变成「已发货」。买家可以通过邮件里的链接查看订单和物流（`/orders/:id?token=...`，不需要注册）。

### 4. 售后

订单详情 → 「全额退款」，会调用 PayPal 退款接口并邮件通知买家。

每一步都会记录在订单详情的**时间线**里，方便对照理解。

## 配置 CJdropshipping

1. 注册 [cjdropshipping.com](https://cjdropshipping.com)（免费）
2. My CJ → Authorization → API，生成 API Key
3. 填到 `web/.env` 的 `CJ_API_KEY`，然后重启 `pnpm dev`

注意：CJ 的 access token 5 分钟内只能申请一次，代码里已经把它缓存在数据库中（`Setting` 表）。

## 配置 PayPal Webhook（可选）

正常流程靠前端回调 capture 就够了。Webhook 是兜底：买家付完款直接关掉页面的情况，靠它也能把订单标记为已支付。

1. 用 `cloudflared tunnel --url http://localhost:3000` 或 ngrok 拿到一个公网地址
2. developer.paypal.com → 你的 App → Webhooks → 添加 `https://<公网地址>/api/webhooks/paypal`，勾选 `Payment capture completed` 和 `Payment capture refunded`
3. 把生成的 Webhook ID 填到 `PAYPAL_WEBHOOK_ID`

## 目录结构

```
web/
├── prisma/schema.prisma        数据模型：Product/Variant → Order/OrderItem → Fulfillment
├── src/lib/
│   ├── paypal.ts               PayPal 下单 / 扣款 / 退款 / webhook 验签
│   ├── cj.ts                   CJ 选品 / 运费 / 下单 / 查物流
│   ├── orders.ts               建单、支付成功、退款（都是幂等的）
│   ├── fulfillment.ts          拆履约单、推送 CJ、同步物流、标记发货
│   └── email.ts                邮件模板 + 发件箱
├── src/app/(shop)/             前台：首页、商品、购物车、结账、订单页
├── src/app/admin/              后台：订单、商品、CJ 选品、发件箱
└── src/app/api/                结账、扣款、webhook、定时同步
```

## 上线前还要做的

这个项目是用来跑通流程的，要真正对外卖货，还需要：

- **收款**：PayPal 切换到 Live 凭证（`PAYPAL_ENV=live`），配好 webhook
- **数据库**：SQLite 换成 Postgres（改 `schema.prisma` 的 provider）
- **部署**：Vercel / Railway / 自己的服务器，绑定域名并启用 HTTPS
- **邮件**：Resend 验证自己的域名，配置 `RESEND_API_KEY` 和 `MAIL_FROM`
- **合规页面**：隐私政策、退换货政策、运费说明、联系方式（PayPal 风控和广告平台都会检查）
- **后台安全**：设置强 `ADMIN_PASSWORD` 和随机的 `SESSION_SECRET`
- **定时任务**：每小时调用一次 `/api/cron/cj-sync`
- **还没实现的**：库存管理、优惠券、税费、多币种、弃单挽回、数据统计
