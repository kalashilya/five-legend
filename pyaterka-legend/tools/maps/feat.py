# ящики (серые) и плиты точек (красные) с радара → координаты 0–100
import sys, json
from PIL import Image
m = sys.argv[1]
im = Image.open(f'/home/claude/boltgolt/boltobserv/src/maps/{m}/radar.png').convert('RGBA').resize((1000, 1000)); px = im.load(); W = 1000
def kind(p):
    r, g, b, a = p
    if a < 200: return 0
    if r > 120 and g < 90 and b < 110 and r - g > 40: return 2          # красная плита
    if 125 < r < 200 and abs(r - g) < 18 and abs(g - b) < 22: return 1  # серый ящик
    return 0
K = [[kind(px[x, y]) for x in range(W)] for y in range(W)]
seen = [[False] * W for _ in range(W)]; out = {1: [], 2: []}
for y in range(W):
    for x in range(W):
        k = K[y][x]
        if not k or seen[y][x]: continue
        st = [(x, y)]; seen[y][x] = True; xs = []; ys = []
        while st:
            a, b = st.pop(); xs.append(a); ys.append(b)
            for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                if 0 <= c < W and 0 <= d < W and not seen[d][c] and K[d][c] == k: seen[d][c] = True; st.append((c, d))
        if len(xs) < 25: continue
        out[k].append([min(xs) / 10, min(ys) / 10, (max(xs) + 1) / 10, (max(ys) + 1) / 10, len(xs)])
props = [[round((b[0] + b[2]) / 2, 1), round((b[1] + b[3]) / 2, 1), round(b[2] - b[0], 1), round(b[3] - b[1], 1)] for b in out[1] if .5 < b[2] - b[0] < 6 and .5 < b[3] - b[1] < 6]
sites = sorted([b for b in out[2] if b[4] > 300], key=lambda b: -b[4])[:2]
print(json.dumps({'props': props, 'sites': [[round(v, 1) for v in s[:4]] for s in sites]}))
