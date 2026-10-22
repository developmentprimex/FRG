import urllib.request, urllib.parse, urllib.error, http.cookiejar, time, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]

def run(email, password, bases=None):
    results = []
    paths = ['/admin'] + sorted('/admin/' + str(p.parent.relative_to(ROOT / 'frontend/app/admin')).replace('\\', '/') for p in (ROOT / 'frontend/app/admin').rglob('page.js') if p.parent != ROOT / 'frontend/app/admin' and '[' not in str(p) and 'login' not in str(p))
    for base in (bases or ['https://fragmento.de', 'http://localhost:3001']):
        jar = http.cookiejar.CookieJar()
        client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        data = urllib.parse.urlencode({'email': email, 'password': password}).encode()
        try:
            with client.open(base + '/api/admin/login', data, timeout=60) as response:
                response.read()
                login_path = urllib.parse.urlsplit(response.url).path
            print(json.dumps({'base': base, 'login_result': login_path}), flush=True)
            if login_path != '/admin':
                continue
        except Exception as error:
            print(json.dumps({'base': base, 'login_error': str(error)}), flush=True)
            continue
        for round_num in range(1, 4):
            for path in paths:
                start = time.perf_counter()
                try:
                    with client.open(base + path, timeout=60) as response:
                        ttfb = time.perf_counter() - start
                        body = response.read()
                        row = {'base': base, 'path': path, 'round': round_num, 'status': response.status, 'final_path': urllib.parse.urlsplit(response.url).path, 'ttfb_s': round(ttfb, 3), 'total_s': round(time.perf_counter() - start, 3), 'bytes': len(body), 'error_marker': 'NEXT_REDIRECT' in body.decode('utf-8', errors='replace') or 'NEXT_HTTP_ERROR_FALLBACK;500' in body.decode('utf-8', errors='replace')}
                except Exception as error:
                    row = {'base': base, 'path': path, 'round': round_num, 'error': type(error).__name__, 'total_s': round(time.perf_counter() - start, 3)}
                results.append(row)
                print(json.dumps(row), flush=True)
                target = 'admin-performance-live.json' if base.startswith('https:') else 'admin-performance-local.json'
                (ROOT / 'tmp' / target).write_text(json.dumps(results, indent=2), encoding='utf-8')

