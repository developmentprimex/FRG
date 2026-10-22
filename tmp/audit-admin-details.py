import urllib.request, urllib.parse, urllib.error, http.cookiejar, time, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
def run(email, password):
    results = []
    for base in ['https://fragmento.de', 'http://localhost:3001']:
        client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        data = urllib.parse.urlencode({'email': email, 'password': password}).encode()
        with client.open(base + '/api/admin/login', data, timeout=60) as r:
            r.read()
            if urllib.parse.urlsplit(r.url).path != '/admin':
                print('Login incomplete', flush=True)
                continue
        paths = ['/admin/claims-overview', '/admin/px-claims/feedback', '/admin/work-reminders']
        for section in ['orders', 'px-orders', 'claims', 'order-cancellations', 'contracts', 'kitchens', 'property-owners']:
            with client.open(base + '/admin/' + section, timeout=60) as r:
                html = r.read().decode()
            matches = re.findall(r'href="(/admin/' + section + r'/[^"?<>]+)"', html)
            matches = [p for p in matches if not p.endswith('/feedback')]
            if matches:
                paths.append(matches[0])
            else:
                print(json.dumps({'base': base, 'section': section, 'detail': 'No detail link found'}), flush=True)
        for pass_n in range(1, 3):
            for path in paths:
                start = time.perf_counter()
                row = {'base': base, 'path': path, 'round': pass_n}
                try:
                    with client.open(base + path, timeout=60) as r:
                        row.update(status=r.status, ttfb_s=round(time.perf_counter()-start, 3))
                        body = r.read()
                        row.update(bytes=len(body), total_s=round(time.perf_counter()-start, 3), final_path=urllib.parse.urlsplit(r.url).path)
                except urllib.error.HTTPError as e:
                    row.update(status=e.code, total_s=round(time.perf_counter()-start, 3))
                results.append(row)
                print(json.dumps(row), flush=True)
                (ROOT / 'tmp/admin-performance-details.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
