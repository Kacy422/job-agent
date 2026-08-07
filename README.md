# JobAgent — AI 智能求职看板与自动化网申

Next.js 前端 + DeepSeek API + Python Playwright 浏览器 Agent。

## 功能一览

1. **岗位抓取与分析** — 粘贴 Job URL，抓取 JD / 公司 / 岗位名，DeepSeek 提取关键词并与 Master CV 计算匹配度与短板
2. **专属简历与文案** — 按 JD 生成 Markdown 网页简历（可导出 PDF）、Cover Letter、开放题草稿
3. **浏览器自动网申** — headed Chrome 打开网申页 → 你手动登录 → AI 填表 → **你手动 Submit**
4. **求职看板** — 流水线状态：已匹配 → 简历已生成 → 文案已生成 → 填表中 → 填表完成 → 已投递…

## 快速开始

### 1. 前端（Next.js）

```bash
cd "D:\HK JOB\job-agent"
npm install
```

编辑 `.env.local`：

```
DEEPSEEK_API_KEY=你的密钥
AGENT_SERVICE_URL=http://127.0.0.1:8000
```

密钥申请：https://platform.deepseek.com/

```bash
npm run dev
```

打开 http://localhost:3000

> **说明（Windows / Node 24）**：若项目在 `D:` 等盘符上，Node 24 的 `fs.readlink` 可能误报 `EISDIR`，导致页面 Internal Server Error。`npm run dev` 已自动加载 `scripts/patch-fs-readlink.js` 修复。若仍异常，可先结束占用 3000 端口的旧进程，再删除 `.next` 后重启。

### 2. 自动网申 Agent（Python）

另开一个终端：

```bash
cd "D:\HK JOB\job-agent\agent"
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
playwright install chromium

uvicorn main:app --reload --port 8000
```

确认健康检查：http://127.0.0.1:8000/health

## 推荐使用流程

1. 在「专属简历」编辑 / 导入你的 Master CV  
2. 在「岗位解析」粘贴目标岗位网页链接 → 抓取并分析  
3. 生成专属简历 → 导出 PDF（可选）  
4. 在「自动网申」生成 Cover Letter / 开放题  
5. 确认 Agent 服务已启动 → 点击「启动自动网申」  
6. 在弹出的 Chrome 中完成登录与验证码  
7. 回到前端点击「我已登录，开始填表」  
8. 检查填写结果后，**手动点击页面上的 Submit**  
9. 在前端点「我已手动提交」更新看板状态  

## API 一览

| 路径 | 作用 |
|------|------|
| `POST /api/parse-job` | 抓取 Job URL + 抽取 + 匹配打分 |
| `POST /api/job-score` | JD × 简历匹配分析 |
| `POST /api/generate-resume` | 生成定制简历 |
| `POST /api/generate-apply` | Cover Letter / 开放题 / 填表字段 |
| `POST /api/agent/start` | 启动浏览器 Agent |
| `POST /api/agent/confirm-login` | 确认登录并开始填表 |
| `GET  /api/agent/status` | 查询 Agent 状态 |
| `POST /api/agent/stop` | 停止 Agent |

## 说明与限制

- 部分招聘站有反爬 / 登录墙：抓取失败时可「手动粘贴 JD」
- Master CV 与看板数据保存在浏览器 `localStorage`
- Agent **绝不会**自动点击提交按钮，最终投递权在你
- 不同 ATS（Greenhouse / Lever / Workday…）表单结构差异大，复杂多步表单可能需手动补填
- 未配置 `DEEPSEEK_API_KEY` 时仍可运行（本地启发式匹配 + 演示文案）

## 目录结构

```
job-agent/
├── src/                 # Next.js App Router 前端 + API
│   ├── app/api/         # parse-job / generate-* / agent/*
│   ├── components/      # 看板、解析、简历、网申 UI
│   ├── lib/             # DeepSeek、抓取、打分、Agent 代理
│   └── types/
├── agent/               # Python FastAPI + Playwright
│   ├── main.py
│   ├── browser_agent.py
│   └── requirements.txt
├── .env.local           # DEEPSEEK_API_KEY（勿提交）
└── package.json
```
