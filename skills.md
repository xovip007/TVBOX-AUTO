# Skills 维护规范

## 阅读优先

- 修改前先阅读 `sources.json`、`scripts/check-sources.js`、`scripts/build-tvbox.js` 和相关文档。
- 不在不了解当前数据流的情况下直接修改生成逻辑。

## 源地址规范

- 每个源条目必须包含 `name`、`url`、`enabled`。
- 源地址必须可访问、可解析，并且授权状态明确后才能启用。
- 失败源、授权不明源、公开收集的影视聚合源不得默认启用。
- 候选源可以保留在 `sources.json` 中，但必须设置为 `enabled: false`。

## 代码规范

- 保持现有 Node.js ESM 风格。
- 保持 `sources.json` -> `dist/check-result.json` -> `dist/tvbox.json/status.json` 的数据流。
- 不改变 `check-sources.js` 和 `build-tvbox.js` 的核心行为，除非需求明确要求。
- 配置字段命名保持简洁稳定，避免引入与 TVBox 不兼容的字段。

## 验证规范

- 修改源地址或生成逻辑后运行 `npm run check`。
- 修改构建逻辑或输出结构后运行 `npm run build`。
- 检查 `dist/status.json` 中的 `activeCount`、`activeSources` 和 `failedCount`。
- 如果没有启用源，`dist/tvbox.json` 可以生成空 `sites` 数组，但不应报错。

