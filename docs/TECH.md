# 拾潮 · 技术方案（TECH）

> 阶段 4 产物。经用户确认后才能开始实现（阶段 5）。
> 依据：`docs/PRINCIPLES.md`、`docs/SCOPE.md`、`docs/DESIGN.md`。
> 环境已核实：本机 Node v24.22.1、npm 10.9.4；同套栈（Vite + React + TS + Dexie）
> 已在 TOPIK MASTER 项目上跑通过。

## 结论：采纳建议方案，不做大的改动

纯前端应用，React + Vite，无后端；本地数据库 IndexedDB（Dexie）；部署 GitHub Pages；
代码按功能分模块，数据层和界面层分开。

## 技术栈

| 层 | 选择 | 为什么 |
| --- | --- | --- |
| 语言 | TypeScript | 设定卡、伏笔这些数据模型字段多，类型能在写错字段时立刻报错；与 TOPIK MASTER 同栈，已跑通 |
| 框架 | React + Vite | 建议方案；静态构建产物直接放 GitHub Pages，无需服务器 |
| 本地数据库 | Dexie（IndexedDB 封装） | 建议方案；比原生 IndexedDB 好写得多，版本升级有迁移机制 |
| 部署 | GitHub Pages（项目站，路径 `/shichao/`） | 建议方案；只托管静态文件，不接收、不存储用户数据，符合 PRINCIPLES 第 4 条 |
| 部署方式 | GitHub Actions 官方 `upload-pages-artifact` + `deploy-pages` | 不引第三方部署 Action，构建产物由仓库自己的 Action 生成 |

## 第三方库（只列会用到的，每个说明用途）

| 库 | 用途 | 不用的理由之外的说明 |
| --- | --- | --- |
| `react`、`react-dom` | 界面 | 核心框架 |
| `dexie` | IndexedDB 读写、版本迁移 | 唯一的数据层依赖 |
| `@vitejs/plugin-react` | Vite 的 React 插件 | 脚手架自带 |
| `vitest`（开发依赖） | 数据层单元测试（阶段 6 自测用） | 只测数据层，不测界面快照 |

版本在阶段 5.1 脚手架时锁定并写进 `package.json`，以当时能装到的稳定版为准，不提前写死版本号。

## 明确不引入的依赖（及理由）

| 不引入 | 理由 |
| --- | --- |
| Tailwind / 任何 UI 组件库 | 设计是定制的 token 体系（6 色、两种字体），组件库的默认样式会和它打架；手写 CSS 变量更贴合，也更小 |
| `react-router-dom` | 只有 5 个底部导航入口，用内部状态切换页面就够了，不需要路由库 |
| `framer-motion` / 任何动效库 | 全应用唯一的动效是潮位首页的水位与礁石露出，只用 CSS `transform` + `opacity`，600–900ms 缓出，不需要动效库 |
| `react-flow` 等关系图库 | 关系节点图规模小（人物、地点几个节点），用指针事件 + SVG 自己实现拖动即可，图库太重 |
| 任何 AI SDK | AI 调用只用浏览器原生 `fetch`，不绑死某个厂商的 SDK（见下节） |
| PWA 插件（`vite-plugin-pwa`） | 范围里没要求“安装到手机桌面”，只要求本地数据 + Pages 托管；以后要加再加，不提前扩范围 |
| 统计、埋点、崩溃上报 | PRINCIPLES 第 4 条禁止 |

## 代码结构（按功能分模块，数据层和界面层分开）

