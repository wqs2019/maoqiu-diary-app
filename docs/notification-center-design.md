# 通知中心功能设计方案

## 一、 需求背景
目前 App 尚未实现通知中心。随着「共享日记本」功能的引入，用户需要一个集中的地方来接收和处理**共享邀请**，同时未来也需要承载**点赞、评论、系统通知**等互动信息。因此，设计一个高扩展性的通知中心是当务之急。

---

## 二、 通知类型规划 (Notification Types)

一期优先满足共享日记本的闭环，同时为后续的互动功能留出扩展空间：

1. **操作类通知 (Actionable)**
   - **共享邀请**：A 邀请 B 加入共享日记本。需包含【同意】/【拒绝】按钮。
   - 状态流转：待处理 (Pending) -> 已同意 (Accepted) / 已拒绝 (Rejected)。
2. **互动类通知 (Interactive)** *(可作为二期扩展)*
   - **点赞**：A 点赞了你的日记。点击跳转到日记详情。
   - **评论**：A 评论了你的日记。点击跳转到日记详情。
3. **系统通知 (System)**
   - **解绑通知**：对方解除了共享日记本关系。
   - **官方公告**：版本更新、活动提醒等。

---

## 三、 数据模型设计 (TCB 集合设计)

### Notifications 集合
新建 `Notifications` 集合，用于统一存储所有用户的消息：

```typescript
interface Notification {
  _id: string;
  receiverId: string; // 接收方用户 ID
  senderId?: string; // 发送方/触发方用户 ID（系统通知可为空）
  type: 'invite_shared_notebook' | 'unbind_shared_notebook' | 'like' | 'comment' | 'system'; // 通知类型
  
  // 核心内容
  title: string; // 通知主标题，如 "日记本共享邀请"
  content: string; // 通知副标题/内容，如 "「毛球」邀请你共写日记本《我们的旅行》"
  
  // 关联业务数据（便于跳转或操作）
  relatedId?: string; // 关联的业务 ID（如 Invitation ID, Diary ID 等）
  extraData?: any; // 扩展字段，例如存日记本名称、封面等，减少联表查询
  
  // 状态管理
  isRead: boolean; // 是否已读（控制小红点）
  actionStatus?: 'pending' | 'accepted' | 'rejected'; // 针对邀请类通知的处理状态
  
  createdAt: number; // 创建时间戳
}
```

---

## 四、 云函数与核心逻辑 (Cloud Functions)

### 1. 获取通知列表 (`cloudFunction: getNotifications`)
- **入参**：`{ page: 1, pageSize: 20 }`
- **逻辑**：
  1. 查询 `receiverId` 为当前用户的通知。
  2. 按照 `createdAt` 降序排列。
  3. 如果需要展示发送方头像/昵称，可通过 `senderId` 联表聚合（`aggregate` -> `lookup` 用户表），或在创建通知时直接冗余写入 `extraData` 中以提高查询性能。

### 2. 标记已读 (`cloudFunction: markNotificationRead`)
- **入参**：`{ notificationIds?: string[], markAll?: boolean }`
- **逻辑**：将指定 ID 的 `isRead` 设为 `true`。若 `markAll` 为 `true`，则将该用户所有未读消息置为已读。

### 3. 创建通知的触发时机（与共享日记本联动）
- **发起邀请时**：在 `createSharedNotebook` 云函数中，不仅要创建 `Invitation` 记录，还要向 `Notifications` 集合插入一条 `type: 'invite_shared_notebook'` 的数据，关联该 `Invitation ID`。
- **解除共享时**：在 `unbindSharedNotebook` 云函数中，向对方插入一条 `type: 'unbind_shared_notebook'` 的系统通知。

---

## 五、 UI/UX 交互规划

### 1. 入口与未读提示 (Badge)
- **位置**：底部导航栏「我的」Tab 图标右上角，或首页顶部增加 🔔 铃铛图标。
- **红点逻辑**：查询当前用户是否有 `isRead === false` 的记录。如果有，显示红点或未读数字。

### 2. 通知列表页 (Notification Center Screen)
- 页面标题：「消息通知」。
- 列表项设计 (Card)：
  - **左侧**：发送者头像（系统通知为 App Logo）。
  - **中间**：通知文案与时间（如：`刚刚`、`2小时前`）。
  - **右侧 / 底部（针对邀请卡片）**：
    - 若 `actionStatus === 'pending'`：展示绿色的【同意】和灰色的【拒绝】按钮。
    - 若已处理：按钮消失，变为灰色文本「已同意」或「已拒绝」。

### 3. 操作交互闭环 (Handling Invites)
- 用户点击【同意】按钮：
  1. 页面 loading。
  2. 调用共享日记本的 `respondInvitation` 云函数。
  3. 成功后，更新本地该条通知的 `actionStatus` 为 `accepted`，UI 切换为「已同意」。
  4. 提示「已成功加入日记本」，并可引导跳转到该日记本。

---

## 六、 实施路径 (Phase 1 配合共享日记本)

一期只实现最基础、最必要的通知能力，确保邀请流程跑通：
1. **后端**：建立 `Notifications` 集合，实现 `getNotifications` 和 `markNotificationRead` 接口。
2. **埋点**：在创建共享日记本邀请时，同步写入通知数据。
3. **前端入口**：首页顶部添加 🔔 图标，带红点逻辑。
4. **前端列表**：实现消息列表 UI，重点完成「邀请卡片」的渲染与【同意/拒绝】按钮的联调。