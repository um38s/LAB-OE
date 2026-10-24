"""반복 클립 검사: 프레임 수, 평소 인접 프레임 차이(중앙값·최대) vs 끝→처음 이음새 차이."""
import sys, glob, cv2, numpy as np

for path in sorted(glob.glob(sys.argv[1])):
    cap = cv2.VideoCapture(path)
    frames = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(cv2.resize(f, (400, 225)).astype(np.float32))
    d = [np.abs(frames[i + 1] - frames[i]).mean() for i in range(len(frames) - 1)]
    seam = np.abs(frames[0] - frames[-1]).mean()
    print(f"{path.split(chr(92))[-1].split('/')[-1]}: {len(frames)}f  평소 중앙값 {np.median(d):.2f} 최대 {max(d):.2f}  이음새 {seam:.2f}")
