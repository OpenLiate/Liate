// scripts/update-stats.mjs
import https from 'node:https';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'OpenLiate-Stats-Bot' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function updateGist(gistId, token, content) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      files: {
        'downloads.json': {
          content: JSON.stringify(content)
        }
      }
    });

    const req = https.request(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'OpenLiate-Stats-Bot',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('[*] Fetching live metrics from npm & PyPI...');

  const today = new Date().toISOString().split('T')[0];

  // 1. npm metrics
  let npmOpenliate = 0;
  let npmScoped = 0;

  try {
    const npm1 = await fetchJson(`https://api.npmjs.org/downloads/point/2026-11-01:${today}/openliate`);
    npmOpenliate = npm1.downloads || 0;
  } catch (err) {
    console.warn('Failed to fetch npm openliate:', err.message);
  }

  try {
    const npm2 = await fetchJson(`https://api.npmjs.org/downloads/point/2026-11-01:${today}/@openliate/liate`);
    npmScoped = npm2.downloads || 0;
  } catch (err) {
    console.warn('Failed to fetch npm @openliate/liate:', err.message);
  }

  // 2. PyPI metrics
  let pypiOpenliate = 0;
  let pypiLiate = 0;

  try {
    const p1 = await fetchJson('https://pypistats.org/api/packages/openliate/overall');
    pypiOpenliate = (p1.data || [])
      .filter(d => d.category === 'without_mirrors')
      .reduce((sum, d) => sum + d.downloads, 0);
  } catch (err) {
    console.warn('Failed to fetch pypi openliate:', err.message);
  }

  try {
    const p2 = await fetchJson('https://pypistats.org/api/packages/liate/overall');
    pypiLiate = (p2.data || [])
      .filter(d => d.category === 'without_mirrors')
      .reduce((sum, d) => sum + d.downloads, 0);
  } catch (err) {
    console.warn('Failed to fetch pypi liate:', err.message);
  }

  const grandTotal = npmOpenliate + npmScoped + pypiOpenliate + pypiLiate;
  const formattedTotal = grandTotal.toLocaleString('en-US') + '+';

  console.log('\n--- Live Telemetry ---');
  console.log(`npm openliate:         ${npmOpenliate}`);
  console.log(`npm @openliate/liate:  ${npmScoped}`);
  console.log(`PyPI openliate:        ${pypiOpenliate} (without_mirrors)`);
  console.log(`PyPI liate:            ${pypiLiate} (without_mirrors)`);
  console.log(`GRAND TOTAL:           ${formattedTotal}`);

  const gistId = process.env.GIST_ID || '4e50442b9bc06000069dd0c1552ab66b';
  const token = process.env.GIST_TOKEN;

  if (token) {
    console.log(`\n[*] Updating Gist ${gistId}...`);
    const badgePayload = {
      schemaVersion: 1,
      label: 'Total Downloads',
      message: formattedTotal,
      color: 'brightgreen'
    };
    const res = await updateGist(gistId, token, badgePayload);
    console.log(`[+] Gist updated successfully! (Status: ${res.status})`);
  } else {
    console.log('\n[!] GIST_TOKEN not set; skipping Gist update.');
  }
}

main().catch(err => {
  console.error('[!] Error updating stats:', err);
  process.exit(1);
});
