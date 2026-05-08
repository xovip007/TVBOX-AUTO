# TVBox Auto Template 执行计划

## 目标

本项目从 `sources.json` 读取候选 TVBox 配置源，执行检测后生成 `dist/check-result.json`，再根据检测结果生成 `dist/tvbox.json` 和 `dist/status.json`。本次实施聚焦在补齐项目文档、明确源地址合规规则，并把公开搜索到的候选源以禁用状态加入配置。

## 当前代码数据流

1. `scripts/check-sources.js` 读取 `sources.json`。
2. 只检测 `enabled !== false` 且包含 `url` 的源。
3. 每个源按 `timeoutMs` 设置超时，检测 HTTP 状态、响应时间、内容类型、是否 JSON、是否包含 `sites` 或 `lives` 数组。
4. 检测结果按可用性和响应时间排序，写入 `dist/check-result.json`。
5. `scripts/build-tvbox.js` 读取检测结果，只选择 `ok && isJson && hasSites` 的源。
6. 构建脚本按响应时间排序、按 URL 去重，并限制最多写入 `maxActiveSources` 个源。
7. 最终生成 `dist/tvbox.json` 和 `dist/status.json`。

## 源地址处理

公开搜索到的候选来源包括：

- https://github.com/1771245847/TvBox
- https://github.com/q215613905/TVBoxOS
- https://github.com/qist/tvbox
- https://www.cnblogs.com/lizhua/p/17211556.html

其中部分页面说明这些配置包含影视聚合、爬虫接口或来自互联网收集的内容，授权状态不明确。因此实施策略为：

- 不默认启用授权状态不明确的公开影视源。
- 可以将候选源写入 `sources.json`，但必须保持 `enabled: false`。
- 只有确认有权使用、可访问、可解析为 JSON 且包含 `sites` 数组的源，才可以改为启用。

## 本次文件变更

- `sources.json`：保留原有结构，追加公开搜索到的候选源，全部默认禁用。
- `agent.md`：记录项目需求和运行目标。
- `skills.md`：记录维护规范、源地址规范和验证要求。
- `plan.md`：记录本次实施步骤、数据流、源地址合规判断和验收标准。

## 验收标准

- `npm run check` 可以生成 `dist/check-result.json`。
- `npm run build` 可以生成 `dist/tvbox.json` 和 `dist/status.json`。
- 未授权或授权不明确的公开候选源不被默认启用。
- `dist/status.json` 中的 `activeCount`、`activeSources`、`failedCount` 能反映当前启用源的实际状态。

