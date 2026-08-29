import os
import glob
from collections import Counter

base_dir = r'dataset/side-scan-sonar-object-detection-challenge'
train_dir = os.path.join(base_dir, 'train')
valid_dir = os.path.join(base_dir, 'valid')
text_dir = os.path.join(base_dir, 'text')
text_images_dir = os.path.join(text_dir, 'images')

def analyze_dir(d):
    files = glob.glob(os.path.join(d, '**', '*.*'), recursive=True)
    images = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    annotations = [f for f in files if f.lower().endswith('.txt') and not f.endswith('classes.txt')]
    exts = Counter(os.path.splitext(f)[1].lower() for f in files)
    return len(files), len(images), len(annotations), exts, images, annotations

train_total, train_img_count, train_ann_count, train_exts, train_images, train_anns = analyze_dir(train_dir)
valid_total, valid_img_count, valid_ann_count, valid_exts, valid_images, valid_anns = analyze_dir(valid_dir)
text_total, text_img_count, text_ann_count, text_exts, _, _ = analyze_dir(text_dir)
text_images_total = len(glob.glob(os.path.join(text_images_dir, '*.*'))) if os.path.exists(text_images_dir) else 0

total_images = train_img_count + valid_img_count + text_img_count
total_annotations = train_ann_count + valid_ann_count + text_ann_count

print(f'Train files: {train_total} (Images: {train_img_count}, Annotations: {train_ann_count})')
print(f'Train extensions: {dict(train_exts)}')
print(f'Valid files: {valid_total} (Images: {valid_img_count}, Annotations: {valid_ann_count})')
print(f'Valid extensions: {dict(valid_exts)}')
print(f'Text folder total files: {text_total}')
print(f'Text/images folder total files: {text_images_total}')

# Sample annotations
sample_anns = train_anns[:3]
for ann in sample_anns:
    with open(ann, 'r') as f:
        print(f'\\nSample {ann}:')
        print(f.read(100))

# Missing annotations check
train_img_basenames = {os.path.splitext(os.path.basename(f))[0] for f in train_images}
train_ann_basenames = {os.path.splitext(os.path.basename(f))[0] for f in train_anns}

missing_anns = train_img_basenames - train_ann_basenames
missing_imgs = train_ann_basenames - train_img_basenames
print(f'\\nMissing annotations in train: {len(missing_anns)}')
print(f'Missing images in train: {len(missing_imgs)}')

