# Из снимков tools/shots/case_*_b.png и _w.png делает vendor/case-*.webp с прозрачным фоном
import sys, numpy as np
from PIL import Image
import os
here = os.path.dirname(os.path.abspath(__file__)); src, dst = os.path.join(here, 'shots'), os.path.join(here, '..', 'vendor')
for k in ['elite', 'pro', 'basic']:
    B = np.asarray(Image.open(f'{src}/case_{k}_b.png').convert('RGB')).astype(np.float32) / 255
    W = np.asarray(Image.open(f'{src}/case_{k}_w.png').convert('RGB')).astype(np.float32) / 255
    a = np.clip(1 - (W - B).mean(axis=2), 0, 1)
    a[a < .02] = 0
    col = np.clip(B / np.maximum(a[..., None], 1e-3), 0, 1)
    ys, xs = np.where(a > .02); pad = 16
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad), max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad)
    rgba = np.dstack([col, a])[y0:y1, x0:x1]
    im = Image.fromarray((rgba * 255 + .5).astype(np.uint8), 'RGBA')
    w = 560; im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(f'{dst}/case-{k}.webp', 'WEBP', quality=86, method=6); print(k, im.size)
