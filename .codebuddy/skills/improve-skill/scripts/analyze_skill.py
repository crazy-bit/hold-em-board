#!/usr/bin/env python3
"""
Skill 分析器 — CodeBuddy Skill 的自动化最佳实践审查工具。

读取 Skill 目录（或单个 SKILL.md 文件），生成三个严重级别的分类报告：
  CRITICAL（严重）、RECOMMENDED（推荐）、OPTIONAL（可选）

用法：
    python3 analyze_skill.py <skill目录路径或SKILL.md路径>

退出码：
    0  — 无严重问题
    1  — 存在一个或多个严重问题
    2  — 输入错误（路径未找到、缺少 SKILL.md 等）
"""

import os
import re
import sys
import yaml
from pathlib import Path


# ── 常量 ──────────────────────────────────────────────────────────────
RESERVED_WORDS = {"anthropic", "claude"}
NAME_MAX_LEN = 64
DESC_MAX_LEN = 1024
SKILL_BODY_MAX_LINES = 500
LONG_REF_THRESHOLD = 100  # lines before a TOC is recommended
VERBOSE_PATTERNS = [
    (r"(?i)\bPDF\s*\(Portable Document Format\)", "不必要地展开众所周知的缩写"),
    (r"(?i)\bthere are many (?:libraries|tools|ways)", "通用填充语 — 请具体说明或省略"),
    (r"(?i)\bfirst,?\s+you(?:'ll| will) need to", "手把手引导 — Claude 不需要这种逐步说明"),
]
SECOND_PERSON_RE = re.compile(
    r"\b(?:you\s+(?:should|can|need|must|will|could|might|may|are)|"
    r"your\s+(?!skill|Skill))\b",
    re.IGNORECASE,
)
XML_TAG_RE = re.compile(r"<\/?[a-zA-Z][^>]*>")
WINDOWS_PATH_RE = re.compile(r"(?<!\w)\\(?=[a-zA-Z_])")  # backslash before letter


# ── 辅助工具 ────────────────────────────────────────────────────────────────
class Finding:
    """分析过程中发现的单个问题。"""

    def __init__(self, severity: str, category: str, message: str, location: str = ""):
        self.severity = severity  # CRITICAL（严重）| RECOMMENDED（推荐）| OPTIONAL（可选）
        self.category = category
        self.message = message
        self.location = location  # 例如 "SKILL.md:12" 或 "scripts/rotate.py"

    def __str__(self):
        loc = f" ({self.location})" if self.location else ""
        return f"[{self.severity}] {self.category}{loc}: {self.message}"


def parse_frontmatter(text: str):
    """从 SKILL.md 内容中返回 (元数据字典, 正文文本)。"""
    if not text.startswith("---"):
        return None, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None, text
    try:
        meta = yaml.safe_load(parts[1])
    except yaml.YAMLError:
        return None, text
    return meta or {}, parts[2]


def count_lines(text: str) -> int:
    return len(text.strip().splitlines())


# ── 检查项 ─────────────────────────────────────────────────────────────────
def check_metadata(meta, findings: list):
    """验证 YAML frontmatter 字段。"""
    if meta is None:
        findings.append(Finding("CRITICAL", "Metadata", "缺少 YAML frontmatter"))
        return

    # -- name --
    name = meta.get("name", "")
    if not name:
        findings.append(Finding("CRITICAL", "Metadata", "缺少 'name' 字段"))
    else:
        if len(name) > NAME_MAX_LEN:
            findings.append(
                Finding("CRITICAL", "Metadata", f"name 超过 {NAME_MAX_LEN} 个字符（当前 {len(name)} 个）")
            )
        if not re.match(r"^[a-z0-9][a-z0-9-]*$", name):
            findings.append(
                Finding("CRITICAL", "Metadata", "name 只能包含小写字母、数字和连字符")
            )
        for rw in RESERVED_WORDS:
            if rw in name:
                findings.append(
                    Finding("CRITICAL", "Metadata", f"name 包含保留词 '{rw}'")
                )
        if XML_TAG_RE.search(name):
            findings.append(Finding("CRITICAL", "Metadata", "name 包含 XML 标签"))

    # -- description --
    desc = meta.get("description", "")
    if not desc:
        findings.append(Finding("CRITICAL", "Metadata", "缺少或为空的 'description' 字段"))
    else:
        if len(desc) > DESC_MAX_LEN:
            findings.append(
                Finding("CRITICAL", "Metadata", f"description 超过 {DESC_MAX_LEN} 个字符（当前 {len(desc)} 个）")
            )
        if XML_TAG_RE.search(desc):
            findings.append(Finding("CRITICAL", "Metadata", "description 包含 XML 标签"))
        # 检查第三人称
        if re.match(r"(?i)^(I |You |We )", desc.strip()):
            findings.append(
                Finding("RECOMMENDED", "Description", "使用第三人称（如 '处理...' 而非 '我帮助...'）")
            )
        # 检查触发词是否存在
        trigger_keywords = {"when", "use", "trigger", "for", "if"}
        desc_lower = desc.lower()
        has_trigger = any(kw in desc_lower for kw in trigger_keywords)
        if not has_trigger:
            findings.append(
                Finding(
                    "RECOMMENDED",
                    "Description",
                    "说明何时使用该 Skill（例如 'Use when...'）",
                )
            )


