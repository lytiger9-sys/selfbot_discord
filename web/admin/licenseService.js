const { v4: uuidv4 } = require('uuid');
const pool = require('../../db');

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDateTime(value) {
    if (!value) return '-';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function getLicenseStatusLabel(row) {
    const now = Date.now();
    const expiry = row.expiry_date ? new Date(row.expiry_date).getTime() : null;

    if (!row.is_used) {
        return '미사용';
    }

    if (expiry && expiry > now) {
        return '사용 중';
    }

    return '만료';
}

function buildLicenseStats(licenseRows) {
    const now = Date.now();
    const used = licenseRows.filter(row => Boolean(row.is_used)).length;
    const unused = licenseRows.length - used;
    const active = licenseRows.filter(row => row.expiry_date && new Date(row.expiry_date).getTime() > now).length;

    return [
        { label: 'total', value: licenseRows.length, sub: '조회된 키' },
        { label: 'unused', value: unused, sub: '미사용' },
        { label: 'used', value: used, sub: '사용 중' },
        { label: 'active', value: active, sub: '유효' }
    ];
}

function getLicenseFilters(searchParams) {
    const q = String(searchParams.get('q') || '').trim();
    const rawStatus = String(searchParams.get('status') || 'all').trim().toLowerCase();
    const allowed = new Set(['all', 'unused', 'used', 'active', 'expired']);
    const status = allowed.has(rawStatus) ? rawStatus : 'all';
    return { q, status };
}

function buildLicensePageUrl(filters = {}) {
    const url = new URL('http://localhost/admin/licenses');
    if (filters.q) {
        url.searchParams.set('q', filters.q);
    }
    if (filters.status && filters.status !== 'all') {
        url.searchParams.set('status', filters.status);
    }
    return `${url.pathname}${url.search}`;
}

function buildLicenseExportUrl(filters = {}) {
    const url = new URL('http://localhost/admin/licenses/export.xls');
    if (filters.q) {
        url.searchParams.set('q', filters.q);
    }
    if (filters.status && filters.status !== 'all') {
        url.searchParams.set('status', filters.status);
    }
    return `${url.pathname}${url.search}`;
}

async function fetchRecentLicenses(filters = {}) {
    const whereClauses = [];
    const params = [];

    if (filters.q) {
        const like = `%${filters.q}%`;
        whereClauses.push('(id LIKE ? OR user_id LIKE ?)');
        params.push(like, like);
    }

    switch (filters.status) {
    case 'unused':
        whereClauses.push('is_used = FALSE');
        break;
    case 'used':
        whereClauses.push('is_used = TRUE');
        break;
    case 'active':
        whereClauses.push('is_used = TRUE AND expiry_date IS NOT NULL AND expiry_date > NOW()');
        break;
    case 'expired':
        whereClauses.push('is_used = TRUE AND expiry_date IS NOT NULL AND expiry_date <= NOW()');
        break;
    default:
        break;
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const [rows] = await pool.execute(
        `SELECT id, duration_days, is_used, user_id, start_date, expiry_date, created_at
         FROM licenses
         ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT 300`,
        params
    );

    return rows;
}

function createLicenseWorkbook(licenseRows) {
    const rows = [
        ['키', '기간', '상태', '사용자', '시작', '만료', '생성'],
        ...licenseRows.map(row => [
            row.id,
            Number(row.duration_days) >= 99999 ? '영구' : `${row.duration_days}일`,
            getLicenseStatusLabel(row),
            row.user_id || '',
            formatDateTime(row.start_date),
            formatDateTime(row.expiry_date),
            formatDateTime(row.created_at)
        ])
    ];

    const xmlRows = rows.map(columns => `
      <Row>
        ${columns.map(value => `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join('')}
      </Row>
    `).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="Licenses">
    <Table>
      ${xmlRows}
    </Table>
  </Worksheet>
</Workbook>`;

    return Buffer.from(xml, 'utf8');
}

async function createLicenses(durationValue, countValue) {
    const count = Number.parseInt(String(countValue || '').trim(), 10);
    if (Number.isNaN(count) || count <= 0) {
        throw new Error('LICENSE_COUNT_INVALID');
    }

    const durationRaw = String(durationValue || '').trim();
    let durationDays;

    if (durationRaw === '영구') {
        durationDays = 99999;
    } else {
        durationDays = Number.parseInt(durationRaw, 10);
        if (Number.isNaN(durationDays) || durationDays <= 0) {
            throw new Error('LICENSE_DURATION_INVALID');
        }
    }

    for (let index = 0; index < count; index += 1) {
        const id = uuidv4().split('-')[0].toUpperCase();
        await pool.execute('INSERT INTO licenses (id, duration_days) VALUES (?, ?)', [id, durationDays]);
    }

    return { count, durationDays };
}

async function deleteLicenseById(licenseId) {
    const normalizedId = String(licenseId || '').trim();
    if (!normalizedId) {
        throw new Error('LICENSE_ID_REQUIRED');
    }

    const [result] = await pool.execute('DELETE FROM licenses WHERE id = ?', [normalizedId]);
    if (!result?.affectedRows) {
        throw new Error('LICENSE_NOT_FOUND');
    }
}

module.exports = {
    buildLicenseExportUrl,
    buildLicensePageUrl,
    buildLicenseStats,
    createLicenseWorkbook,
    createLicenses,
    deleteLicenseById,
    fetchRecentLicenses,
    formatDateTime,
    getLicenseFilters,
    getLicenseStatusLabel
};
