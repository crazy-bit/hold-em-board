## ADDED Requirements

### Requirement: 按钮组件使用 van-button
系统 SHALL 使用 van-button 替换以下页面中的原生 `<button>` 元素：group/list、group/create、group/detail、match/detail、match/create、score/input、rules/edit。

#### Scenario: 主按钮替换
- **WHEN** 页面中存在 `class="btn-primary"` 的按钮
- **THEN** 替换为 `<van-button type="danger" block round>` 并保持 `#e94560` 主题色
- **THEN** 按钮支持 `loading` 属性显示加载状态
- **THEN** 按钮支持 `disabled` 属性显示禁用状态

#### Scenario: 次要按钮替换
- **WHEN** 页面中存在 `class="btn-secondary"` 的按钮
- **THEN** 替换为 `<van-button plain round>` 并保持 `#e94560` 边框色

#### Scenario: 危险按钮替换
- **WHEN** 页面中存在 `class="btn-danger"` 的按钮
- **THEN** 替换为 `<van-button type="danger" block round>` 并使用 `#ff4d4f` 颜色

### Requirement: 状态标签使用 van-tag
系统 SHALL 使用 van-tag 替换 group/detail 和 match/detail 页面中的手写状态标签。

#### Scenario: 进行中标签
- **WHEN** 赛程状态为 `active`
- **THEN** 显示 `<van-tag type="success" round>进行中</van-tag>`

#### Scenario: 已结束标签
- **WHEN** 赛程状态为 `finished`
- **THEN** 显示 `<van-tag type="primary" round>已结束</van-tag>`

#### Scenario: 已作废标签
- **WHEN** 赛程状态为 `cancelled`
- **THEN** 显示 `<van-tag color="#fafafa" text-color="#999" round>已作废</van-tag>`

#### Scenario: 管理员标签
- **WHEN** 用户是记分组管理员
- **THEN** 显示 `<van-tag type="warning" round>管理员</van-tag>`

### Requirement: 输入框使用 van-field
系统 SHALL 使用 van-field 替换 score/input、group/create、match/create、rules/edit 页面中的原生 `<input>` 元素。

#### Scenario: 结算筹码输入框
- **WHEN** 用户在分数录入页面填写结算筹码
- **THEN** 使用 `<van-field>` 组件，设置 `type="number"` `label="结算筹码"` `placeholder="输入你的结算筹码"`
- **THEN** 输入框支持清除按钮（`clearable`）

#### Scenario: 创建记分组名称输入框
- **WHEN** 用户在创建记分组页面输入组名
- **THEN** 使用 `<van-field>` 组件，设置 `label="组名"` `placeholder="输入记分组名称"` `maxlength="20"`

### Requirement: 信息展示行使用 van-cell
系统 SHALL 使用 van-cell 替换 score/input 和 member/detail 页面中的手写信息展示行。

#### Scenario: 分数录入页信息展示
- **WHEN** 用户查看分数录入页的初始筹码和额外加成
- **THEN** 使用 `<van-cell title="初始筹码" value="{{score.initialChips}}" />` 展示
- **THEN** 使用 `<van-cell title="额外加成" value="+{{score.bonus || 0}}" />` 展示

### Requirement: 空状态使用 van-empty
系统 SHALL 使用 van-empty 替换 group/list 和 group/detail 页面中的手写空状态。

#### Scenario: 记分组列表空状态
- **WHEN** 用户没有加入任何记分组
- **THEN** 显示 `<van-empty description="还没有加入任何记分组" />`

#### Scenario: 赛程列表空状态
- **WHEN** 记分组内没有赛程
- **THEN** 显示 `<van-empty image="search" description="还没有赛程" />`

#### Scenario: 积分榜空状态
- **WHEN** 记分组内没有积分数据
- **THEN** 显示 `<van-empty description="暂无积分数据" />`

### Requirement: 加载骨架屏使用 van-skeleton
系统 SHALL 使用 van-skeleton 替换 group/list 和 match/detail 页面中的"加载中..."文字。

#### Scenario: 记分组列表加载中
- **WHEN** 记分组列表数据正在加载
- **THEN** 显示 `<van-skeleton title row="3" />` 骨架屏效果
- **THEN** 数据加载完成后骨架屏消失，显示真实内容

### Requirement: 统一反馈使用 van-toast
系统 SHALL 使用 van-toast 替换分散的 `wx.showToast` 调用，提供统一的操作反馈。

#### Scenario: 成功反馈
- **WHEN** 操作成功（如加入成功、保存成功）
- **THEN** 使用 `Toast.success('操作成功')` 显示成功提示

#### Scenario: 失败反馈
- **WHEN** 操作失败（如加载失败、保存失败）
- **THEN** 使用 `Toast.fail('操作失败')` 显示失败提示

#### Scenario: 加载中反馈
- **WHEN** 异步操作进行中
- **THEN** 使用 `Toast.loading({ message: '加载中...', forbidClick: true })` 显示加载提示

### Requirement: Tab 切换使用 van-tabs
系统 SHALL 使用 van-tabs 替换 group/detail 页面中的手写 Tab 切换。

#### Scenario: 赛程记录和总积分榜切换
- **WHEN** 用户在组详情页切换 Tab
- **THEN** 使用 `<van-tabs>` 组件，包含"赛程记录"和"总积分榜"两个 Tab
- **THEN** Tab 切换时有平滑的下划线动画
- **THEN** 切换后显示对应的内容区域
