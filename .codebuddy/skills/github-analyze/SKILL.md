---
name: github-analyze
description: 分析 GitHub 仓库的技术架构、代码结构和实现细节。先将仓库 clone 到本地，然后进行全面或重点分析，输出结构化的分析报告。当用户说「分析仓库」「analyze repo」「看看这个项目」「研究一下这个仓库」时使用。
---

# GitHub Analyze — 仓库分析工具

## 概述

本技能用于深度分析 GitHub 仓库，包括技术栈识别、架构分析、核心模块解读、代码质量评估等。支持全面分析和基于用户输入的重点分析。

---

## 触发关键词

| 用户输入 | 触发操作 |
|---------|---------|
| `分析仓库 <url>` / `analyze <url>` | 全面分析指定仓库 |
| `分析仓库 <url> 重点看 <方面>` | 针对特定方面重点分析 |
| `研究一下 <url>` / `看看这个项目 <url>` | 全面分析 |

---

## 工作流程

### Step 1：解析仓库信息

从用户输入中提取：
- **仓库 URL**：支持 `https://github.com/owner/repo` 或 `owner/repo` 简写格式
- **重点分析方向**（可选）：用户指定的关注点，如「架构设计」「性能优化」「错误处理」等

### Step 2：Clone 仓库到本地

将仓库 clone 到工作区的 `.github-analyze/` 临时目录：

```bash
# 创建临时目录
mkdir -p .github-analyze

# 浅克隆（节省时间和空间）
git clone --depth 1 <仓库URL> .github-analyze/<repo-name>
```

> **注意**：如果目录已存在，先执行 `git pull` 更新而非重新 clone。

```bash
# 如果已存在，更新
cd .github-analyze/<repo-name> && git pull
```

### Step 3：全面扫描

对仓库进行系统性扫描，收集以下信息：

#### 3.1 项目基本信息

```bash
# 查看 README
cat .github-analyze/<repo-name>/README.md

# 查看项目配置文件（识别技术栈）
ls .github-analyze/<repo-name>/
cat .github-analyze/<repo-name>/package.json 2>/dev/null    # Node.js
cat .github-analyze/<repo-name>/go.mod 2>/dev/null           # Go
cat .github-analyze/<repo-name>/Cargo.toml 2>/dev/null       # Rust
cat .github-analyze/<repo-name>/pyproject.toml 2>/dev/null   # Python
cat .github-analyze/<repo-name>/pom.xml 2>/dev/null          # Java
```

#### 3.2 目录结构分析

```bash
# 获取目录树（排除常见无关目录）
find .github-analyze/<repo-name> -type f \
  ! -path '*/node_modules/*' \
  ! -path '*/.git/*' \
  ! -path '*/vendor/*' \
  ! -path '*/dist/*' \
  ! -path '*/__pycache__/*' \
  | head -200
```

#### 3.3 代码统计

```bash
# 按文件类型统计行数
find .github-analyze/<repo-name> -type f \
  ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/vendor/*' \
  | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20
```

#### 3.4 核心模块识别

通过以下方式识别核心模块：
- 入口文件（`main.*`、`index.*`、`app.*`）
- 配置文件中的依赖关系
- 目录命名约定（`src/`、`lib/`、`pkg/`、`internal/`）
- 高频引用的模块

#### 3.5 重点分析（如有指定）

如果用户指定了重点分析方向，深入该方向：

| 分析方向 | 重点关注 |
|---------|---------|
| 架构设计 | 分层结构、模块划分、依赖关系、设计模式 |
| 性能优化 | 缓存策略、并发处理、数据库查询、算法复杂度 |
| 错误处理 | 异常捕获、错误传播、重试机制、降级策略 |
| 测试策略 | 测试覆盖率、测试框架、Mock 策略、CI/CD |
| API 设计 | 接口定义、协议选择、版本管理、文档 |
| 安全性 | 认证授权、输入校验、敏感信息处理 |
| 部署运维 | Docker/K8s 配置、CI/CD 流水线、监控告警 |

### Step 4：生成分析报告

将分析结果整理为结构化的 Markdown 报告，保存到 `docs/` 目录：

**报告文件命名**：`docs/analysis-<repo-name>.md`

**报告结构模板**：

```markdown
# <仓库名> 仓库分析报告

> 分析时间：<日期>
> 仓库地址：<URL>
> 分析重点：<用户指定的重点 或 "全面分析">

## 1. 项目概述
[项目定位、核心功能、目标用户]

## 2. 技术栈
[语言、框架、核心依赖、构建工具]

## 3. 架构分析
[整体架构、分层设计、模块关系图]

## 4. 目录结构
[关键目录说明、代码组织方式]

## 5. 核心模块解读
[各核心模块的职责、实现方式、关键代码片段]

## 6. 亮点与特色
[值得学习的设计、巧妙的实现]

## 7. 潜在问题与改进建议
[发现的问题、优化建议]

## 8. 总结
[整体评价、适用场景、学习价值]
```

### Step 5：清理临时文件

分析完成后，提示用户是否清理 clone 的仓库：

```bash
# 清理临时目录
rm -rf .github-analyze/<repo-name>
```

---

## 执行规范

### 大型仓库处理

- 使用 `--depth 1` 浅克隆，避免下载完整历史
- 对于超大仓库（>500MB），提示用户可能需要较长时间
- 优先分析核心目录，跳过生成文件（`dist/`、`build/`）

### 分析深度控制

- **快速分析**：仅扫描目录结构 + README + 配置文件（~1分钟）
- **标准分析**：快速分析 + 核心模块代码阅读（~3分钟）
- **深度分析**：标准分析 + 全量代码审查 + 依赖分析（~10分钟）

默认使用**标准分析**，用户可通过「快速看看」或「深度分析」调整。

### .gitignore 配置

确保 `.github-analyze/` 目录已添加到 `.gitignore`：

```bash
echo '.github-analyze/' >> .gitignore
```

---

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| clone 失败（网络问题） | 提示用户检查网络，或使用镜像地址 |
| 仓库过大 | 使用 `--depth 1 --single-branch` 最小化下载 |
| 私有仓库 | 提示用户配置 GitHub token 或 SSH key |
| 非 GitHub 仓库 | 同样支持 GitLab、Gitee 等 Git 仓库 |

---

## 示例

### 全面分析

**用户**：分析仓库 https://github.com/vercel/next.js

**执行流程**：
1. Clone `next.js` 到 `.github-analyze/next.js`
2. 扫描项目结构、识别技术栈（TypeScript + React）
3. 分析核心模块（compiler、router、server）
4. 生成报告保存到 `docs/analysis-next.js.md`

### 重点分析

**用户**：分析仓库 https://github.com/redis/redis 重点看内存管理

**执行流程**：
1. Clone `redis` 到 `.github-analyze/redis`
2. 快速扫描项目概况
3. 深入分析内存管理相关代码（`zmalloc.*`、`evict.*`、`expire.*`）
4. 生成报告，内存管理部分详细展开
