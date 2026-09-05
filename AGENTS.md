<!-- BEGIN:nextjs-agent-rules -->
<!-- BEGIN:design-context -->
# Design Context: ExclusiveTour BH

Site one-page de transporte executivo premium em Belo Horizonte.
Register: brand | Paleta: preto/branco + dourado (CTA) | Fonte: Inter
WhatsApp é a única conversão. Ver PRODUCT.md e DESIGN.md na raiz do projeto.
<!-- END:design-context -->
<!-- BEGIN:deployment -->
# Deployment
# Serena
- Live at: https://serenamedita.com.br/
- Host: HostGator (shared hosting), FTP via ftp.exclusivetourbh.com
- Stack: Next.js 16 (static export, `output: "export"`)
- Build: `npm run build` → `out/` → upload to `/serenamedita.com.br/` (raiz FTP = `/home/rafa6571/`)
- cPanel: user `rafa6571`, DocumentRoot `/home/rafa6571/serenamedita.com.br/`
- FTP sub-account: `opencode@rafaelregispereira...` (tem acesso a `/` = home level, não limitado a `public_html/`)

# ExclusiveTour BH
- Live at: https://exclusivetourbh.com.br/
- Host: HostGator (shared hosting), FTP via ftp.exclusivetourbh.com
- Stack: Next.js 16 (static export, `output: "export"`)
- Build: `npm run build` → `out/` → upload to `public_html/` on HostGator
- cPanel: user `rafa6571`
- FTP sub-account: `opencode@rafaelregispereira...`
<!-- END:deployment -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
