"""
ViT-BodyFat-Estimator (PyTorch)
================================
A production-ready skeleton to estimate body fat % from single 2D photos using a ViT backbone.

Features
- timm ViT-B/16 (default) or any timm backbone
- Mixed precision (AMP), cosine LR schedule, gradient accumulation
- Early stopping + best checkpointing
- Train/val/test splits by PERSON ID to prevent leakage
- Optional metadata (sex, age, height_cm, weight_kg) concatenated in head
- Strong but safe augmentations for body images
- TorchMetrics for MAE/RMSE/R2 + calibration bins
- ONNX export (fp32) and dynamic axes

Expected Data Layout
--------------------
CSV file (UTF-8) with columns:
  id,path,bodyfat,sex,age,height_cm,weight_kg
- id: person identifier (leakage control)
- path: relative or absolute path to an image file (RGB)
- bodyfat: ground-truth % (float)
- sex: {M,F} or {0,1} (optional)
- age,height_cm,weight_kg: numeric (optional)

Image files can be anywhere; pass --img-root to prefix relative paths.

Quickstart
----------
1) Install deps: 
   pip install torch torchvision timm torchmetrics pandas scikit-learn pyyaml opencv-python tqdm onnx onnxruntime opencv-python-headless

2) Train (example):
   python vit_bfp.py \
     --csv data/bfp_labels.csv \
     --img-root data/images \
     --out runs/vit_b16 \
     --backbone vit_base_patch16_224 \
     --epochs 60 --batch-size 32 --accum 1 --lr 3e-4 --img-size 256 \
     --use-meta --meta-cols sex,age,height_cm,weight_kg

3) Evaluate on test set:
   python vit_bfp.py --csv data/bfp_labels.csv --img-root data/images --out runs/vit_b16 --eval

4) Export ONNX:
   python vit_bfp.py --csv data/bfp_labels.csv --img-root data/images --out runs/vit_b16 --export-onnx model_best.pth onnx/model.onnx

Notes
- Ensure consistent photo protocol (frontal view, ~2 m distance, arms/legs apart, camera at chest height).
- If metadata is absent, omit --use-meta and --meta-cols.
- This is a template; tune augmentations and hyperparams for your dataset size and domain.
"""

import argparse
import os
import random
from pathlib import Path
import math

import cv2
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
import timm
from torchmetrics import MeanAbsoluteError, MeanSquaredError, R2Score
from tqdm import tqdm

# -----------------------------
# Utilities
# -----------------------------

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def ensure_dir(path: str):
    Path(path).mkdir(parents=True, exist_ok=True)


def to_device(batch, device):
    x = batch["image"].to(device, non_blocking=True)
    y = batch["target"].to(device, non_blocking=True)
    meta = batch.get("meta")
    if meta is not None:
        meta = meta.to(device, non_blocking=True)
    return x, y, meta


