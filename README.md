# TVBox Auto Template

这是一个 TVBox 配置自动更新模板：

- 从 `sources.json` 读取候选配置源
- 定时检测可访问性和响应时间
- 自动生成 `dist/tvbox.json`
- 使用 GitHub Actions 每天自动更新
- 电视端 TVBox App 直接填写公网 Raw 地址即可

> 注意：模板不内置任何第三方影视源。请只添加你有权使用、合法合规的配置地址。

## 1. 修改源列表

编辑 `sources.json`：

```json
{
  "timeoutMs": 6000,
  "maxActiveSources": 3,
  "sources": [
    {
      "name": "My Source",
      "url": "https://your-domain.com/tvbox.json",
      "enabled": true
    }
  ]
}
```

字段说明：

- `timeoutMs`：单个源超时时间
- `maxActiveSources`：最终写入 `tvbox.json` 的最快源数量
- `enabled`：是否参与检测

## 2. 本地测试

```bash
npm install
npm run check
npm run build
npm run start
```

本地访问：

```text
http://localhost:9977/tvbox.json
http://localhost:9977/status.json
```

## 3. 上传到 GitHub

```bash
git init
git add .
git commit -m "init tvbox auto template"
git branch -M main
git remote add origin https://github.com/你的用户名/tvbox-auto.git
git push -u origin main
```

## 4. 开启 GitHub Actions 写权限

进入仓库：

```text
Settings → Actions → General → Workflow permissions
```

选择：

```text
Read and write permissions
```

然后保存。

## 5. 手动运行一次

进入：

```text
Actions → Update TVBox Config → Run workflow
```

运行成功后，会生成：

```text
dist/tvbox.json
dist/status.json
dist/check-result.json
```

## 6. TVBox App 填写地址

Raw 地址：

```text
https://raw.githubusercontent.com/xovip007/tvbox-auto/main/dist/tvbox.json
```

jsDelivr CDN 地址：

```text
https://cdn.jsdelivr.net/gh/xovip007/tvbox-auto@main/dist/tvbox.json
```

电视端建议优先试 Raw 地址；如果电视访问 GitHub 慢，再试 CDN 地址。

## 7. 修改更新时间

编辑 `.github/workflows/update.yml`：

```yaml
schedule:
  - cron: "0 2 * * *"
```

GitHub Actions 的 cron 使用 UTC 时间。

如果你在中国时区，上午 10 点对应 UTC 02:00。

## 文件结构

```text
.
├── .github/workflows/update.yml
├── dist/
│   ├── tvbox.json
│   ├── status.json
│   └── check-result.json
├── scripts/
│   ├── check-sources.js
│   ├── build-tvbox.js
│   └── local-server.js
├── sources.json
├── package.json
└── README.md
```
