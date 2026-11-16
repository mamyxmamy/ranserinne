#!/usr/bin/env python3
"""背景v2 後処理: 帯切り出し → 連結(ダブルストリップ) → ラップブレンド無縫化 → WebP化
方式は BG2-PREP.md §2 に準拠。実行ログは数値を標準出力に出す。"""
import numpy as np
from PIL import Image
import os

RAW = os.path.expanduser("~/workspace/games/probox-shutoko/bg-v2-raw/probox_bg_v2")
OUT = os.path.expanduser("~/workspace/games/probox-shutoko/bg-layers-v2")
CHK = os.path.expanduser("~/workspace/games/probox-shutoko/inspection-bg2")
os.makedirs(OUT, exist_ok=True); os.makedirs(CHK, exist_ok=True)

BH = 486  # 帯の高さ(px) 全シーン共通

def load(p): return Image.open(os.path.join(RAW, p)).convert("RGB")

def crop(img, x0, y0, x1, y1):
    c = img.crop((x0, y0, x1, y1)); assert c.size[1] == BH, c.size; return c

def join_overlap(a, b, ov):
    """a の右端と b の左端を ov px のリニアクロスフェードで連結"""
    wa, ha = a.size; wb, hb = b.size; assert ha == hb == BH
    W = wa + wb - ov
    out = Image.new("RGB", (W, BH))
    out.paste(a, (0, 0))
    # b の左 ov px 分は a の右端とブレンド
    an = np.asarray(a, dtype=np.float32); bn = np.asarray(b, dtype=np.float32)
    t = np.linspace(0, 1, ov, dtype=np.float32)[None, :, None]
    blend = an[:, wa-ov:wa] * (1-t) + bn[:, 0:ov] * t
    out.paste(Image.fromarray(blend.astype(np.uint8)), (wa-ov, 0))
    out.paste(b.crop((ov, 0, wb, BH)), (wa, 0))
    return out

def wrap_seamless(img, frac=0.13):
    """50%オフセット＋中央クロスフェードで左右端を完全一致させる（prep §2-3 主方式）"""
    W, H = img.size
    arr = np.asarray(img, dtype=np.float32)
    off = np.roll(arr, W//2, axis=1)          # オフセット版（端＝元中央で連続）
    bw = int(W * frac)
    x0 = W//2 - bw//2; x1 = x0 + bw
    t = np.linspace(0, 1, bw, dtype=np.float32)[None, :, None]
    out = off.copy()
    out[:, x0:x1] = off[:, x0:x1] * (1-t) + arr[:, x0:x1] * t
    return Image.fromarray(out.astype(np.uint8))

def save_webp(img, name, q):
    p = os.path.join(OUT, name)
    img.save(p, "WEBP", quality=q, method=6)
    print(f"{name}: {img.size[0]}x{img.size[1]} q={q} {os.path.getsize(p)/1024:.0f} KB")
    return p

def seam_check(img, name):
    """タイルを横に並べ、右端→左端の接続部（＝本物の継ぎ目）を中央に置いた確認画像"""
    W, H = img.size
    seg = 500  # 継ぎ目の前後500pxずつ
    chk = Image.new("RGB", (seg*2, H))
    chk.paste(img.crop((W-seg, 0, W, H)), (0, 0))       # タイル右端
    chk.paste(img.crop((0, 0, seg, H)), (seg, 0))       # タイル左端（接続）
    chk.save(os.path.join(CHK, name))

# ---------------- 夜: ダブルストリップ (s1201 + s1205) ----------------
n1 = crop(load("night/night_s1201.png"), 0, 88, 1536, 88+BH)     # 遠岸=帯内8.6%
n2 = crop(load("night/night_s1205.png"), 0, 203, 1300, 203+BH)   # 地平線=帯内8.6% / 右端タワー(x~1470)を除外 / 星streak域y<203を回避
night = join_overlap(n1, n2, 200)
print("night joined:", night.size)
night = wrap_seamless(night, 0.11)
seam_check(night, "seam-night.png")
save_webp(night, "bg2-night.webp", 90)

# ---------------- 夕: ダブルストリップ (s2203 + s2201) ----------------
s3 = crop(load("sunset/sunset_s2203.png"), 0, 60, 1536, 60+BH)   # 水際=帯内68%
s1 = crop(load("sunset/sunset_s2201.png"), 0, 25, 1536, 25+BH)   # 地平線=帯内68%
sunset = join_overlap(s3, s1, 230)
print("sunset joined:", sunset.size)
sunset = wrap_seamless(sunset, 0.11)
seam_check(sunset, "seam-sunset.png")
save_webp(sunset, "bg2-sunset.webp", 90)

# ---------------- 昼: シングル (s3202) ----------------
d2 = crop(load("day/day_s3202.png"), 0, 30, 1536, 30+BH)         # 地平線=帯内56%
day = wrap_seamless(d2, 0.11)
seam_check(day, "seam-day.png")
save_webp(day, "bg2-day.webp", 90)

# ---------------- 中景ファサードタイル (prep §3-2 案A) ----------------
def tile(img, box, name, q=85):
    t = img.crop(box); p = os.path.join(OUT, name)
    t.save(p, "WEBP", quality=q, method=6)
    print(f"{name}: {t.size[0]}x{t.size[1]} {os.path.getsize(p)/1024:.1f} KB")

nimg = load("night/night_s1201.png"); dimg = load("day/day_s3202.png")
tile(nimg, (500, 300, 645, 505),  "bg2-facade-night-a.webp")
tile(nimg, (650, 320, 795, 505),  "bg2-facade-night-b.webp")
tile(nimg, (950, 300, 1095, 505), "bg2-facade-night-c.webp")
tile(nimg, (1150, 310, 1295, 505),"bg2-facade-night-d.webp")
tile(dimg, (300, 300, 445, 472),  "bg2-facade-day-a.webp")
tile(dimg, (560, 300, 705, 472),  "bg2-facade-day-b.webp")
tile(dimg, (820, 295, 965, 465),  "bg2-facade-day-c.webp")
print("done")