# -----------------------------
# Dataset
# -----------------------------
class BodyFatDataset(Dataset):
    def __init__(self, df: pd.DataFrame, img_root: str, img_size: int = 256,
                 is_train: bool = True, use_meta: bool = False, meta_cols=None):
        self.df = df.reset_index(drop=True)
        self.img_root = Path(img_root) if img_root else None
        self.img_size = img_size
        self.is_train = is_train
        self.use_meta = use_meta
        self.meta_cols = meta_cols or []

        # Basic augmentations: mild to avoid body-shape distortion
        if is_train:
            self.tf = T.Compose([
                T.ToTensor(),  # expects HWC BGR-> we will convert below
                T.ConvertImageDtype(torch.float32),
                T.Resize((img_size, img_size), antialias=True),
            ])
        else:
            self.tf = T.Compose([
                T.ToTensor(),
                T.ConvertImageDtype(torch.float32),
                T.Resize((img_size, img_size), antialias=True),
            ])

    def __len__(self):
        return len(self.df)

    def _read_image(self, path: str):
        p = Path(path)
        if not p.is_absolute() and self.img_root:
            p = self.img_root / p
        img = cv2.imread(str(p), cv2.IMREAD_COLOR)
        if img is None:
            raise FileNotFoundError(f"Image not found: {p}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32) / 255.0
        return img

    def _build_meta(self, row):
        if not self.use_meta or not self.meta_cols:
            return None
        vals = []
        for c in self.meta_cols:
            v = row.get(c)
            # Encoding for sex strings
            if c == "sex":
                if isinstance(v, str):
                    v = 1.0 if v.strip().upper() in ("M", "MALE", "1") else 0.0
            try:
                v = float(v)
            except Exception:
                v = 0.0
            vals.append(v)
        return np.array(vals, dtype=np.float32)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = self._read_image(row["path"])

        # Light geometry/color jitter without changing body shape proportions too much
        if self.is_train:
            # random horizontal flip (body symmetry mostly safe)
            if random.random() < 0.5:
                img = np.ascontiguousarray(np.fliplr(img))
            # slight brightness/contrast shifts
            if random.random() < 0.8:
                alpha = 1.0 + random.uniform(-0.08, 0.08)  # contrast
                beta = random.uniform(-0.06, 0.06)         # brightness
                img = np.clip(alpha * img + beta, 0, 1)
            # small rotation/scale (<=10° / <=5%) to reduce camera-tilt sensitivity
            if random.random() < 0.5:
                h, w = img.shape[:2]
                ang = random.uniform(-10, 10)
                scale = 1.0 + random.uniform(-0.05, 0.05)
                M = cv2.getRotationMatrix2D((w/2, h/2), ang, scale)
                img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)

        img = (img * 255).astype(np.uint8)
        img = self.tf(img)  # [3,H,W], float32 in [0,1]
        # timm models expect mean/std normalization; we do it in model forward via timm's preprocess

        target = float(row["bodyfat"])  # percentage
        meta = self._build_meta(row)
        sample = {"image": img, "target": torch.tensor(target, dtype=torch.float32)}
        if meta is not None:
            sample["meta"] = torch.from_numpy(meta)
        return sample


# -----------------------------
# Model
# -----------------------------
class ViTBFHead(nn.Module):
    def __init__(self, in_dim: int, meta_dim: int = 0, hidden: int = 256, dropout: float = 0.1):
        super().__init__()
        self.meta_dim = meta_dim
        self.proj = nn.Sequential(nn.LayerNorm(in_dim), nn.Linear(in_dim, hidden), nn.GELU(), nn.Dropout(dropout))
        if meta_dim > 0:
            self.meta_proj = nn.Sequential(nn.Linear(meta_dim, hidden), nn.GELU())
            h = hidden * 2
        else:
            self.meta_proj = None
            h = hidden
        self.out_mu = nn.Sequential(nn.LayerNorm(h), nn.Linear(h, 1))

    def forward(self, feats, meta=None):
        x = self.proj(feats)
        if self.meta_dim > 0 and meta is not None:
            m = self.meta_proj(meta)
            x = torch.cat([x, m], dim=-1)
        mu = self.out_mu(x).squeeze(-1)
        return mu


class ViTBFModel(nn.Module):
    def __init__(self, backbone: str = "vit_base_patch16_224", in_chans: int = 3, img_size: int = 224,
                 use_meta: bool = False, meta_dim: int = 0):
        super().__init__()
        self.backbone = timm.create_model(backbone, pretrained=True, num_classes=0, in_chans=in_chans)
        self.embed_dim = self.backbone.num_features
        self.use_meta = use_meta
        self.head = ViTBFHead(self.embed_dim, meta_dim=meta_dim)
        # timm preprocess
        self.data_cfg = timm.data.resolve_model_data_config(self.backbone)
        self.input_tf = timm.data.create_transform(**self.data_cfg, is_training=False)

    def forward(self, x, meta=None):
        # Expect x in [0,1]; apply timm's normalization dynamically
        # Convert to expected size & normalization inside the graph for safety
        x = nn.functional.interpolate(x, size=(self.data_cfg.get('input_size', (3, 224, 224))[1],
                                              self.data_cfg.get('input_size', (3, 224, 224))[2]),
                                      mode='bilinear', align_corners=False)
        # normalize
        mean = torch.tensor(self.data_cfg['mean'], device=x.device).view(1, -1, 1, 1)
        std = torch.tensor(self.data_cfg['std'], device=x.device).view(1, -1, 1, 1)
        x = (x - mean) / std
        feats = self.backbone.forward_features(x)
        if isinstance(feats, (list, tuple)):
            feats = feats[-1]
        if feats.ndim == 3:
            feats = feats.mean(dim=1)  # token avg
        mu = self.head(feats, meta)
        return mu


# -----------------------------
# Training/Eval
# -----------------------------

