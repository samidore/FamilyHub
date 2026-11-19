# 小离总周报 · 私人小说阅读模块

此模块是 FamilyHub 原生 Astro 页面 `/novel-archive/`，属于首页最后一个独立分类。使用已经存在的 `FirebaseHouseholdSession`：与 Sami 小本本共享 Google Firebase Auth 的浏览器登录状态与 `households/<householdId>/members/<uid>` 权限，不建立新网站、账号或 token。

首页分类按 `src/config/modules.ts` 的 `novelBooks` 每本小说一张卡片（标题是可公开的书名），打开 `/novel-archive/?book=<slug>`，页面标题即书名。

## 视图与地址

地址是唯一的视图状态（`src/lib/novelArchiveRoute.ts`）：`?book=<slug>&view=<view>&doc=<path>#<hash>`。`view` 现有 `reader`（默认，地址里省略）与 `timeline`；以后的视图加进 `novelViews` 即可。用户切书、切视图、点链接都写入地址（pushState）；浏览器前进后退只按地址重绘，不再写历史。旧的 `?book=&doc=` 链接仍打开阅读器。

- **阅读器**：原有的编译页、目录与检索。
- **时间线**：`src/lib/novelTimeline.ts` + `src/lib/novelTimelineModel.ts` + `src/styles/novelTimeline.css`，移植自定稿原型 `CodexTasks/orchestrator/discussions/sm-visuals/timeline-claude/template.html`。Event 标题跳到阅读器的 `events/E-xxxx.md`，出处 `C#P#` 跳到 `source/C#.md#p#`，线路名跳到该 Owner 的时间索引页。时间线数据是 `books/<slug>/timeline`，由 Novel 仓库 `site/sync_familyhub.py` 写成**一个 JSON 字符串**（RTDB 会丢掉空列表与空对象），页面登录后读取并 `JSON.parse`。

## 权威与数据流

- **唯一内容来源**：私有 `leahthemule/novel-knowledge-base` 仓库的正式 `novels/<slug>/kb/`、正文以及由既有 publish 流程生成的 `compiled/`。
- **只读镜像**：在上述私有仓库运行 `site/sync_familyhub.py`，把 `compiled/` 的 Markdown 转为经过清理的 HTML，写到 FamilyHub 的既有 Firebase Realtime Database。
- **访问权限**：`database.rules.json` 的 `novelArchive` 规则沿用其他家庭模块的 Google 身份验证、已验证邮箱及家庭成员邮箱匹配，只读；网页端不能修改小说。
- **页面**：`src/lib/novelArchiveUi.ts` 在权限为 `connected` 后才读取 `catalog`、目标小说的 `manifest`，以及所需页面；检索时单独读取 `search`。读取失败时不给出公开数据回退。退出或撤销权限时清空已有阅读视图。
- **导航**：保留每个编译 Event 的独立页面、Owner 的 K/AN 页面、世界、伏笔、章节 `C#P#` 原文定位。所有点击仍停留在 FamilyHub 网站内。
- **隐私**：GitHub Pages 输出只包含登录和阅读器壳。小说正文、KB 内容、检索索引都不进入公开 repo、`src/data/` 或静态 HTML。

## 上线顺序

1. `database.rules.json` 随 main 的部署流程自动部署（`.github/workflows/deploy.yml` 的 rules job，用仓库 secret `FIREBASE_SERVICE_ACCOUNT`）。
2. 在私有 Novel 仓库按其 `site/README.md` 执行一次同步（需要 Firebase Admin 凭证）。后续每次正式 `chain.py publish` 后再同步。
3. 在已验证家庭成员的 Google 账号登录 FamilyHub，打开「小离总周报」，确认小说清单、正文和跳转；未登录、未批准的账号不能读取。

验证重点：Realtime Database emulator 对已批准成员、陌生身份、密码身份、邮箱不符和客户端写入的真实规则判定；页面未认证时内容必须为空。上线前还需通过 `pnpm run verify`。

`tests/novel-archive-privacy.test.mjs` 扫描 `dist`，确保没有 Event ID、`C#P#` 或 Owner ID 进入公开构建。

`tests/novel-archive-views.spec.ts` 用 Playwright 在浏览器里模拟一个已登录用户与 RTDB（不需要 emulator 或真实凭证），覆盖未登录不读取、直达链接与刷新、视图与书之间的前进后退。它默认跳过；运行方式：

1. 用以下环境变量构建：`PUBLIC_FIREBASE_API_KEY=novel-stub-key`、`PUBLIC_FIREBASE_AUTH_DOMAIN=novel-stub.firebaseapp.com`、`PUBLIC_FIREBASE_PROJECT_ID=novel-stub`、`PUBLIC_FIREBASE_DATABASE_URL=https://novel-stub.firebaseio.com`、`PUBLIC_FIREBASE_APP_ID=1:1:web:novelstub`、`PUBLIC_FAMILY_HOUSEHOLD_ID=novel-stub-house`，执行 `pnpm run build`。
2. 带 `NOVEL_FIREBASE_STUB=1` 执行 `npx playwright test tests/novel-archive-views.spec.ts`。另设 `NOVEL_SHOTS_DIR=<目录>` 会输出手机与桌面截图；设 `NOVEL_STUB_DB=<json>` 可以用一份完整私人数据（`{manifest,pages,search,timeline}`）代替合成数据。这份 JSON 不得提交。
3. 不带这些变量重新 `pnpm run build`，`dist` 才回到正常构建。
