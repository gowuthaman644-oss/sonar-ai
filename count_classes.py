import os
import glob
from collections import defaultdict
import random

base_dir = r'dataset/side-scan-sonar-object-detection-challenge'
train_labels = glob.glob(os.path.join(base_dir, 'train', 'labels', '*.txt'))
valid_labels = glob.glob(os.path.join(base_dir, 'valid', 'labels', '*.txt'))

def get_stats(files):
    counts = defaultdict(int)
    samples = defaultdict(list)
    for f in files:
        with open(f, 'r') as file:
            for line in file:
                parts = line.strip().split()
                if parts:
                    cls_id = int(parts[0])
                    counts[cls_id] += 1
                    if len(samples[cls_id]) < 5:
                        samples[cls_id].append(f)
    return counts, samples

train_counts, train_samples = get_stats(train_labels)
valid_counts, valid_samples = get_stats(valid_labels)

combined_counts = defaultdict(int)
for k, v in train_counts.items():
    combined_counts[k] += v
for k, v in valid_counts.items():
    combined_counts[k] += v

print('TRAIN COUNTS:', dict(train_counts))
print('VALID COUNTS:', dict(valid_counts))
print('COMBINED COUNTS:', dict(combined_counts))

for cls_id in sorted(combined_counts.keys()):
    print(f'\\nCLASS {cls_id} SAMPLES:')
    for s in train_samples[cls_id][:5]:
        print(s)
