# AI 案例合集（社群作品）

[在 Lovstudio.AI 官网查看](https://lovstudio.ai/showcase)

收录社群成员用 AI 做出来的真实作品。官网从本仓库 `main` 分支读取 `cases.json`，约 5 分钟内生效；新增或修改案例不需要改官网代码。

## 目录

- `cases.json`：案例清单，按数组顺序展示。
- `<id>/cover.jpg`：卡片与详情页封面，16:10。
- `<id>/shots/*.jpg`：详情页图集。
- `<id>/index.html`：可在线运行的作品，作者交付的原文件，不做改动。

## 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 小写字母、数字和连字符，与目录名一致，也是网址 `/showcase/<id>` |
| `title` / `titleEn` | 是 / 否 | 作品名 |
| `author` | 是 | 作品里的署名 |
| `kind` | 是 | 类型，例如 `Vibe Coding` |
| `publishedAt` | 是 | 首次发布日期，`YYYY-MM-DD` |
| `summary` / `summaryEn` | 是 / 否 | 一段话简介 |
| `cover` | 是 | 封面相对路径 |
| `tags` | 否 | 技术与题材标签 |
| `demo` | 否 | `{ file, bytes, sha256 }`，`file` 必须是 `<id>/` 下的 `.html` |
| `facts` | 否 | `{ label, value }` 关键数字 |
| `sections` | 否 | `{ title, body[] }` 正文段落 |
| `gallery` | 否 | `{ src, caption }` 图集 |
| `prompts` | 否 | `{ title, act, prompt }` 作品里用到的提示词 |
| `links` | 否 | `{ label, url }` 作者公开的外部链接 |

英文字段在原字段名后加 `En`，缺省时显示中文。

## 收录规则

- 保留作者署名，正文只写能从作品本身或作者公开说明核对的事实。
- 不放私人聊天原文、截图，也不放作者的微信号、手机号等联系方式，除非作者明确同意公开。
- `demo` 在官网的 `/play/<id>` 下以沙箱运行：独立的不透明源，禁止任何网络请求。作品需要联网或外部资源时，先改官网的 CSP 并验证，再收录。
- 作者要求撤下时，从 `cases.json` 删除条目即可下线。