```
shichao/
  docs/                 # PRINCIPLES / SCOPE / DESIGN / TECH（本文档）
  public/               # 静态资源（图标等，不含用户数据）
  src/
    main.tsx            # 入口，只做挂载
    App.tsx             # 底部导航 + 页面切换 + 主题切换
    lib/
      types.ts          # 全部数据模型的类型
      db.ts             # Dexie 建库、表结构、版本迁移
      ai.ts             # AI 调用（fetch 直连 + 确认门禁，见下）
      prompts.ts        # 两段 AI 提示词常量（阶段 5 的规范原文）
      export.ts         # 导出 Markdown / JSON、导入自己导出的 JSON
      themes.ts         # 深夜 / 白天主题切换、跟随系统
    features/
      tide/             # 潮位首页（水位、礁石、唯一动效）
      shells/           # 贝壳盒
      cards/            # 设定卡（含关系节点图）
      foreshadowing/    # 伏笔
      moon/             # 月相
      journal/          # 潮汐表（每日字数手动登记）
      settings/         # 设置页（Key、主题、数据清空、导出入口）
    components/         # 跨页面共用小组件（确认弹窗、空状态等）
    styles/
      tokens.css        # 6 色 token（CSS 变量，两套主题赋值）
      base.css          # 字体、间距、焦点样式
  README.md / LICENSE / CHANGELOG.md / .gitignore   # 阶段 8
```

## 数据模型（Dexie 表，初版）

| 表 | 主要字段 |
| --- | --- |
| `shells`（贝壳盒） | id、文字、标签[]、心情、日期、创建时间 |
| `cards`（设定卡） | id、类型（人物/关系/世界观）、标题、字段{}（自定义）、位置{x,y}（关系节点用）、创建时间 |
| `foreshadowing`（伏笔） | id、标题、说明、关联设定卡 id[]、状态（已埋下/已回收/已放弃）、创建时间 |
| `moon`（月相） | id、名称、链接、自己的笔记、日期、二创规则勾选[] |
| `journal`（潮汐表） | 日期（主键）、当日字数（手动登记） |
| `settings`（设置） | key（单条）：AI Key、AI 接口地址、模型名、主题选择 |

- 摘要字段（月相笔记等）在数据层校验长度 ≤200 字，不只靠界面提示。
- Key 只存在 `settings` 表本机，导出时排除，清空数据时一并清除。

## 主题实现（深夜 / 白天）

- 6 个颜色做成 CSS 变量，`tokens.css` 里两套赋值：`[data-theme="day"]` 与 `[data-theme="night"]`。
- 默认跟随系统（`prefers-color-scheme`），用户在设置页可手动切“深夜 / 白天 / 跟随系统”，选择只存本机。
- 字体不下载：用系统字体栈，`Noto Serif SC` / `Noto Sans SC` 优先， fallback 到系统衬线/无衬线。理由：中文字体文件以 MB 计，下载会拖慢首屏、破坏离线优先；系统自带字体已能呈现设计，阶段 3 的字体角色（衬线氛围、无衬线功能）不变。

## AI 调用层（`lib/ai.ts`）

- 只用浏览器原生 `fetch` 直连用户配置的接口，不经过任何自建服务器。
- 设置页字段：接口地址、模型名、Key。三个都由用户自己填，代码里不内置任何默认值里的 Key，也不内置固定厂商。
- 建议的默认值（待用户确认）：接口按 OpenAI 兼容的 chat completions 格式走，即用户填一个兼容该格式的地址就能用，不锁死某一家。理由：用户没指定 AI 服务商，兼容格式覆盖面最广；换服务商时只改设置页，不改代码。
- 调用前置条件（PRINCIPLES 第 5 条）：弹出确认「将把你选中的这段文字发送给 AI 服务，是否继续？」+ 勾选「这是我自己的原创文字」，未勾选直接拒绝发送。
- 跨域失败时（PRINCIPLES 第 7 条）：把错误原样报给用户并给出备选方案，不擅自搭建中转服务器。

## 需要用户确认的点

1. **AI 服务商没指定**：我建议用 OpenAI 兼容格式、由用户在设置页填地址、模型、Key，不锁死厂商。认不认？如果用户已有常用服务商（比如 DeepSeek），告诉我，我把默认值写成它。
2. **字体不下载**：用系统字体栈，不从网上下载 Noto 字体文件。认不认？要下载的话首屏会变慢，离线时也可能回落到系统字体。

---

*版本：v0.1.0 草案，随阶段 4 建立；经用户确认后进入阶段 5。*
