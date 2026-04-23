## ADDED Requirements

### Requirement: Vant Weapp npm 依赖安装
系统 SHALL 通过 npm 安装 `@vant/weapp` 作为生产依赖，版本为 ^1.11.7。

#### Scenario: 成功安装 Vant Weapp
- **WHEN** 执行 `npm i @vant/weapp -S --production`
- **THEN** `package.json` 的 `dependencies` 中包含 `"@vant/weapp": "^1.11.7"`
- **THEN** `node_modules/@vant/weapp` 目录存在且包含组件文件

### Requirement: project.config.json npm 构建配置
系统 SHALL 在 `project.config.json` 中配置 npm 手动构建选项，使微信开发者工具能正确构建 Vant Weapp 组件。

#### Scenario: 配置 packNpmManually
- **WHEN** 打开 `project.config.json`
- **THEN** `setting.packNpmManually` 的值为 `true`
- **THEN** `setting.packNpmRelationList` 包含一个条目，其 `packageJsonPath` 为 `"./package.json"`，`miniprogramNpmDistDir` 为 `"./"`

### Requirement: npm 构建成功
系统 SHALL 在微信开发者工具中成功执行"构建 npm"操作，生成 `miniprogram_npm/@vant/weapp` 目录。

#### Scenario: 构建 npm 后组件可用
- **WHEN** 在微信开发者工具中执行"工具 → 构建 npm"
- **THEN** 项目根目录下生成 `miniprogram_npm/@vant/weapp/` 目录
- **THEN** 该目录包含 button、dialog、tag 等组件的编译产物（index.js、index.wxml、index.wxss、index.json）

### Requirement: 页面级组件注册
系统 SHALL 在每个使用 Vant 组件的页面的 `.json` 文件中，通过 `usingComponents` 注册所需组件。

#### Scenario: 注册 van-button 组件
- **WHEN** 页面需要使用 van-button
- **THEN** 该页面的 `.json` 文件中 `usingComponents` 包含 `"van-button": "@vant/weapp/button/index"`

#### Scenario: 注册 van-dialog 组件
- **WHEN** 页面需要使用 van-dialog
- **THEN** 该页面的 `.json` 文件中 `usingComponents` 包含 `"van-dialog": "@vant/weapp/dialog/index"`
