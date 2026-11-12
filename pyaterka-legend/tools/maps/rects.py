# Проходимое по радару CS2 (альфа > 0) → прямоугольники в координатах 0–100 (сетка STEP)
import sys, json
from PIL import Image
m, STEP = sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
im = Image.open(f'/home/claude/boltgolt/boltobserv/src/maps/{m}/radar.png').convert('RGBA'); W, H = im.size
N = int(round(100 / STEP)); px = im.load()
def cell(i, j):  # доля проходимых пикселей в клетке
    x0, y0 = int(i * STEP / 100 * W), int(j * STEP / 100 * H); x1, y1 = int((i + 1) * STEP / 100 * W), int((j + 1) * STEP / 100 * H)
    c = t = 0
    for y in range(y0, y1, 2):
        for x in range(x0, x1, 2):
            t += 1; c += px[x, y][3] > 60
    return c / max(1, t)
G = [[cell(i, j) >= .5 for i in range(N)] for j in range(N)]
# жадное разбиение: самая длинная полоса по x, затем вниз, пока вся строка свободна
used = [[False] * N for _ in range(N)]; R = []
for j in range(N):
    for i in range(N):
        if not G[j][i] or used[j][i]: continue
        i1 = i
        while i1 + 1 < N and G[j][i1 + 1] and not used[j][i1 + 1]: i1 += 1
        j1 = j
        while j1 + 1 < N and all(G[j1 + 1][k] and not used[j1 + 1][k] for k in range(i, i1 + 1)): j1 += 1
        for y in range(j, j1 + 1):
            for x in range(i, i1 + 1): used[y][x] = True
        R.append([round(i * STEP, 1), round(j * STEP, 1), round((i1 + 1) * STEP, 1), round((j1 + 1) * STEP, 1)])
print(len(R), file=sys.stderr)
json.dump(R, open(f'{m}_rects.json', 'w'))
# контрольная картинка
from PIL import ImageDraw
o = Image.new('RGB', (1000, 1000), (15, 15, 15)); d = ImageDraw.Draw(o)
for r in R: d.rectangle([r[0] * 10, r[1] * 10, r[2] * 10 - 1, r[3] * 10 - 1], fill=(60, 80, 110), outline=(120, 150, 200))
for i in range(0, 101, 10): d.line([(i * 10, 0), (i * 10, 1000)], fill=(80, 30, 30)); d.line([(0, i * 10), (1000, i * 10)], fill=(80, 30, 30)); d.text((i * 10 + 2, 2), str(i), fill=(255, 255, 0)); d.text((2, i * 10 + 2), str(i), fill=(255, 255, 0))
o.save(f'{m}_rects.png')
