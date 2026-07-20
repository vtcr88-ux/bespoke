@echo off
set NODE_ENV=development
set PORT=3333
set DATABASE_URL=mysql://bespoke_app:replace_me@localhost:3306/bespoke
set SESSION_SECRET=development_session_secret_32_chars_minimum
set CORS_ORIGINS=http://localhost:5173,http://localhost:5174
set MERCADO_PAGO_ACCESS_TOKEN=TEST-replace_me
set MERCADO_PAGO_WEBHOOK_SECRET=replace_me
set WHATSAPP_STORE_PHONE=5511999999999
set PUBLIC_API_URL=http://localhost:3333
set PUBLIC_WEB_URL=http://localhost:5173
npm --workspace @bespoke/api run dev
