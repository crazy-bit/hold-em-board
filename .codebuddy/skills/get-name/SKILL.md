---
name: get-name
description: 获取当前用户名（企业账号/RTX 名）。当需要知道"我是谁"、"当前用户名"、"我的账号"、"我的 RTX"、"我的企业微信名"时使用。自动识别操作系统：Windows 下读取域账号（%username%），Linux 下读取 git config user.name。
category: common_tools
---

# whoami — 获取当前用户名

自动识别操作系统，用最可靠的方式获取当前用户的企业账号名（RTX / 企业微信名）。

## 执行步骤

### 第一步：判断操作系统

```bash
uname -s 2>/dev/null || echo "Windows"
```

- 输出包含 `Linux` / `Darwin` → 走 **Linux 流程**
- 命令不存在或输出 `Windows` → 走 **Windows 流程**

---

### Windows 流程：读取域账号

Windows 登录账号与腾讯内网 RTX / 企业微信账号一致，直接读取系统环境变量：

```bash
echo %username%
```

取输出并 trim 空白，即为当前用户名。

**示例输出：** `johndoe`

---

### Linux 流程：读取 git 用户名

Linux 环境（服务器、CI、开发容器）通常没有域账号，但开发者都会配置 git，用 git 的 `user.name` 作为用户名：

```bash
git config --global user.name
```

**若 git user.name 为空**，依次尝试以下备选方案：

1. 读取系统用户名：
   ```bash
   whoami
   ```
2. 读取环境变量：
   ```bash
   echo $USER
   ```

取第一个非空结果，trim 空白，即为当前用户名。

---

## 输出格式

直接输出用户名字符串，不加任何前缀或解释：

```
johndoe
```

如果所有方法都失败，输出：

```
（无法获取用户名，请手动指定）
```

---

## 背景说明

此方案来源于 AHub 项目（`src/preload.js`）的实践：

- **Windows**：`execSync("echo %username%")` — Windows 域账号即 RTX/企业微信账号
- **Linux**：`git config --global user.name` — 开发者在配置 git 时填写的真实姓名/账号

两者在腾讯内网环境下均能准确对应到企业微信账号名。
