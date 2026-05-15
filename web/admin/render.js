const {
    buildLicenseExportUrl,
    buildLicensePageUrl,
    buildLicenseStats,
    formatDateTime,
    getLicenseStatusLabel
} = require('./licenseService');

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderLayout({ title, body, pageClass = '' }) {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --ink: #111111;
      --muted: #666663;
      --line: rgba(17, 17, 17, 0.1);
      --line-strong: rgba(17, 17, 17, 0.18);
      --panel: rgba(255, 255, 255, 0.86);
      --soft: #f8f8f6;
      --danger: #d45555;
      --danger-soft: #fff7f7;
      --success-soft: #f7fbf7;
      --shadow: 0 24px 60px rgba(17, 17, 17, 0.08);
      --radius-lg: 28px;
      --radius-md: 22px;
      --radius-sm: 16px;
      --font-ui: "Pretendard Variable", "SUIT Variable", "Noto Sans KR", sans-serif;
    }
    * { box-sizing: border-box; }
    html { color-scheme: light; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      font-family: var(--font-ui);
      background:
        radial-gradient(circle at top left, rgba(17, 17, 17, 0.06), transparent 28%),
        radial-gradient(circle at bottom right, rgba(17, 17, 17, 0.05), transparent 24%),
        linear-gradient(180deg, #ffffff 0%, #f4f4f2 100%);
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(17, 17, 17, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(17, 17, 17, 0.02) 1px, transparent 1px);
      background-size: 34px 34px;
      mask-image: radial-gradient(circle at center, black, transparent 82%);
      pointer-events: none;
    }
    .page {
      position: relative;
      max-width: 1680px;
      margin: 0 auto;
      padding: 28px;
    }
    .login-page {
      min-height: calc(100vh - 48px);
      display: grid;
      place-items: center;
    }
    .login-shell {
      width: min(640px, 100%);
    }
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 18px;
      margin-bottom: 20px;
    }
    .hero h1 {
      margin: 0;
      font-size: clamp(34px, 5vw, 56px);
      line-height: 0.96;
      letter-spacing: -0.06em;
    }
    .hero p {
      margin: 12px 0 0;
      max-width: 760px;
      color: var(--muted);
      line-height: 1.52;
      font-size: 14px;
    }
    .eyebrow, .pill, .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.9);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--muted);
      backdrop-filter: blur(10px);
      text-transform: uppercase;
    }
    .chip {
      text-transform: none;
      letter-spacing: 0;
      font-weight: 700;
      padding: 8px 12px;
    }
    .card {
      background: var(--panel);
      border: 1px solid rgba(255, 255, 255, 0.86);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
    }
    .card-section { padding: 24px; }
    .card-title {
      margin: 0;
      font-size: 22px;
      letter-spacing: -0.04em;
    }
    .muted { color: var(--muted); }
    .flash {
      margin-bottom: 16px;
      padding: 14px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.86);
      box-shadow: 0 10px 24px rgba(17, 17, 17, 0.04);
    }
    .flash.ok { background: var(--success-soft); }
    .flash.error {
      background: var(--danger-soft);
      border-color: rgba(212, 85, 85, 0.24);
    }
    .button, button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 46px;
      padding: 0 18px;
      border: 0;
      border-radius: 16px;
      cursor: pointer;
      text-decoration: none;
      font: inherit;
      font-weight: 800;
      color: white;
      background: linear-gradient(180deg, #1b1b1b 0%, #050505 100%);
      box-shadow: 0 12px 28px rgba(17, 17, 17, 0.16);
    }
    .button.light, button.light {
      color: var(--ink);
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid var(--line);
      box-shadow: none;
    }
    .button.danger, button.danger {
      background: linear-gradient(180deg, #db5b5b 0%, #c33d3d 100%);
    }
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    label {
      display: block;
      margin-bottom: 7px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 14px 15px;
      background: rgba(255, 255, 255, 0.96);
      color: var(--ink);
      font: inherit;
      outline: none;
    }
    textarea {
      min-height: 180px;
      resize: vertical;
    }
    .app-shell {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 24px;
      align-items: start;
    }
    .content {
      min-width: 0;
    }
    .sidebar {
      position: sticky;
      top: 24px;
      min-height: calc(100vh - 48px);
      padding: 28px;
      border-radius: 30px;
      color: white;
      background:
        radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 30%),
        linear-gradient(180deg, #151515 0%, #060606 100%);
      box-shadow: 0 28px 60px rgba(0, 0, 0, 0.22);
    }
    .sidebar > .eyebrow {
      margin-bottom: 22px;
    }
    .sidebar h2 {
      margin: 0;
      font-size: 34px;
      letter-spacing: -0.07em;
      line-height: 0.94;
    }
    .sidebar small {
      display: block;
      margin-top: 12px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.62);
      line-height: 1.5;
    }
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 28px;
    }
    .sidebar-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 15px 16px;
      border-radius: 18px;
      text-decoration: none;
      color: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }
    .sidebar-link.active {
      color: #111111;
      background: white;
      border-color: white;
    }
    .sidebar-footer {
      margin-top: 26px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      display: grid;
      gap: 10px;
      color: rgba(255, 255, 255, 0.76);
      font-size: 13px;
    }
    .meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 14px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      grid-column: span 3;
      padding: 18px;
      border-radius: 22px;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 248, 246, 0.92) 100%);
    }
    .stat-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 800;
    }
    .stat-value {
      margin-top: 10px;
      font-size: 34px;
      line-height: 1;
      letter-spacing: -0.06em;
      font-weight: 900;
    }
    .stat-sub {
      margin-top: 8px;
      color: var(--muted);
      font-size: 13px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 16px;
    }
    .span-4 { grid-column: span 4; }
    .span-5 { grid-column: span 5; }
    .span-7 { grid-column: span 7; }
    .span-8 { grid-column: span 8; }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(180px, 0.6fr) auto;
      gap: 12px;
      align-items: end;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .admin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 14px;
    }
    .admin-card {
      padding: 18px;
      border-radius: 22px;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #ffffff 0%, #f8f8f6 100%);
    }
    .admin-card h3 {
      margin: 0;
      font-size: 20px;
      letter-spacing: -0.04em;
    }
    .admin-row {
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }
    .token-box {
      margin-top: 12px;
      padding: 13px 14px;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.96);
      color: var(--ink);
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 12px;
      line-height: 1.55;
      min-height: 84px;
    }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.96);
    }
    table {
      width: 100%;
      min-width: 1040px;
      border-collapse: collapse;
    }
    th, td {
      padding: 14px 15px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid rgba(17, 17, 17, 0.06);
      font-size: 14px;
      white-space: nowrap;
    }
    th {
      background: #fafaf8;
      color: #3b3b3b;
      font-weight: 800;
    }
    td { color: #565656; }
    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.96);
      font-size: 12px;
      font-weight: 800;
      color: #232323;
    }
    .empty {
      padding: 26px;
      border-radius: 20px;
      border: 1px dashed var(--line-strong);
      color: var(--muted);
      background: rgba(255, 255, 255, 0.82);
    }
    .inline-note {
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
    .filter-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 14px;
    }
    .chip-link {
      display: inline-flex;
      align-items: center;
      padding: 9px 12px;
      border-radius: 999px;
      text-decoration: none;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.96);
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .chip-link.active {
      color: white;
      background: #111111;
      border-color: #111111;
    }
    @media (max-width: 1080px) {
      .app-shell { grid-template-columns: 1fr; }
      .sidebar { position: static; min-height: auto; }
      .span-4, .span-5, .span-7, .span-8, .stat-card { grid-column: span 12; }
      .form-grid-3 { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      .page { padding: 16px; }
      .hero { flex-direction: column; align-items: flex-start; }
      .form-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="page ${escapeHtml(pageClass)}">${body}</div>
</body>
</html>`;
}

function renderFlash(type, message) {
    if (!message) return '';
    return `<div class="flash ${type}">${escapeHtml(message)}</div>`;
}

function renderStats(items) {
    return `
      <div class="stats">
        ${items.map(item => `
          <div class="stat-card">
            <div class="stat-label">${escapeHtml(item.label)}</div>
            <div class="stat-value">${escapeHtml(String(item.value))}</div>
            <div class="stat-sub">${escapeHtml(item.sub || '')}</div>
          </div>
        `).join('')}
      </div>`;
}

function renderLoginPage({ errorMessage = '', noticeMessage = '' } = {}) {
    const body = `
      <div class="login-page">
        <div class="login-shell">
          <div class="hero">
            <div>
              <div class="eyebrow">VC Admin</div>
              <h1>Discord Login</h1>
              <p>로그인 후 권한에 맞는 대시보드로 이동합니다.</p>
            </div>
            <div class="pill">OAuth2</div>
          </div>
          ${renderFlash('ok', noticeMessage)}
          ${renderFlash('error', errorMessage)}
          <section class="card">
            <div class="card-section">
              <h2 class="card-title">관리 페이지</h2>
              <div class="actions">
                <a class="button" href="/admin/discord/login">Discord로 로그인</a>
              </div>
            </div>
          </section>
        </div>
      </div>`;

    return renderLayout({ title: 'Discord Login', body, pageClass: 'login-page' });
}

function buildSidebar(session, activePage) {
    const items = [];

    if (session.isSuperAdmin) {
        items.push({ href: '/admin/admins', label: '관리자', suffix: 'ROOT', active: activePage === 'admins' });
    }

    items.push(
        { href: '/admin/licenses', label: '라이센스', suffix: 'KEYS', active: activePage === 'licenses' },
        { href: '/admin/settings', label: '설정', suffix: 'TOKEN', active: activePage === 'settings' }
    );

    return `
      <aside class="sidebar">
        <div class="eyebrow">VC Premium</div>
        <h2>Control<br/>Panel</h2>
        <small>${session.isSuperAdmin ? '최고 관리자' : '일반 관리자'}</small>
        <nav class="sidebar-nav">
          ${items.map(item => `
            <a class="sidebar-link ${item.active ? 'active' : ''}" href="${item.href}">
              <span>${item.label}</span>
              <span>${item.suffix}</span>
            </a>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <div>${escapeHtml(session.displayName)}</div>
          <div>ID ${escapeHtml(session.userId)}</div>
          <form method="post" action="/admin/logout">
            <button class="light" type="submit">로그아웃</button>
          </form>
        </div>
      </aside>`;
}

function renderShell({ session, activePage, title, subtitle = '', statItems = [], content, noticeMessage = '', errorMessage = '' }) {
    const body = `
      <div class="app-shell">
        ${buildSidebar(session, activePage)}
        <main class="content">
          <div class="hero">
            <div>
              <div class="eyebrow">${escapeHtml(activePage)}</div>
              <h1>${escapeHtml(title)}</h1>
              ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
              <div class="meta">
                <span class="chip">${escapeHtml(session.displayName)}</span>
                <span class="chip">${escapeHtml(session.userId)}</span>
                <span class="chip">${session.isSuperAdmin ? '최고 관리자' : '일반 관리자'}</span>
              </div>
            </div>
            <div class="pill">Dashboard</div>
          </div>
          ${renderFlash('ok', noticeMessage)}
          ${renderFlash('error', errorMessage)}
          ${statItems.length ? renderStats(statItems) : ''}
          ${content}
        </main>
      </div>`;

    return renderLayout({ title, body });
}

function renderAdminCards(accounts, isSuperAdmin) {
    if (!accounts.length) {
        return '<div class="empty">등록된 관리자가 없습니다.</div>';
    }

    return `
      <div class="admin-grid">
        ${accounts.map(account => `
          <article class="admin-card">
            <h3>${escapeHtml(account.display_name || '이름 없음')}</h3>
            <div class="admin-row">ID <strong>${escapeHtml(account.user_id)}</strong></div>
            <div class="admin-row">최근 로그인 ${escapeHtml(formatDateTime(account.last_login_at))}</div>
            <div class="token-box">${escapeHtml(account.dashboard_token || '')}</div>
            ${isSuperAdmin && !account.is_super_admin ? `
              <div class="actions">
                <form method="post" action="/admin/admins/deactivate">
                  <input type="hidden" name="user_id" value="${escapeHtml(account.user_id)}" />
                  <button class="danger" type="submit">삭제</button>
                </form>
              </div>
            ` : ''}
          </article>
        `).join('')}
      </div>`;
}

function renderAdminPage({ session, adminRows, noticeMessage = '', errorMessage = '' }) {
    const tokenReadyCount = adminRows.filter(row => row.dashboard_token).length;
    const statItems = [
        { label: 'admins', value: adminRows.length, sub: '등록된 관리자' },
        { label: 'tokens', value: tokenReadyCount, sub: '토큰 저장 완료' },
        { label: 'super', value: 1, sub: '최고 관리자' },
        { label: 'panel', value: 'LIVE', sub: '관리 패널' }
    ];

    const content = `
      <div class="grid">
        <section class="card span-4">
          <div class="card-section">
            <h2 class="card-title">관리자 추가</h2>
            <form method="post" action="/admin/admins/appoint">
              <div class="form-grid">
                <div>
                  <label for="admin-user-id">Discord ID</label>
                  <input id="admin-user-id" name="user_id" placeholder="123456789012345678" required />
                </div>
                <div>
                  <label for="admin-display-name">닉네임</label>
                  <input id="admin-display-name" name="display_name" placeholder="선택" />
                </div>
              </div>
              <div class="actions">
                <button type="submit">추가</button>
              </div>
            </form>
          </div>
        </section>
        <section class="card span-8">
          <div class="card-section">
            <h2 class="card-title">관리자 목록</h2>
            ${renderAdminCards(adminRows, session.isSuperAdmin)}
          </div>
        </section>
      </div>`;

    return renderShell({
        session,
        activePage: 'admins',
        title: '관리자 패널',
        subtitle: '추가와 삭제만 빠르게 처리합니다.',
        statItems,
        content,
        noticeMessage,
        errorMessage
    });
}

function renderLicenseFilterChips(filters) {
    const entries = [
        { status: 'all', label: '전체' },
        { status: 'unused', label: '미사용' },
        { status: 'used', label: '사용됨' },
        { status: 'active', label: '활성' },
        { status: 'expired', label: '만료' }
    ];

    return `
      <div class="filter-chips">
        ${entries.map(entry => `
          <a class="chip-link ${filters.status === entry.status ? 'active' : ''}"
             href="${buildLicensePageUrl({ q: filters.q, status: entry.status })}">
            ${entry.label}
          </a>
        `).join('')}
      </div>`;
}

function renderLicenseTable(licenseRows, filters) {
    if (!licenseRows.length) {
        return '<div class="empty">조건에 맞는 라이센스가 없습니다.</div>';
    }

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>키</th>
              <th>기간</th>
              <th>상태</th>
              <th>사용자</th>
              <th>시작</th>
              <th>만료</th>
              <th>생성</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            ${licenseRows.map(row => `
              <tr>
                <td>${escapeHtml(row.id)}</td>
                <td>${escapeHtml(Number(row.duration_days) >= 99999 ? '영구' : `${row.duration_days}일`)}</td>
                <td>${escapeHtml(getLicenseStatusLabel(row))}</td>
                <td>${escapeHtml(row.user_id || '-')}</td>
                <td>${escapeHtml(formatDateTime(row.start_date))}</td>
                <td>${escapeHtml(formatDateTime(row.expiry_date))}</td>
                <td>${escapeHtml(formatDateTime(row.created_at))}</td>
                <td>
                  <form method="post" action="/admin/licenses/delete">
                    <input type="hidden" name="license_id" value="${escapeHtml(row.id)}" />
                    <input type="hidden" name="return_q" value="${escapeHtml(filters.q || '')}" />
                    <input type="hidden" name="return_status" value="${escapeHtml(filters.status || 'all')}" />
                    <button class="danger" type="submit">삭제</button>
                  </form>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
}

function renderLicensePage({ session, licenseRows, filters, noticeMessage = '', errorMessage = '' }) {
    const statItems = buildLicenseStats(licenseRows);
    const content = `
      <div class="grid">
        <section class="card span-4">
          <div class="card-section">
            <h2 class="card-title">라이센스 생성</h2>
            <form method="post" action="/admin/licenses/create">
              <div class="form-grid">
                <div>
                  <label for="license-duration">기간</label>
                  <input id="license-duration" name="duration" placeholder="30 또는 영구" required />
                </div>
                <div>
                  <label for="license-count">개수</label>
                  <input id="license-count" name="count" placeholder="5" required />
                </div>
              </div>
              <input type="hidden" name="return_q" value="${escapeHtml(filters.q || '')}" />
              <input type="hidden" name="return_status" value="${escapeHtml(filters.status || 'all')}" />
              <div class="actions">
                <button type="submit">생성</button>
              </div>
            </form>
          </div>
        </section>
        <section class="card span-8">
          <div class="card-section">
            <div class="toolbar">
              <h2 class="card-title">라이센스 현황</h2>
              <a class="button light" href="${buildLicenseExportUrl(filters)}">엑셀 다운로드</a>
            </div>
            <form method="get" action="/admin/licenses">
              <div class="form-grid-3">
                <div>
                  <label for="license-query">검색</label>
                  <input id="license-query" name="q" placeholder="라이센스 키 또는 사용자 ID" value="${escapeHtml(filters.q || '')}" />
                </div>
                <div>
                  <label for="license-status">상태</label>
                  <select id="license-status" name="status">
                    <option value="all" ${filters.status === 'all' ? 'selected' : ''}>전체</option>
                    <option value="unused" ${filters.status === 'unused' ? 'selected' : ''}>미사용</option>
                    <option value="used" ${filters.status === 'used' ? 'selected' : ''}>사용됨</option>
                    <option value="active" ${filters.status === 'active' ? 'selected' : ''}>활성</option>
                    <option value="expired" ${filters.status === 'expired' ? 'selected' : ''}>만료</option>
                  </select>
                </div>
                <button type="submit">검색</button>
              </div>
            </form>
            ${renderLicenseFilterChips(filters)}
            <div style="margin-top:16px;">
              ${renderLicenseTable(licenseRows, filters)}
            </div>
          </div>
        </section>
      </div>`;

    return renderShell({
        session,
        activePage: 'licenses',
        title: '라이센스 관리',
        subtitle: '검색, 생성, 삭제, 다운로드',
        statItems,
        content,
        noticeMessage,
        errorMessage
    });
}

function renderSettingsPage({ session, currentToken = '', noticeMessage = '', errorMessage = '' }) {
    const hasToken = Boolean(String(currentToken || '').trim());
    const statItems = [
        { label: 'status', value: hasToken ? 'READY' : 'EMPTY', sub: '토큰 상태' },
        { label: 'commands', value: hasToken ? 'LIVE' : 'WAIT', sub: '명령 사용 준비' },
        { label: 'user', value: session.displayName, sub: '현재 계정' },
        { label: 'sync', value: 'REALTIME', sub: '저장 즉시 반영' }
    ];

    const content = `
      <div class="grid">
        <section class="card span-7">
          <div class="card-section">
            <h2 class="card-title">실행 토큰</h2>
            <form method="post" action="/admin/settings/token">
              <label for="runtime-token">Token</label>
              <textarea id="runtime-token" name="runtime_token" placeholder="관리자 계정 토큰 입력" required>${escapeHtml(currentToken)}</textarea>
              <div class="inline-note">Discord OAuth 로그인으로는 셀프봇 실행용 사용자 토큰이 내려오지 않아서, 이 값은 직접 저장해야 합니다.</div>
              <div class="actions">
                <button type="submit">저장</button>
              </div>
            </form>
          </div>
        </section>
        <section class="card span-5">
          <div class="card-section">
            <h2 class="card-title">상태</h2>
            <div class="actions" style="margin-top:12px;">
              <div class="status-pill">${hasToken ? '저장된 토큰 있음' : '저장된 토큰 없음'}</div>
            </div>
            <div class="inline-note">저장 후 관리자 클라이언트에 즉시 반영을 시도하고, masters.json도 함께 동기화됩니다.</div>
          </div>
        </section>
      </div>`;

    return renderShell({
        session,
        activePage: 'settings',
        title: '설정',
        subtitle: '토큰 저장과 즉시 반영',
        statItems,
        content,
        noticeMessage,
        errorMessage
    });
}

module.exports = {
    renderAdminPage,
    renderLayout,
    renderLicensePage,
    renderLoginPage,
    renderSettingsPage,
    escapeHtml
};
