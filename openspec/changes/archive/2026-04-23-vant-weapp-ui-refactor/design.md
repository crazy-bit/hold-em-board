## Context

德州记分板小程序（hold-em-board）当前使用纯原生微信小程序开发，10 个页面、1 个自定义组件（loading），全局样式约 185 行。UI 体验存在明显短板：弹窗无动画、反馈机制分散、表单交互原始。

经过对 Vant Weapp v1.11.7 的深度分析（见 `docs/analysis-vant-weapp.md`），该组件库提供 70+ 个组件，支持按需引入，MIT 协议，有赞团队持续维护。Tech Leader 可行性评估结论为"技术可行、风险可控、收益明显"。

当前项目配置：
- `project.config.json` 中 `packNpmManually: false`，`packNpmRelationList` 为空
- `package.json` 中无生产依赖（仅 devDependencies: jest + miniprogram-automator）
- 基础库版本 3.15.2（远高于 Vant 要求的 2.6.5）
- `packOptions.ignore` 已排除 `node_modules`

## Goals / Non-Goals

**Goals:**
- 引入 Vant Weapp 组件库，按需使用约 10 个组件
- 替换所有手写弹窗为 van-dialog，获得动画过渡和标准化 API
- 统一按钮、标签、输入框、空状态、加载状态的 UI 组件
- 保持现有业务逻辑不变，仅改造 UI 层
- 分 3 个 Sprint 渐进式引入，每阶段可独立验证

**Non-Goals:**
- 不改造分数表格（match/detail 的 5 列 flex 布局，Cell 不适合）
- 不替换原生 TabBar（改造成本高、收益低）
- 不改造登录页和首页（页面简单，收益低）
- 不做全局主题定制（ConfigProvider），保持现有配色方案
- 不重构业务逻辑或数据层

## Decisions

### Decision 1: 使用 npm 安装而非源码拷贝

**选择**：`npm i @vant/weapp -S --production` + 微信开发者工具构建 npm

**替代方案**：直接拷贝 `dist` 目录到项目中

**理由**：
- npm 方式是官方推荐的标准方式，便于版本管理和升级
- 项目已有 `package.json` 和 `node_modules`，npm 基础设施就绪
- 构建 npm 后，引用路径为 `@vant/weapp/button/index`，语义清晰

### Decision 2: 弹窗使用 van-dialog 的 useSlot 模式

**选择**：对加入记分组弹窗使用 `useSlot` 模式自定义内容区

**替代方案**：使用 van-dialog 的 `message` 属性 + 外部输入框

**理由**：
- 加入记分组弹窗包含特殊样式的输入框（大写、居中、字间距 8rpx），需要完全自定义内容
- `useSlot` 模式允许在 Dialog 内部放置任意 WXML，保持输入框的特殊样式
- 结束赛程弹窗也需要展示未填写成员列表，同样需要 `useSlot`

### Decision 3: 渐进式替换策略

**选择**：分 3 个 Sprint 逐步替换，每个 Sprint 独立可验证

**替代方案**：一次性全量替换

**理由**：
- 渐进式替换降低回归风险，每阶段可执行 E2E 测试验证
- Sprint 1（弹窗+按钮+标签）收益最大，可快速验证效果
- 过渡期保留 `app.wxss` 中的全局样式类，避免未迁移页面受影响

### Decision 4: 保留分数表格的现有实现

**选择**：match/detail 的分数表格保持 flex 布局

**替代方案**：使用 van-cell 逐行展示

**理由**：
- 当前是 5 列表格（成员/初始筹码/额外加成/结算筹码/本期积分），信息密度高
- van-cell 是标题-值两栏结构，展示 5 列数据需要多行，信息密度下降
- 表格的 flex 布局已经稳定运行，无需改造

### Decision 5: 全局样式过渡策略

**选择**：过渡期保留 `app.wxss` 中的所有全局样式类，全部页面迁移完成后再清理

**替代方案**：每迁移一个页面就删除对应的全局样式

**理由**：
- Vant 组件类名前缀为 `van-`，与现有 `.card`、`.btn-primary` 等不冲突
- 过渡期可能有部分页面已迁移、部分未迁移，保留全局样式确保未迁移页面正常
- 最终清理作为独立任务，降低每个 Sprint 的复杂度

## Risks / Trade-offs

| 风险                        | 等级 | 缓解措施                                                                                                  |
| --------------------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| npm 构建配置失败            | 🟢 低 | 标准流程，Vant 文档有详细指引，基础库版本远超要求                                                         |
| 全局样式穿透到 Vant 组件    | 🟢 低 | Vant 开启 `addGlobalClass: true`，但类名前缀不同；逐步替换时验证视觉效果                                  |
| E2E 测试选择器失效          | 🟡 中 | 弹窗从 `wx:if` 控制变为 Vant 的 `show` 属性 + 动画，可能影响自动化测试时序；每 Sprint 后执行完整 E2E 回归 |
| 加入弹窗 useSlot 模式复杂度 | 🟡 中 | 需要在 Dialog slot 内放置带特殊样式的输入框，并适配 `beforeClose` 回调；提前在开发者工具中验证            |
| 包体积增加                  | 🟢 低 | 按需引入约 128KB，当前项目约 50KB，总计约 200KB，远低于 2MB 限制                                          |
| Vant 组件与原生 switch 混用 | 🟢 低 | rules/edit 页面的 switch 可选择性替换为 van-switch，也可保留原生                                          |

## Migration Plan

### Sprint 1：基础设施 + 弹窗替换
1. 安装 `@vant/weapp`，配置 `project.config.json`
2. 微信开发者工具构建 npm，验证构建成功
3. 替换 `group/list` 的加入弹窗为 van-dialog
4. 替换 `match/detail` 的结束赛程弹窗为 van-dialog
5. 替换全部页面的按钮为 van-button
6. 替换状态标签为 van-tag
7. 执行 E2E 测试回归

### Sprint 2：表单 + 列表优化
1. 替换输入框为 van-field（score/input、group/create、match/create、rules/edit）
2. 替换信息展示行为 van-cell（score/input、member/detail）
3. 替换空状态为 van-empty（group/list、group/detail）
4. 执行 E2E 测试回归

### Sprint 3：高级交互
1. 引入 van-skeleton 骨架屏（group/list、match/detail）
2. 引入 van-toast 统一反馈（全部页面）
3. 替换 group/detail 的手写 Tab 为 van-tabs
4. 清理 `app.wxss` 中不再使用的全局样式类
5. 废弃 `components/loading` 组件
6. 执行完整 E2E 测试回归

### Rollback Strategy
- 每个 Sprint 独立提交，可通过 git revert 回滚
- Vant 组件与原生组件可共存，回滚不影响其他页面

## Open Questions

1. **rules/edit 页面的原生 switch**：是否替换为 van-switch？当前原生 switch 已设置 `color="#e94560"`，视觉效果可接受
2. **Toast 替换范围**：是否将所有 `wx.showToast` 替换为 van-toast，还是仅替换需要自定义样式的场景？
3. **E2E 测试适配**：弹窗改造后，E2E 测试中的元素选择器是否需要同步更新？需要在 Sprint 1 完成后评估
