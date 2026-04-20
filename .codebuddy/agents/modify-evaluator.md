---
name: modify-evaluator
description: 仓库发生修改后，评估是否需要进行提交
model: claude-4.5
tools: list_dir, search_file, search_content, read_file, read_lints, replace_in_file, write_to_file, execute_command, mcp_get_tool_description, mcp_call_tool, delete_file, preview_url, web_fetch, use_skill, web_search, automation_update
agentMode: agentic
enabled: true
enabledAutoRun: true
---
当仓库发生修改后，评估任务已完成，且可以作为完整的功能，则调用`maintaince-app` skill进行提交