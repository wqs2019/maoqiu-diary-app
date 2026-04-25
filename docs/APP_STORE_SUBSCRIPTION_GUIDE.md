# 🍎 毛球日记 App Store 连续包月订阅接入与落地实现方案 (纯自研云开发方案)

本方案基于 **React Native (`react-native-iap`)** + **腾讯云开发 (CloudBase)** 纯自研实现。不依赖第三方付费平台（如 RevenueCat），避免了额外费用，同时数据完全掌握在自己手中。

## 1. 核心架构与原理
自研方案的核心在于“收据校验”和“状态兜底”，主要分为以下几个环节：

1. **客户端发起购买**：用户通过 `react-native-iap` 唤起苹果内购支付。
2. **客户端获取票据 (Receipt)**：支付成功后，苹果返回一段 Base64 编码的加密字符串（Receipt）。
3. **服务端主动校验**：客户端将 Receipt 发给你的云函数，云函数拿着 Receipt 和共享密钥（Shared Secret）去苹果服务器 `/verifyReceipt` 校验真伪，并解析出 `expires_date`。
4. **更新数据库**：云函数将 `isVip: true`、`vipExpireAt` (到期时间) 和 `latestReceipt` (最新票据) 存入数据库。
5. **被动回调 (Webhook - 建议接入)**：在 App Store Connect 配置 App Store Server Notifications V2。当用户下个月自动扣款成功或退款时，苹果会主动发 HTTP 请求给你的云函数，你据此更新数据库。
6. **主动同步兜底 (Active Polling)**：每次用户打开 App 或登录时，调用云函数。云函数拿着数据库存的 `latestReceipt` 再次去苹果服务器校验一次，如果发现自动续费了，就延长 `vipExpireAt`；如果过期了，就把 `isVip` 改为 `false`。

## 2. 数据库扩展
现有的 `users` 集合需要扩展以下字段：
- `isVip` (boolean): 当前是否是 VIP
- `vipExpireAt` (Date): VIP 过期时间
- `latestReceipt` (string): 用户最新一次支付的凭证（用于云函数主动向苹果查询续期状态）

## 3. 云函数实现
云函数 `user` 中需要增加校验收据的逻辑（已在 `cloudfunctions/user/index.js` 中实现）：
- `verifyPurchase` Action：接收客户端发来的 Receipt，去苹果服务器校验，校验通过则写入数据库开通 VIP。
- `syncVipStatus` Action：用户冷启动 App 时调用。提取数据库里的 `latestReceipt` 再次发给苹果校验，实现续期状态的被动更新。

*注意：需要在云函数的环境变量中配置 `APPLE_SHARED_SECRET`（从 App Store Connect 获取的 App 专用共享密钥）。*

## 4. 客户端 (React Native) 接入流程

### 4.1 安装依赖
```bash
npm install react-native-iap
```

### 4.2 客户端代码示例
```typescript
import * as RNIap from 'react-native-iap';
import cloud from '@cloudbase/react-native-sdk';

const itemSkus = Platform.select({
  ios: [
    'com.maoqiu.diary.monthly',
    'com.maoqiu.diary.quarterly',
    'com.maoqiu.diary.half_yearly',
    'com.maoqiu.diary.yearly'
  ],
});

// 1. 初始化并获取商品
const initIAP = async () => {
  await RNIap.initConnection();
  const products = await RNIap.getSubscriptions({ skus: itemSkus });
  return products;
};

// 2. 发起购买
const purchaseVIP = async (sku) => {
  try {
    const purchase = await RNIap.requestSubscription({ sku });
    
    // 3. 将收据发给云函数校验
    const receipt = purchase.transactionReceipt;
    if (receipt) {
      const res = await cloud.callFunction({
        name: 'user',
        data: {
          action: 'verifyPurchase',
          data: {
            _id: '当前用户ID',
            receiptData: receipt
          }
        }
      });
      
      if (res.result.success) {
        // 开通成功，更新本地状态
        useAuthStore.getState().updateVipStatus(true);
      }
    }
  } catch (err) {
    console.warn(err);
  }
};

// 4. 恢复购买 (供苹果审核使用)
const restorePurchases = async () => {
  try {
    const purchases = await RNIap.getAvailablePurchases();
    if (purchases && purchases.length > 0) {
      // 取最新的收据去校验
      const latestPurchase = purchases[purchases.length - 1];
      // 调用云函数 verifyPurchase...
    }
  } catch (err) {
    console.warn(err);
  }
};
```

## 5. 防刷与企业级建议
1. **Receipt 绑定**：目前 `verifyPurchase` 逻辑是将收据绑定给请求的 `_id`，若要防止多个账号共享一个 Apple ID 购买的 VIP，可以在数据库记录 `transaction_id` 作为唯一索引。
2. **沙盒与生产环境**：苹果校验接口分为 `sandbox.itunes.apple.com` 和 `buy.itunes.apple.com`。我们的云函数已经实现了：先请求生产环境，如果返回状态码 `21007`，则自动切换到沙盒环境重试。
3. **App Store Connect 审核要求**：
   - 界面上必须有“恢复购买”按钮（调用 `getAvailablePurchases`）。
   - 必须有“服务协议”和“隐私政策”链接。
   - 必须明码标价并展示连续包月说明。