## Context

德州记分板小程序（hold-em-board）当前使用 Vant Weapp v1.11.7 作为 UI 组件库，已完成全量 Vant 组件替换（10 个页面、1 个自定义组件 trend-chart）。

当前使用的 Vant 组件清单：
- `van-button`：8 个页面（index、group/list、group/detail、group/create、match/detail、match/create、score/input、rules/edit）
- `van-dialog`：2 个页面（group/list 加入弹窗、match/detail 结束赛程弹窗）
- `van-tag`：3 个页面（group/list、group/detail、match/detail）
- `van-field`：4 个页面（group/create、match/create、score/input、rules/edit）
- `van-empty`：3 个页面（group/list、group/detail、member/detail）
- `van-skeleton`：2 个页面（index、group/list）
- `van-toast`：8 个页面（几乎所有页面）
- `van-tabs` / `van-tab`：1 个页面（group/detail）

项目配置：
- `project.config.json`：`packNpmManually: true`，已配置 `packNpmRelationList`
- `package.json`：生产依赖 `@vant/weapp: ^1.11.7`
- 基础库版本 3.15.2
- 导航栏背景色 `#1a1a2e`（深蓝），品牌色 `#e94560`（红色）

## Goals / Non-Goals

**Goals:**
- 将 Vant Weapp 完整替换为 TDesign 小程序版（`tdesign-miniprogram`）
- 启用暗黑模式，打造深色赌桌风格的沉浸式界面
- 通过 CSS 变量体系定制全局主题（品牌色、背景色、圆角等）
- 保持现有业务逻辑完全不变，仅改造 UI 层和样式层
- 分阶段渐进式迁移，每阶段可独立验证

**Non-Goals:**
- 不重构业务逻辑或数据层
- 不改造分数表格（match/detail 的 5 列 flex 布局）
- 不替换原生 TabBar（保持 app.json 中的 tabBar 配置）
- 不改造自定义组件 trend-chart（canvas 绑定图表，与 UI 库无关）
- 不做页面结构重构（保持现有页面路由和分包结构）

## Decisions

### Decision 1: 选择 TDesign 小程序版而非其他 UI 库

**选择**：`tdesign-miniprogram`

**替代方案**：Lin UI、Wux Weapp、WeUI

**理由**：
- 腾讯官方出品，持续活跃维护，长期可靠性有保障
- 原生支持暗黑模式（Dark Mode），通过 CSS 变量一键切换
- 完整的 CSS 变量设计 Token 体系，支持深度主题定制
- 组件丰富度与 Vant 相当，迁移映射关系清晰
- 设计语言更现代、更有质感，适合游戏/娱乐类应用

### Decision 2: 采用暗黑模式作为默认主题

**选择**：默认使用暗黑模式，配合自定义品牌色

**替代方案**：保持浅色主题，仅替换组件库

**理由**：
- 德州扑克天然适合暗色氛围（深色赌桌、昏暗灯光）
- 暗黑模式在夜间使用更护眼，德州扑克多在晚间进行
- TDesign 的暗黑模式通过 CSS 变量实现，切换成本极低
- 暗色背景下，品牌红色 `#e94560` 和金色排名更加醒目

### Decision 3: 全局主题定制方案

**选择**：在 `app.wxss` 中通过 CSS 变量覆盖 TDesign 的设计 Token

**方案详情**：
```css
page {
  /* 品牌色 */
  --td-brand-color: #e94560;
  --td-brand-color-light: rgba(233, 69, 96, 0.1);
  /* 暗黑背景 */
  --td-bg-color-page: #0f0f23;
  --td-bg-color-container: #1a1a2e;
  --td-bg-color-secondarycontainer: #16213e;
  /* 文字色 */
  --td-text-color-primary: #eaeaea;
  --td-text-color-secondary: #a0a0b0;
  --td-text-color-placeholder: #666680;
  /* 功能色 */
  --td-success-color: #4caf50;
  --td-error-color: #f44336;
  --td-warning-color: #FFD700;
}
```

**理由**：
- CSS 变量方案是 TDesign 官方推荐的主题定制方式
- 无需修改组件源码，升级 TDesign 版本时不受影响
- 可以精确控制每个设计 Token，实现赌桌风格

### Decision 4: Vant → TDesign 组件映射策略

**选择**：一对一映射替换，API 差异通过适配层处理

| Vant 组件              | TDesign 组件             | API 差异说明                                                                                                      |
| ---------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `van-button`           | `t-button`               | `type="danger"` → `theme="danger"`；`plain` → `variant="outline"`；`round` → `shape="round"`                      |
| `van-dialog`           | `t-dialog`               | `use-slot` → `slot` 方式类似；`show` → `visible`；`bind:close` → `bind:close` / `bind:confirm` / `bind:cancel`    |
| `van-tag`              | `t-tag`                  | `type` 属性值映射：`success` → `success`，`primary` → `primary`，`warning` → `warning`；`round` → `shape="round"` |
| `van-field`            | `t-input`                | `label` → `label`；`placeholder` → `placeholder`；`type` → `type`；`bindinput` → `bind:change`                    |
| `van-empty`            | `t-empty`                | `description` → `description`；`image` → `icon`                                                                   |
| `van-skeleton`         | `t-skeleton`             | `title` → `theme="paragraph"`；`row` → `row-col`                                                                  |
| `van-toast`            | `t-toast` / `t-message`  | JS API 差异：`Toast.success()` → `Toast({ theme: 'success' })` 或使用 `Message`                                   |
| `van-tabs` / `van-tab` | `t-tabs` / `t-tab-panel` | `active` → `value`；`bind:change` → `bind:change`；`van-tab title` → `t-tab-panel label`                          |