def check_body(body: str, findings: list):
    """分析 SKILL.md 正文中的常见问题。"""
    lines = body.strip().splitlines()
    line_count = len(lines)

    # -- 长度检查 --
    if line_count > SKILL_BODY_MAX_LINES:
        findings.append(
            Finding(
                "CRITICAL",
                "Length",
                f"SKILL.md 正文有 {line_count} 行（最多 {SKILL_BODY_MAX_LINES} 行）。"
                "请将详细内容拆分到 references/ 文件中。",
                "SKILL.md",
            )
        )
    elif line_count > SKILL_BODY_MAX_LINES * 0.8:
        findings.append(
            Finding(
                "RECOMMENDED",
                "Length",
                f"SKILL.md 正文有 {line_count} 行 — 接近 500 行上限。"
                "考虑将部分内容移至 references/。",
                "SKILL.md",
            )
        )

    # -- 第二人称语言检查 --
    for i, line in enumerate(lines, 1):
        if SECOND_PERSON_RE.search(line):
            findings.append(
                Finding(
                    "RECOMMENDED",
                    "Writing Style",
                    f"检测到第二人称语言：\"{line.strip()[:80]}...\"",
                    f"SKILL.md:{i}",
                )
            )
            break  # 只报告一次

    # -- 冗余模式检查 --
    full_text = "\n".join(lines)
    for pattern, msg in VERBOSE_PATTERNS:
        if re.search(pattern, full_text):
            findings.append(Finding("RECOMMENDED", "Conciseness", msg, "SKILL.md"))

    # -- Windows 路径检查 --
    for i, line in enumerate(lines, 1):
        if WINDOWS_PATH_RE.search(line):
            findings.append(
                Finding("OPTIONAL", "Paths", "检测到 Windows 风格的反斜杠路径", f"SKILL.md:{i}")
            )
            break


def check_references(skill_dir: Path, body: str, findings: list):
    """检查参考文件及其从 SKILL.md 的链接。"""
    refs_dir = skill_dir / "references"
    if not refs_dir.is_dir():
        return

    for ref_file in sorted(refs_dir.iterdir()):
        if ref_file.is_file() and ref_file.suffix in (".md", ".txt"):
            content = ref_file.read_text(errors="replace")
            lc = count_lines(content)
            if lc > LONG_REF_THRESHOLD:
                # check for TOC
                has_toc = bool(
                    re.search(r"(?i)(table of contents|## toc|## contents|\[.*\]\(#)", content[:500])
                )
                if not has_toc:
                    findings.append(
                        Finding(
                            "OPTIONAL",
                            "References",
                            f"参考文件有 {lc} 行但没有目录",
                            f"references/{ref_file.name}",
                        )
                    )

            # 检查嵌套引用（参考文件指向其他参考文件）
            nested_links = re.findall(r"\[.*?\]\((?:\.\./)?references/", content)
            if nested_links:
                findings.append(
                    Finding(
                        "RECOMMENDED",
                        "References",
                        "检测到嵌套引用 — 保持参考资料从 SKILL.md 起只有一层深度",
                        f"references/{ref_file.name}",
                    )
                )


