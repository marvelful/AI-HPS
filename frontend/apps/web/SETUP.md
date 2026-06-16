# AI-HPS Web Portal — Setup

React + Vite + TypeScript + Tailwind CSS web portal for admins and clinical staff.

## Quick Start

```bash
cd frontend/web
npm install
cp .env.example .env        # set VITE_API_URL
npm run dev                 # http://localhost:3000
```

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Landing page (Lovable-style dual-surface) |
| `/login` | Public | Staff & admin login |
| `/patient/register` | Public | Patient self-registration |
| `/patient/login` | Public | Patient login |
| `/admin/dashboard` | Staff/Admin | KPI overview |
| `/admin/procedures` | Staff/Admin | Procedure library |
| `/admin/approvals` | Staff/Admin | Approval queue |
| `/admin/analytics` | Staff/Admin | AI query analytics |
| `/admin/audit` | Admin | Audit log (HMAC) |
| `/admin/users` | Admin | User & role management |
| `/admin/ai-monitor` | Admin | LangGraph agent status |
| `/admin/notifications` | Staff/Admin | Notifications |
| `/patient/home` | Patient | Patient home |
| `/patient/browse` | Patient | Browse by dept/category |
| `/patient/search` | Patient | Search procedures |
| `/patient/assistant` | Patient | AI chat assistant |
| `/patient/procedure/:id` | Patient | Procedure detail & steps |

## Role Routing

After login the app routes automatically:
- `patient` → `/patient/home`
- All other roles → `/admin/dashboard`

## Design Tokens

All brand colors are defined in:
- `src/lib/tokens.ts` (JS constants)
- `tailwind.config.js` (Tailwind classes)
- `src/index.css` (CSS variables)

Colors: HGD Blue (#004A8F), HGD Orange (#E8620A), clinical semantic colors.
Font: Inter (Google Fonts).
