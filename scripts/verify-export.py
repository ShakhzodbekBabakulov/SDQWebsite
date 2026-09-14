"""Check the built sitemap, initial HTML, crawler rules, links and local assets.

Uses only Python's standard library. Run after npm run build:
    python scripts/verify-export.py [out]
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote, urljoin
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.canonical = []
        self.alternates = {}
        self.assets = set()
        self.links = set()
        self.lang = ''
        self.title = ''
        self.in_title = False
        self.in_json = False
        self.json_text = ''
        self.schema = []
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self.in_title = True
        if tag == 'meta': self.meta[a.get('name', a.get('property'))] = a.get('content')
        if tag == 'a' and a.get('href'): self.links.add(a['href'])
        if tag == 'link':
            if a.get('rel') == 'canonical': self.canonical.append(a.get('href'))
            if a.get('hreflang'): self.alternates[a['hreflang']] = a['href']
            if a.get('rel') in ['stylesheet', 'icon', 'preload']: self.assets.add(a['href'])
        if tag in ['img', 'script', 'source', 'video']:
            if a.get('src'): self.assets.add(a['src'])
            if a.get('poster'): self.assets.add(a['poster'])
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.in_json = True
            self.json_text = ''

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script' and self.in_json:
            self.schema.append(json.loads(self.json_text))
            self.in_json = False

    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.in_json: self.json_text += data


root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out').resolve()
domain = 'https://sdq-sfb.com'
sitemap = ET.parse(root / 'sitemap.xml')
urls = [el.text for el in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert len(urls) == len(set(urls)) == 35
assert all(url.startswith(domain + '/') for url in urls)
assert domain + '/more/ru/' not in urls
assert (root / 'sitemap.xml').read_bytes() == Path('docs/seo/sitemap.xml').read_bytes()
documents = {}
assets = set()
for url in urls:
    path = urlsplit(url).path
    html = (root / path.lstrip('/') / 'index.html').read_text('utf-8')
    doc = Document()
    doc.feed(html)
    documents[url] = doc
    assert doc.canonical == [url], (url, doc.canonical)
    assert doc.meta['og:url'].rstrip('/') == url.rstrip('/'), url
    assert doc.meta['og:image'].startswith(domain + '/'), url
    assert doc.title and doc.meta['description'], url
    assert not doc.meta.get('keywords'), url
    assert not re.search('noindex|nofollow', doc.meta.get('robots', '')), url
    assert doc.h1 == 1, (url, doc.h1)
    assert doc.lang == ('uz-Latn' if path == '/' else 'en' if path.startswith('/more/en/') else 'ru')
    graph = doc.schema[0]['@graph']
    assert any(node.get('@id') == domain + '/#organization' for node in graph), url
    if path != '/':
        assert any(node.get('@type') == 'BreadcrumbList' for node in graph), url
        assert not re.search(r'<form\b|jquery|sppb-addon|joomla|sp-page-builder', html, re.I), url
    for href in doc.links:
        if href.startswith('/'):
            assert domain + urlsplit(href).path in urls, (url, href)
    assets.update(doc.assets)
assert len({doc.title for doc in documents.values()}) == 35
assert len({doc.meta['description'] for doc in documents.values()}) == 35
for url, doc in documents.items():
    for lang, target in doc.alternates.items():
        assert target in documents, (url, target)
        assert documents[target].lang == lang, (url, target, lang)
        assert documents[target].alternates.get(doc.lang) == url, (url, target)

checked = set()
while assets:
    asset = assets.pop()
    if asset in checked: continue
    checked.add(asset)
    if asset.startswith('data:'): continue
    assert asset.startswith('/'), ('Unexpected external asset', asset)
    file = root / unquote(urlsplit(asset).path).lstrip('/')
    assert file.is_file(), file
    if file.suffix == '.css':
        for match in re.findall(r'url\([\'"]?([^\)\'\"]+)', file.read_text('utf-8')):
            if not match.startswith('data:'): assets.add(urlsplit(urljoin(domain + asset, match)).path)

robots_text = (root / 'robots.txt').read_text('utf-8')
robots = RobotFileParser()
robots.parse(robots_text.splitlines())
assert 'Sitemap: ' + domain + '/sitemap.xml' in robots_text
for bot in ['Googlebot', 'Bingbot', 'OAI-SearchBot']:
    for url in urls: assert robots.can_fetch(bot, url), (bot, url)
    for asset in checked: assert robots.can_fetch(bot, domain + asset), (bot, asset)
print(f'PASS: {len(urls)} canonical initial HTML documents; reciprocal translations; unique metadata; JSON-LD; {len(checked)} rendering assets; search crawler rules; identical sitemap copy.')
print('Google verification tag:', 'present' if documents[domain + '/'].meta.get('google-site-verification') else 'not supplied; DNS Domain verification is an alternative')
