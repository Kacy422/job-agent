# JobAgent Auto-Apply Agent

Python FastAPI + Playwright（headed Chrome）。

## 安装

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
playwright install chromium
```

## 运行

```bash
uvicorn main:app --reload --port 8000
```

可选：在项目根目录 `.env.local` 放入 `DEEPSEEK_API_KEY`（当前填表主要靠字段映射，暂不强制 LLM）。

## 安全设计

- 启动后停在「等待登录」阶段
- 仅在前端确认后才填表
- **不会**点击 Submit / Apply / 提交 类按钮
