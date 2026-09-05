# 手工川 AI 案例集

[在 LovStudio 官网观看完整展览](https://lovstudio.ai/ai-cases)

12 个有原文、产物或运行记录的 AI 实践案例。GSAP 3.15.0 驱动首屏叙事、横向精选展廊、Flip 筛选重排和作品转场；支持图片放大、人像比较、21 站行程、横竖版视频、243 条字幕与声音节选。

本仓库是官网展览的内容与界面真源。官网从固定 Git commit 读取界面、案例与素材；完整视频和 PDF 通过 v0.2.0 Release 分发，未放入官网 public 或构建包。

- `index.html`、`styles.css`、`app.js`：展览界面，资源路径以 `/ai-cases` 为根。
- `cases.js`：12 例的文案、过程、结果、边界及证据。
- `case-study.md`：完整可下载文字稿。
- `media-data.js`：真实章节、波形与行程数据。
- `assets/`：经选取的作品展示素材；`provenance.json` 保留来源记录与校验。
- `assets/motion.*`：动效渐进增强；支持系统减少动态效果与本机开关。
- `assets/vendor/`：原版 GSAP、ScrollTrigger、Flip；授权与校验详见 `manifest.json`。

案例保留各自时间与验证范围，历史体验不代表当前模型评测；不含私人聊天原文。网页展示素材不代表授予原素材的再分发许可。GSAP 遵循其 [Standard License](https://gsap.com/standard-license)。

维护时先更新此仓库、验证媒体，再在官网更新内容 commit。不要把来源台账、研究过程文件或本机环境文件批量上传。
