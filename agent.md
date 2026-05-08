# Agent 需求说明

## 项目目标

维护一个 TVBox 配置自动更新模板。项目应能从候选源列表中检测可用源，选择最快且符合结构要求的源，并生成 TVBox App 可直接使用的配置文件。

## 核心需求

- 从 `sources.json` 读取候选配置源。
- 只检测启用的源，即 `enabled !== false` 且包含 `url` 的条目。
- 自动检测源地址的可访问性、响应时间、HTTP 状态、JSON 可解析性和 TVBox 配置结构。
- 只把可访问、可解析为 JSON、且包含 `sites` 数组的源写入最终配置。
- 最多写入 `maxActiveSources` 个最快的可用源。
- 输出文件包括：
  - `dist/check-result.json`
  - `dist/tvbox.json`
  - `dist/status.json`
- 本地可通过 `npm run start` 启动静态服务访问输出结果。

## 合规需求

- 不内置默认启用的未授权影视聚合源。
- 公开搜索到但授权状态不明确的 TVBox 源只能作为候选源保存，并保持 `enabled: false`。
- 启用源之前必须确认使用权、可访问性和配置结构。

## 用户工作流

1. 编辑 `sources.json`，添加或启用有权使用的源。
2. 运行 `npm run check` 检测源状态。
3. 运行 `npm run build` 生成 TVBox 配置。
4. 运行 `npm run start` 本地访问生成结果。
5. 在 TVBox App 中填写公网 Raw 地址或本地服务地址。

