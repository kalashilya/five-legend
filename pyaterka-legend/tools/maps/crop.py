import sys
from PIL import Image, ImageDraw
m, x0, y0, x1, y1 = sys.argv[1], *map(float, sys.argv[2:6]); S = 16
im = Image.open(f'/home/claude/boltgolt/boltobserv/src/maps/{m}/radar.png').convert('RGBA'); W = im.size[0]
bg = Image.new('RGBA', im.size, (20, 20, 20, 255)); bg.alpha_composite(im)
c = bg.crop((int(x0 * W / 100), int(y0 * W / 100), int(x1 * W / 100), int(y1 * W / 100))).resize((int((x1 - x0) * S), int((y1 - y0) * S))).convert('RGB')
d = ImageDraw.Draw(c)
for v in range(int(x0), int(x1) + 1):
    X = (v - x0) * S; d.line([(X, 0), (X, c.size[1])], fill=(255, 60, 60) if v % 10 == 0 else (70, 70, 70)); 
    if v % 2 == 0: d.text((X + 1, 1), str(v), fill=(255, 255, 0))
for v in range(int(y0), int(y1) + 1):
    Y = (v - y0) * S; d.line([(0, Y), (c.size[0], Y)], fill=(255, 60, 60) if v % 10 == 0 else (70, 70, 70));
    if v % 2 == 0: d.text((1, Y + 1), str(v), fill=(255, 255, 0))
c.save(sys.argv[6])
