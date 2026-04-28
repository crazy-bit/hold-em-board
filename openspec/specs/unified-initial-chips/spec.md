## ADDED Requirements

### Requirement: 统一初始筹码配置
管理员 SHALL 能够为所有成员配置统一的初始筹码，不再按名次区分。

#### Scenario: 所有成员获得相同初始筹码
- **WHEN** 赛程创建时
- **THEN** 系统 SHALL 为所有成员分配相同的初始筹码，无论其当前总积分排名

#### Scenario: 规则编辑页显示统一初始筹码输入
- **WHEN** 管理员进入规则配置页
- **THEN** 页面 SHALL 显示一个全局统一的初始筹码输入框，而非每个名次行单独的初始筹码输入

#### Scenario: 保存统一初始筹码
- **WHEN** 管理员修改统一初始筹码并保存
- **THEN** 系统 SHALL 将该值存储为默认规则（rank=0）的 initialChips
- **THEN** 后续创建的赛程 SHALL 使用该统一值为所有成员分配初始筹码
