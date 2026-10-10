# Shopify 版：分步操作指南

目标和自建站一样：上架 → 测试下单支付 → 代发 / 手动发货 → 买家收到发货通知。全程用测试支付，不花真钱。

> Shopify 的政策和后台界面变化比较快。下面的菜单名称以英文后台为准，如果和实际界面对不上，以 [Shopify Help Center](https://help.shopify.com) 为准。

## 0. 开店方式（二选一）

| 方式 | 费用 | 适合 |
|---|---|---|
| **开发店（推荐练习用）**：注册 [Shopify Partners](https://www.shopify.com/partners)，在后台创建 development store | 免费、没有期限 | 纯熟悉流程，能装 App、能用测试网关下单，但不能真实收款 |
| **免费试用**：shopify.com 直接注册 | 试用期结束后按月付费 | 打算接下来真开店 |

开发店后续可以转成付费店铺正式营业。

## 1. 基础设置

Settings 里先配好这几项：

- **General**：店铺名称、店铺货币选 USD
- **Shipping and delivery**：建一个运费方案，比如美国统一 $4.99，满 $50 包邮（跟自建站的规则一样，方便对比）
- **Notifications**：看看 Order confirmation、Shipping confirmation 这两个邮件模板。Shopify 会自动发这些邮件，相当于自建站的 `email.ts`

## 2. 上架商品

### 2a. 手动上架（自己发货）

Products → Add product：填标题、描述、图片、价格、Cost per item（成本）；在 Variants 里加规格（比如颜色），状态设为 Active。

### 2b. 从供应商导入（代发）

Apps → 在 App Store 里搜索安装以下任意一个：

- **CJdropshipping**：和自建站对接的是同一个供应商，方便对照
- **DSers**：对接速卖通（AliExpress）商品，国内卖家用得很多

以 CJ 为例：

1. 安装后用 CJ 账号登录并授权给店铺
2. 在 CJ App 里搜商品 → List / Add to store，设置加价规则
3. 回到 Shopify Products，确认商品已同步，检查标题、价格和图片后上架

自建站里的「CJ 选品 → 导入 → 默认下架，检查后再上架」做的就是这件事。

## 3. 配置测试支付

Settings → Payments：

- **开发店**：启用 **Bogus Gateway**（测试网关）。如果看到 Shopify Payments 区块，需要先点 Manage → 切换到第三方服务商，再选 Bogus Gateway。
  - 测试卡号：卡号填 `1` 模拟付款成功，填 `2` 模拟付款失败；姓名填 `Bogus Gateway`，有效期填任意未来日期，CVV 填任意 3 位数
- **PayPal**：在 Payments 里激活 PayPal（真实开店时，大陆卖家主要用它收款）。练习阶段用 Bogus Gateway 就够了。

注意：**开发店里不要用真实网关下单，也不要用 Draft Order（草稿订单）测试**，否则可能导致店铺结账功能被锁，需要联系 Partner Support 解锁。

收款方案的背景知识：Shopify Payments 不支持中国大陆主体开通，大陆卖家一般用 PayPal，再加上 PingPong、连连（LianLian）等第三方信用卡网关。使用第三方网关时，Shopify 会额外收一笔交易手续费。

## 4. 下一笔测试订单

1. 打开店铺前台（Online Store → 眼睛图标），把一个手动上架的商品和一个 CJ 商品一起加入购物车
2. 结账：填邮箱和美国收货地址，用上面的 Bogus 卡号付款
3. 回到后台 Orders，能看到这笔订单，状态为 **Paid / Unfulfilled**

## 5. 发货

### 自己发货的商品

订单详情 → **Fulfill item** → 填运单号和物流公司 → 勾选 Send shipping details to customer → Fulfill。买家会收到 Shipping confirmation 邮件。

### CJ 代发的商品

1. CJ App 会自动拉取这笔订单。如果没有自动同步，在 App 里手动 Sync orders
2. 在 CJ 里确认物流方式 → **付款**（从 CJ 余额或绑定的卡扣款）→ CJ 开始备货、发货
3. CJ 发货后，运单号会自动回传到 Shopify，订单变成 Fulfilled，并自动给买家发邮件
4. 练习时：不付款的话 CJ 就不会发货，测完在 CJ 里取消订单即可

这一步对应自建站里的「推送到 CJ 下单 → 到 CJ 后台付款 → 同步物流」。

一个订单里既有手动商品又有 CJ 商品时，Shopify 也会把它们分成不同的 fulfillment，跟自建站拆分履约单的逻辑一样。

## 6. 退款

订单详情 → **Refund** → 选择商品和金额 → 退款。如果 CJ 订单已经付款，需要另外在 CJ 里申请取消或售后。

## 两边概念对照

| Shopify | 自建站代码 |
|---|---|
| Product / Variant | `Product` / `Variant` 表 |
| Cost per item | `Variant.costCents` |
| Checkout | `/checkout` + `POST /api/checkout` |
| Payment gateway（PayPal / Bogus） | `lib/paypal.ts` / 模拟支付 |
| Order：Paid / Unfulfilled / Fulfilled | `Order.status`：PAID → FULFILLING → SHIPPED |
| Fulfillment（每个包裹一个） | `Fulfillment` 表，按供应商拆分 |
| CJ / DSers App 订单同步 | `lib/fulfillment.ts` 的 `placeCJOrder` / `syncCJFulfillment` |
| Notifications 邮件模板 | `lib/email.ts` + 后台「发件箱」 |
| Order timeline | `OrderEvent` 表 / 订单详情「时间线」 |
| Refund | 订单详情「全额退款」→ PayPal refund API |

## 练完之后可以想想

- Shopify 里你每点一个按钮，背后对应自建站里的哪段代码？
- CJ App 是怎么知道 Shopify 有新订单的？（Shopify webhook `orders/create`，跟自建站的 PayPal webhook 是一个思路）
- 如果要真开店，什么情况下选 Shopify，什么情况下选自建？（启动速度、月费和抽成、App 生态，对比定制能力和数据掌控）