### Decision 5: 渐进式迁移策略

**选择**：分 3 个 Sprint 迁移，与之前 Vant 引入时的策略一致

**Sprint 划分**：
- **Sprint 1（基础设施 + 核心组件）**：安装 TDesign、配置暗黑主题、替换 Button / Tag / Skeleton
- **Sprint 2（交互组件）**：替换 Dialog / Field→Input / Toast / Empty
- **Sprint 3（高级组件 + 收尾）**：替换 Tabs、清理 Vant 残留、全局样式优化

**理由**：
- 渐进式替换降低回归风险
- Sprint 1 完成后即可看到暗黑主题效果，快速验证视觉方向
- 每个 Sprint 独立提交，可通过 git revert 回滚

### Decision 6: Toast / Message 反馈方案

**选择**：使用 TDesign 的 `Toast` 组件替代 Vant Toast

**方案**：
- 在页面 wxml 中放置 `<t-toast id="t-toast" />`
- 在 JS 中通过 `Toast({ context: this, selector: '#t-toast', message: '...', theme: 'success' })` 调用
- 对于轻量提示，也可考虑使用 `t-message` 组件（顶部消息条，更现代）

### Decision 7: 导航栏保持原生

**选择**：保持微信原生导航栏，通过 `app.json` 的 `window` 配置适配暗色主题

**替代方案**：使用 TDesign 的 `t-navbar` 自定义导航栏

**理由**：
- 原生导航栏性能最好，兼容性最强
- 通过 `navigationBarBackgroundColor` 设置为暗色即可满足需求
- 自定义导航栏需要处理状态栏高度、胶囊按钮位置等兼容问题，成本较高

## Risks / Trade-offs

| 风险                                       | 等级 | 缓解措施                                                                     |
| ------------------------------------------ | ---- | ---------------------------------------------------------------------------- |
| TDesign 与 Vant 的 API 差异导致迁移遗漏    | 🟡 中 | 建立完整的组件映射表，逐页面逐组件替换，每页替换后立即验证                   |
| 暗黑模式下自定义样式（卡片、排名等）不协调 | 🟡 中 | 在 Sprint 1 完成后全面审查自定义样式，统一调整为暗色系配色                   |
| E2E 测试大面积失效                         | 🟡 中 | 组件标签名从 `van-xxx` 变为 `t-xxx`，选择器需全面更新；每 Sprint 后执行回归  |
| TDesign 小程序版组件不如 Vant 成熟         | 🟢 低 | TDesign 已发布稳定版，腾讯内部大量项目使用，组件质量有保障                   |
| 包体积变化                                 | 🟢 低 | TDesign 支持按需引入，预期体积与 Vant 相当；迁移完成后移除 Vant 可能还会减小 |
| 过渡期 Vant 和 TDesign 共存                | 🟢 低 | 两个库的组件前缀不同（`van-` vs `t-`），不会冲突；过渡期包体积会临时增大     |

## Migration Plan

### Sprint 1：基础设施 + 暗黑主题 + 核心组件
1. 安装 `tdesign-miniprogram`，保留 `@vant/weapp`（过渡期共存）
2. 在微信开发者工具中重新构建 npm
3. 在 `app.wxss` 中引入 TDesign 基础样式，配置暗黑模式 CSS 变量
4. 更新 `app.json` 的 `window` 配置适配暗色主题
5. 更新 `app.wxss` 中的全局样式（`.container`、`.card` 等）适配暗色背景
6. 逐页面替换 `van-button` → `t-button`
7. 逐页面替换 `van-tag` → `t-tag`
8. 逐页面替换 `van-skeleton` → `t-skeleton`
9. 验证暗黑主题视觉效果

### Sprint 2：交互组件迁移
1. 替换 `van-dialog` → `t-dialog`（group/list、match/detail）
2. 替换 `van-field` → `t-input`（group/create、match/create、score/input、rules/edit）
3. 替换 `van-empty` → `t-empty`（group/list、group/detail、member/detail）
4. 替换 `van-toast` → `t-toast`（所有页面的 JS 和 WXML）
5. 验证所有交互流程

### Sprint 3：高级组件 + 收尾
1. 替换 `van-tabs` / `van-tab` → `t-tabs` / `t-tab-panel`（group/detail）
2. 从 `package.json` 中移除 `@vant/weapp` 依赖
3. 删除 `miniprogram_npm/@vant/` 目录
4. 清理所有页面 JSON 中残留的 Vant 组件注册
5. 优化全局暗色主题细节（阴影、边框、hover 效果等）
6. 执行完整 E2E 测试回归
7. 检查包体积

### Rollback Strategy
- 每个 Sprint 独立提交，可通过 git revert 回滚
- 过渡期 Vant 和 TDesign 共存，回滚不影响已有功能
- 最终移除 Vant 作为独立步骤，确认全部迁移完成后再执行

## Open Questions

1. **暗黑模式是否需要支持切换**：是否需要提供浅色/深色模式切换开关，还是固定使用暗色主题？建议初期固定暗色，后续可通过 CSS 变量轻松添加切换功能
2. **TabBar 是否需要适配暗色**：原生 TabBar 的 `backgroundColor` 需要改为暗色，`borderStyle` 需要调整
3. **登录页是否纳入改造**：当前登录页未使用任何 Vant 组件，是否需要引入 TDesign 组件提升体验？
4. **trend-chart 组件的配色**：canvas 绘制的趋势图需要适配暗色背景，线条颜色和文字颜色需要调整
