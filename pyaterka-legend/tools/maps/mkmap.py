# Сборка подробных карт (Inferno, Ancient, Anubis) по радарам CS2: зоны и ящики — с картинки, узлы и маршруты — вручную
import json, subprocess, sys
from PIL import Image, ImageDraw
sys.path.insert(0, '.')
from specs import SPECS

def rects_of(m):
    subprocess.run(['python3', 'rects.py', m, '1'], check=True, capture_output=True)
    return json.load(open(f'{m}_rects.json'))
def feats(m):
    return json.loads(subprocess.run(['python3', 'feat.py', m], check=True, capture_output=True, text=True).stdout)

def js(v):
    return json.dumps(v, ensure_ascii=False, separators=(', ', ': ')).replace('"__', '').replace('__"', '')

out = ['/* ---------- Подробные карты по радарам CS2 (Inferno, Ancient, Anubis) ----------',
       '   Зоны rects и ящики props сняты с радара CS2 автоматически (сетка 1 ед. = 1% радара), узлы, проходы, маршруты',
       '   и расстановки — вручную по колаутам карты. Файл собирается скриптом из папки разработки; правки — там же. */']
for name, S in SPECS.items():
    m = S['file']; R = rects_of(m); F = feats(m)
    props = []
    for p in F['props']:   # крупные плиты (фонтан, перила моста) не ставим: игроки ходят без учёта ящиков; концентрические дубли — один раз
        if max(p[2], p[3]) > 3.2 or any(abs(p[0] - q[0]) < .4 and abs(p[1] - q[1]) < .4 for q in S.get('dropProps', []) + props): continue
        props.append(p + [S.get('ph', 1.4)])
    obj = {k: S[k] for k in ['n', 'r', 'tz', 'ctz', 'e', 'tr', 'ct', 'lb'] if k in S}
    obj['rects'] = R; obj['vrects'] = S.get('vrects', []); obj['props'] = props; obj['union'] = 1
    if 'plan' in S: obj['plan'] = S['plan']
    out.append(f'RADAR[{json.dumps(name)}] = ' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';')
    # контрольная картинка: радар + узлы и проходы
    im = Image.open(f'/home/claude/boltgolt/boltobserv/src/maps/{m}/radar.png').convert('RGBA').resize((1000, 1000)); bg = Image.new('RGBA', (1000, 1000), (18, 18, 18, 255)); bg.alpha_composite(im); im = bg.convert('RGB'); d = ImageDraw.Draw(im)
    P = lambda k: (S['n'][k][0] * 10, S['n'][k][1] * 10)
    for e in S['e']: d.line([P(e[0]), P(e[1])], fill=(255, 200, 0) if len(e) < 4 else (0, 200, 255), width=3)
    for k, v in S['n'].items(): x, y = P(k); d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(255, 80, 80) if k in ('A', 'B') else (80, 255, 120)); d.text((x + 8, y - 6), k, fill=(255, 255, 255))
    if 'plan' in S:
        for z, L in S['plan']['ct'].items():
            for i, p in enumerate(L): x, y = p['p'][0] * 10, p['p'][1] * 10; d.rectangle([x - 4, y - 4, x + 4, y + 4], outline=(80, 160, 255), width=2); d.line([(x, y), (p['look'][0] * 10, p['look'][1] * 10)], fill=(80, 160, 255), width=1)
    im.save(f'{m}_graph.png')
open('../../radar-maps.js', 'w').write('\n'.join(out) + '\n')
print('ok', {n: len(rects_of(S['file'])) for n, S in SPECS.items()})
