import os
import glob
import yaml

base_dir = r'dataset/side-scan-sonar-object-detection-challenge'
yaml_path = os.path.join(base_dir, 'data.yaml')

# 1. Verify data.yaml
with open(yaml_path, 'r') as f:
    data = yaml.safe_load(f)
print(f'YAML Valid: True')

# Verify paths
train_img_dir = os.path.join(base_dir, 'train', 'images')
train_lbl_dir = os.path.join(base_dir, 'train', 'labels')
valid_img_dir = os.path.join(base_dir, 'valid', 'images')
valid_lbl_dir = os.path.join(base_dir, 'valid', 'labels')

print(f'Train Images Dir Exists: {os.path.isdir(train_img_dir)}')
print(f'Train Labels Dir Exists: {os.path.isdir(train_lbl_dir)}')
print(f'Valid Images Dir Exists: {os.path.isdir(valid_img_dir)}')
print(f'Valid Labels Dir Exists: {os.path.isdir(valid_lbl_dir)}')

# 8. Scan all label files
invalid_files = []
corrupt_files = []
total_anns = 0
valid_anns = 0

class_counts = {0: 0, 1: 0, 2: 0, 3: 0}
allowed_classes = {0, 1, 2, 3}

for lbl_dir in [train_lbl_dir, valid_lbl_dir]:
    for txt in glob.glob(os.path.join(lbl_dir, '*.txt')):
        try:
            with open(txt, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    total_anns += 1
                    parts = line.split()
                    if len(parts) != 5:
                        corrupt_files.append(f'{txt}: Invalid length {len(parts)}')
                        continue
                    
                    c = int(parts[0])
                    x, y, w, h = map(float, parts[1:])
                    
                    if c not in allowed_classes:
                        invalid_files.append(f'{txt}: Invalid class {c}')
                        continue
                    
                    if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 <= w <= 1.0 and 0.0 <= h <= 1.0):
                        invalid_files.append(f'{txt}: Bbox out of bounds ({x},{y},{w},{h})')
                        continue
                        
                    valid_anns += 1
                    class_counts[c] += 1
        except Exception as e:
            corrupt_files.append(f'{txt}: Error reading file: {e}')

print(f'Total Annotations: {total_anns}')
print(f'Valid Annotations: {valid_anns}')
print(f'Invalid/Corrupt Annotations: {len(invalid_files) + len(corrupt_files)}')
if invalid_files or corrupt_files:
    print('Issues found:')
    for i in (invalid_files + corrupt_files)[:10]:
        print(i)
        
print('\\nClass Distribution:')
for cid, name in data['names'].items():
    print(f'{name}: {class_counts[cid]}')

