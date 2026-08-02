# Module Intro Copy Design

## Goal

Rewrite the short introduction below each module-page title so it reads like a shared household reference for the user and his wife, not like a product, coding, or data-model note.

## Scope

Change only the visible `SiteHeader` description on these three module pages:

- Day Trips
- Library Activities
- Pediatric Dentists

Keep the category eyebrow, page title, factual summary labels, filters, metadata, record content, data structures, and behavior unchanged.

## Voice

- Use concise declarative Chinese rather than questions.
- Describe what the page helps the family find or compare.
- Keep established English names and terms such as `library`, `storytime`, and `playground` in English.
- Avoid implementation language such as evidence separation, recurring-schedule modeling, tiers, or mobile filtering behavior.
- Avoid a promotional or overly conversational tone.

## Approved Copy

### Day Trips

按车程、天气和孩子当天的活动需求，筛选附近的公园、playground、自然中心、动物园和其他适合全家出门的地方。

### Library Activities

按星期、时间和年龄，查看附近 library 的 storytime、音乐、手工和自由玩耍活动。

### Pediatric Dentists

按路程、医生背景、公开评价和长期就诊需求，比较附近的儿童牙医，并查看预约前需要向诊所确认的信息。

## Verification

- Each module page renders its approved sentence once beneath the title.
- The previous product-style descriptions no longer appear in the rendered pages.
- Astro check, production build, audit, and browser tests continue to pass.
- No structured data or private information changes.