def check_scripts(skill_dir: Path, findings: list):
    """检查脚本质量。"""
    scripts_dir = skill_dir / "scripts"
    if not scripts_dir.is_dir():
        return

    for script_file in sorted(scripts_dir.iterdir()):
        if not script_file.is_file():
            continue
        if script_file.suffix not in (".py", ".sh", ".bash"):
            continue

        content = script_file.read_text(errors="replace")
        rel = f"scripts/{script_file.name}"

        # -- 裸 except / 推卸给 Claude --
        if "except:" in content and "except Exception" not in content:
            findings.append(
                Finding("RECOMMENDED", "Scripts", "裸 'except:' — 请显式处理错误", rel)
            )

        if re.search(r"raise\s+(Exception|RuntimeError)\s*\(", content):
            # 不一定是问题，但检查是否有有用的错误信息
            pass

        # -- sys.exit 无错误信息 --
        if re.search(r"sys\.exit\(\s*1\s*\)", content) and "print" not in content:
            findings.append(
                Finding(
                    "RECOMMENDED",
                    "Scripts",
                    "sys.exit(1) 未打印错误信息 — 解决问题，而非推卸责任",
                    rel,
                )
            )

        # -- 魔法数字 --
        magic_numbers = re.findall(r"(?<![\"'\w])(\d{3,})(?![\"'\w])", content)
        # 排除常见的无害值
        benign = {"100", "200", "404", "500", "1000", "1024", "2048", "4096", "8192", "65535"}
        suspicious = [n for n in magic_numbers if n not in benign]
        if suspicious:
            findings.append(
                Finding(
                    "OPTIONAL",
                    "Scripts",
                    f"可能存在未说明原因的魔法数字：{', '.join(suspicious[:5])}",
                    rel,
                )
            )

        # -- 脚本中的 Windows 路径 --
        if WINDOWS_PATH_RE.search(content):
            findings.append(Finding("OPTIONAL", "Paths", "脚本中检测到 Windows 风格的反斜杠路径", rel))

        # -- 缺少文档字符串 --
        if script_file.suffix == ".py" and '"""' not in content and "'''" not in content:
            findings.append(
                Finding("OPTIONAL", "Scripts", "Python 脚本没有文档字符串", rel)
            )


def check_consistency(body: str, meta: dict, skill_dir: Path, findings: list):
    """检查术语一致性和命名规范。"""
    name = meta.get("name", "")
    if name:
        # 命名规范检查
        words = name.split("-")
        if len(words) >= 2 and not any(w.endswith("ing") for w in words):
            findings.append(
                Finding(
                    "OPTIONAL",
                    "Naming",
                    f"考虑使用动名词形式命名 Skill（例如 'improving-skills' 而非 '{name}'）",
                )
            )

    # 检查目录名是否与元数据名称匹配
    dir_name = skill_dir.name
    if name and dir_name != name:
        findings.append(
            Finding(
                "CRITICAL",
                "Metadata",
                f"目录名 '{dir_name}' 与元数据名称 '{name}' 不匹配",
            )
        )


# ── 主函数 ───────────────────────────────────────────────────────────────────
def analyze(path_str: str) -> list:
    """对 Skill 运行所有检查并返回 Finding 对象列表。"""
    path = Path(path_str).resolve()
    findings: list[Finding] = []

    # 确定 Skill 目录和 SKILL.md 路径
    if path.is_file() and path.name == "SKILL.md":
        skill_md = path
        skill_dir = path.parent
    elif path.is_dir():
        skill_md = path / "SKILL.md"
        skill_dir = path
    else:
        print(f"错误：{path} 不是目录或 SKILL.md 文件", file=sys.stderr)
        sys.exit(2)

    if not skill_md.exists():
        print(f"错误：在 {skill_md} 未找到 SKILL.md", file=sys.stderr)
        sys.exit(2)

    raw = skill_md.read_text(errors="replace")
    meta, body = parse_frontmatter(raw)

    check_metadata(meta, findings)
    check_body(body, findings)
    check_references(skill_dir, body, findings)
    check_scripts(skill_dir, findings)
    if meta:
        check_consistency(body, meta, skill_dir, findings)

    return findings


def main():
    if len(sys.argv) < 2:
        print("用法：analyze_skill.py <skill目录路径或SKILL.md路径>")
        sys.exit(2)

    findings = analyze(sys.argv[1])

    if not findings:
        print("✅ 未发现问题 — Skill 看起来很棒！")
        sys.exit(0)

    # 按严重级别分组
    severity_order = ["CRITICAL", "RECOMMENDED", "OPTIONAL"]
    grouped: dict[str, list[Finding]] = {s: [] for s in severity_order}
    for f in findings:
        grouped[f.severity].append(f)

    total = len(findings)
    crit = len(grouped["CRITICAL"])

    print(f"\n{'='*60}")
    print(f" Skill 分析报告 — 共 {total} 个问题")
    print(f"{'='*60}\n")

    for sev in severity_order:
        items = grouped[sev]
        if not items:
            continue
        icons = {"CRITICAL": "🔴", "RECOMMENDED": "🟡", "OPTIONAL": "🔵"}
        sev_labels = {"CRITICAL": "严重", "RECOMMENDED": "推荐", "OPTIONAL": "可选"}
        print(f"{icons[sev]} {sev}（{sev_labels[sev]}）({len(items)}个)")
        print("-" * 40)
        for f in items:
            loc = f"  [{f.location}]" if f.location else ""
            print(f"  • {f.category}{loc}")
            print(f"    {f.message}")
        print()

    if crit > 0:
        print(f"❌ 存在 {crit} 个严重问题，必须修复。")
        sys.exit(1)
    else:
        print("✅ 无严重问题。请检查推荐/可选项以进一步完善。")
        sys.exit(0)


if __name__ == "__main__":
    main()
