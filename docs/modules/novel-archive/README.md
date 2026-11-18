# 小离总周报 · 私人小说阅读模块

此模块是 FamilyHub 原生 Astro 页面 `/novel-archive/`，属于首页最后一个独立分类。使用已经存在的 `FirebaseHouseholdSession`：与 Sami 小本本共享 Google Firebase Auth 的浏览器登录状态与 `households/<householdId>/members/<uid>` 权限，不建立新网站、账号或 token。不同小说由登录后的私人 catalog 列出，并在同一页面通过查询参数 `book` 与 `doc` 独立导航。

## 权威与数据流

- **唯一内容来源**：私有 `leahthemule/novel-knowledge-base` 仓库的正式 `novels/<slug>/kb/`、正文以及由既有 publish 流程生成的 `compiled/`。
- **只读镜像**：在上述私有仓库运行 `site/sync_familyhub.py`，把 `compiled/` 的 Markdown 转为经过清理的 HTML，写到 FamilyHub 的既有 Firebase Realtime Database。
- **访问权限**：`database.rules.json` 的 `novelArchive` 规则沿用其他家庭模块的 Google 身份验证、已验证邮箱及家庭成员邮箱匹配，只读；网页端不能修改小说。
- **页面**：`src/lib/novelArchiveUi.ts` 在权限为 `connected` 后才读取 `catalog`、目标小说的 `manifest`，以及所需页面；检索时单独读取 `search`。读取失败时不给出公开数据回退。退出或撤销权限时清空已有阅读视图。
- **导航**：保留每个编译 Event 的独立页面、Owner 的 K/AN 页面、世界、伏笔、章节 `C#P#` 原文定位。所有点击仍停留在 FamilyHub 网站内。
- **隐私**：GitHub Pages 输出只包含登录和阅读器壳。小说正文、KB 内容、检索索引都不进入公开 repo、`src/data/` 或静态 HTML。

## 上线顺序

1. 使用现有 Firebase 项目管理员权限部署本仓库的 `database.rules.json`（仅提交代码不会更新线上规则）：`firebase deploy --only database --project <现有项目ID>`。
2. 在私有 Novel 仓库按其 `site/README.md` 执行一次同步（需要 Firebase Admin 凭证）。后续每次正式 `chain.py publish` 后再同步。
3. 在已验证家庭成员的 Google 账号登录 FamilyHub，打开「小离总周报」，确认小说清单、正文和跳转；未登录、未批准的账号不能读取。

验证重点：Realtime Database emulator 对已批准成员、陌生身份、密码身份、邮箱不符和客户端写入的真实规则判定；页面未认证时内容必须为空。上线前还需通过 `pnpm run verify`。