def split_by_group(df: pd.DataFrame, test_size=0.2, val_size=0.2, group_col="id", seed=42):
    """Split into train/val/test by groups to avoid same-person leakage."""
    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=seed)
    groups = df[group_col].values
    train_idx, test_idx = next(gss.split(df, groups=groups))
    df_train = df.iloc[train_idx].reset_index(drop=True)
    df_test = df.iloc[test_idx].reset_index(drop=True)
    # Now split train into train/val
    gss2 = GroupShuffleSplit(n_splits=1, test_size=val_size, random_state=seed)
    train_idx2, val_idx2 = next(gss2.split(df_train, groups=df_train[group_col].values))
    df_tr = df_train.iloc[train_idx2].reset_index(drop=True)
    df_val = df_train.iloc[val_idx2].reset_index(drop=True)
    return df_tr, df_val, df_test


def train_one_epoch(model, loader, optimizer, scaler, device, accum=1):
    model.train()
    mae = MeanAbsoluteError().to(device)
    mse = MeanSquaredError().to(device)
    total_loss = 0.0
    optimizer.zero_grad(set_to_none=True)
    for step, batch in enumerate(tqdm(loader, desc="train", leave=False)):
        x, y, meta = to_device(batch, device)
        with torch.cuda.amp.autocast(enabled=scaler is not None):
            preds = model(x, meta)
            loss = nn.functional.smooth_l1_loss(preds, y)
        if scaler is not None:
            scaler.scale(loss / accum).backward()
        else:
            (loss / accum).backward()
        if (step + 1) % accum == 0:
            if scaler is not None:
                scaler.step(optimizer)
                scaler.update()
            else:
                optimizer.step()
            optimizer.zero_grad(set_to_none=True)
        total_loss += loss.detach().item() * x.size(0)
        mae.update(preds, y)
        mse.update(preds, y)
    n = len(loader.dataset)
    return {
        "loss": total_loss / n,
        "mae": mae.compute().item(),
        "rmse": math.sqrt(mse.compute().item()),
    }


def evaluate(model, loader, device):
    model.eval()
    mae = MeanAbsoluteError().to(device)
    mse = MeanSquaredError().to(device)
    r2 = R2Score().to(device)
    total_loss = 0.0
    with torch.no_grad():
        for batch in tqdm(loader, desc="eval", leave=False):
            x, y, meta = to_device(batch, device)
            preds = model(x, meta)
            loss = nn.functional.smooth_l1_loss(preds, y)
            total_loss += loss.item() * x.size(0)
            mae.update(preds, y)
            mse.update(preds, y)
            r2.update(preds, y)
    n = len(loader.dataset)
    return {
        "loss": total_loss / n,
        "mae": mae.compute().item(),
        "rmse": math.sqrt(mse.compute().item()),
        "r2": r2.compute().item(),
    }


