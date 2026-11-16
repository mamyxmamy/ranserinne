#!/usr/bin/env python3
"""背景v3（区間切替）用 追加レイヤー後処理: 帯切り出し(486px統一) → ラップブレンド無縫化 → WebP化
方式は BG2-PREP.md §2 / make_layers.py と同一関数を再利用。v0.3-wip の区間別パターン用。
アンカー方針: 夜=遠岸ラインを帯内 約8.6%（s1206橋のみ開放感優先で約21%）、
昼=地平線を帯内 約56%（s3203湾岸は y0=0 クランプで約52%）、夕=v2主帯と同一クロップ。"""
import numpy as np
from PIL import Image
import os

RAW = os.path.expanduser("~/workspace/games/probox-shutoko/bg-v2-raw/probox_bg_v2")
OUT = os.path.expanduser("~/workspace/games/probox-shutoko/bg-layers-v2")
CHK = os.path.expanduser("~/workspace/games/probox-shutoko/inspection-bg2")
os.makedirs(OUT, exist_ok=True); os.makedirs(CHK, exist_ok=True)

BH = 486

def load(p): return Image.open(os.path.join(RAW, p)).convert("RGB")

def crop(img, x0, y0, x1, y1):
    c = img.crop((x0, y0, x1, y1)); assert c.size[1] == BH, c.size; return c

def wrap_seamless(img, frac=0.11):
    """50%オフセット＋中央クロスフェードで左右端を完全一致させる（prep §2-3 主方式）"""
    W, H = img.size
    arr = np.asarray(img, dtype=np.float32)
    off = np.roll(arr, W//2, axis=1)
    bw = int(W * frac)
    x0 = W//2 - bw//2; x1 = x0 + bw
    t = np.linspace(0, 1, bw, dtype=np.float32)[None, :, None]
    out = off.copy()
    out[:, x0:x1] = off[:, x0:x1] * (1-t) + arr[:, x0:x1] * t
    return Image.fromarray(out.astype(np.uint8))

def save_webp(img, name, q=90):
    p = os.path.join(OUT, name)
    img.save(p, "WEBP", quality=q, method=6)
    print(f"{name}: {img.size[0]}x{img.size[1]} q={q} {os.path.getsize(p)/1024:.0f} KB")
    return p

def seam_check(img, name):
    W, H = img.size
    seg = 500
    chk = Image.new("RGB", (seg*2, H))
    chk.paste(img.crop((W-seg, 0, W, H)), (0, 0))
    chk.paste(img.crop((0, 0, seg, H)), (seg, 0))
    chk.save(os.path.join(CHK, name))

def strip(src, box, name):
    img = wrap_seamless(crop(load(src), *box))
    seam_check(img, "seam-" + name.replace("bg2-", "").replace(".webp", "") + ".png")
    save_webp(img, name)

# ---- 夜：区間別シングルストリップ ----
strip("night/night_s1201.png", (0, 88, 1536, 88+BH),  "bg2-night-c1.webp")      # C1/市街：v2主帯と同一クロップ（遠岸8.6%）
strip("night/night_s1204.png", (0, 203, 1536, 203+BH), "bg2-night-jct.webp")     # 浜崎橋JCT：遠岸ライン(≒y245)を8.6%に
strip("night/night_s1202.png", (0, 282, 1536, 282+BH), "bg2-night-wangan.webp")  # 湾岸線：遠岸(≒y330)を約10%に（下端768クランプ）
strip("night/night_s1206.png", (0, 282, 1536, 282+BH), "bg2-night-bridge.webp")  # 橋：星空を広く残し市街帯は約21%（開放感優先）

# ---- 夕：主／湾岸（v2ダブルストリップの素材を単独化） ----
strip("sunset/sunset_s2203.png", (0, 60, 1536, 60+BH), "bg2-sunset-main.webp")   # 主：v2主帯と同一クロップ
strip("sunset/sunset_s2201.png", (0, 25, 1536, 25+BH), "bg2-sunset-wangan.webp") # 湾岸：v2副帯と同一クロップ

# ---- 昼：湾岸／橋（主は既存 bg2-day.webp = day_s3202 を流用） ----
strip("day/day_s3203.png", (0, 0, 1536, BH),           "bg2-day-wangan.webp")    # 湾岸：広い湾＋スカイツリー。地平線(≒y255)は約52%
strip("day/day_s3204.png", (0, 203, 1536, 203+BH),     "bg2-day-bridge.webp")    # 橋：対岸スカイライン(≒y475)を56%に
print("done")