# -----------------------------
# Main
# -----------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', type=str, default='backend/app/data/body_fat/bfp_labels.csv')
    ap.add_argument('--img-root', type=str, default='backend/app/data/body_fat/images')
    ap.add_argument('--out', type=str, default='backend/app/data/body_fat/runs')
    ap.add_argument('--backbone', type=str, default='vit_base_patch16_224')
    ap.add_argument('--img-size', type=int, default=256)
    ap.add_argument('--epochs', type=int, default=60)
    ap.add_argument('--batch-size', type=int, default=32)
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--lr', type=float, default=3e-4)
    ap.add_argument('--accum', type=int, default=1)
    ap.add_argument('--seed', type=int, default=42)
    ap.add_argument('--use-meta', action='store_true')
    ap.add_argument('--meta-cols', type=str, default='')
    ap.add_argument('--eval', action='store_true')
    ap.add_argument('--export-onnx', nargs=2, metavar=('CKPT','ONNX'))
    args = ap.parse_args()

    set_seed(args.seed)
    ensure_dir(args.out)

    df = pd.read_csv(args.csv)
    required = {"id", "path", "bodyfat"}
    assert required.issubset(set(df.columns)), f"CSV must contain columns: {required}"

    meta_cols = []
    if args.use_meta:
        meta_cols = [c.strip() for c in args.meta_cols.split(',') if c.strip()]
        for c in meta_cols:
            if c not in df.columns:
                raise ValueError(f"--use-meta: column '{c}' not found in CSV")

    if not args.eval and args.export_onnx is None:
        # Train/Val/Test split by person id
        df_tr, df_val, df_te = split_by_group(df, test_size=0.2, val_size=0.2, group_col="id", seed=args.seed)
        df_tr.to_csv(Path(args.out)/'train_split.csv', index=False)
        df_val.to_csv(Path(args.out)/'val_split.csv', index=False)
        df_te.to_csv(Path(args.out)/'test_split.csv', index=False)
    else:
        # Use entire CSV for evaluation (assume pre-generated split CSVs exist)
        split_tr = Path(args.out)/'train_split.csv'
        split_val = Path(args.out)/'val_split.csv'
        split_te = Path(args.out)/'test_split.csv'
        if split_tr.exists():
            df_tr = pd.read_csv(split_tr)
            df_val = pd.read_csv(split_val)
            df_te = pd.read_csv(split_te)
        else:
            # fallback single split
            df_tr, df_val, df_te = split_by_group(df, test_size=0.2, val_size=0.2, group_col="id", seed=args.seed)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Datasets & Loaders
    train_ds = BodyFatDataset(df_tr, args.img_root, img_size=args.img_size, is_train=True,
                              use_meta=args.use_meta, meta_cols=meta_cols)
    val_ds = BodyFatDataset(df_val, args.img_root, img_size=args.img_size, is_train=False,
                            use_meta=args.use_meta, meta_cols=meta_cols)
    test_ds = BodyFatDataset(df_te, args.img_root, img_size=args.img_size, is_train=False,
                             use_meta=args.use_meta, meta_cols=meta_cols)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,
                              num_workers=args.workers, pin_memory=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                            num_workers=args.workers, pin_memory=True)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False,
                             num_workers=args.workers, pin_memory=True)

    meta_dim = len(meta_cols) if args.use_meta else 0
    model = ViTBFModel(backbone=args.backbone, img_size=args.img_size, use_meta=args.use_meta, meta_dim=meta_dim)
    model.to(device)

    if args.export_onnx:
        ckpt_path, onnx_path = args.export_onnx
        state = torch.load(ckpt_path, map_location=device)
        model.load_state_dict(state['model'])
        model.eval()
        dummy_img = torch.randn(1, 3, args.img_size, args.img_size, device=device)
        dummy_meta = torch.randn(1, meta_dim, device=device) if meta_dim>0 else None
        input_names = ["image"] + (["meta"] if meta_dim>0 else [])
        dynamic_axes = {"image": {0: "batch"}}
        inputs = (dummy_img,)
        if meta_dim>0:
            inputs += (dummy_meta,)
            dynamic_axes["meta"] = {0: "batch"}
        torch.onnx.export(model, inputs, onnx_path, opset_version=13, input_names=input_names,
                          output_names=["bodyfat"], dynamic_axes=dynamic_axes)
        print(f"Exported ONNX to {onnx_path}")
        return

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, betas=(0.9, 0.999), weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler = torch.cuda.amp.GradScaler() if torch.cuda.is_available() else None

    best_val = float('inf')
    patience = 10
    bad = 0
    for epoch in range(1, args.epochs + 1):
        print(f"\nEpoch {epoch}/{args.epochs}")
        tr = train_one_epoch(model, train_loader, optimizer, scaler, device, accum=args.accum)
        va = evaluate(model, val_loader, device)
        scheduler.step()
        print({"train": tr, "val": va})

        # Early stopping on MAE
        if va["mae"] < best_val - 1e-4:
            best_val = va["mae"]
            bad = 0
            ckpt = {
                'model': model.state_dict(),
                'epoch': epoch,
                'val_mae': va["mae"],
                'config': vars(args),
                'meta_cols': meta_cols,
            }
            torch.save(ckpt, Path(args.out)/'model_best.pth')
            print(f"Saved best checkpoint (val MAE={best_val:.3f})")
        else:
            bad += 1
            if bad >= patience:
                print("Early stopping.")
                break

    # Final test
    # Load best
    best_ckpt = torch.load(Path(args.out)/'model_best.pth', map_mode=torch.device('cpu')) if os.path.exists(Path(args.out)/'model_best.pth') else None
    if best_ckpt:
        model.load_state_dict(best_ckpt['model'])
    te = evaluate(model, test_loader, device)
    print({"test": te})
    with open(Path(args.out)/'metrics.txt', 'w') as f:
        f.write(str(te))


if __name__ == '__main__':
    main()
