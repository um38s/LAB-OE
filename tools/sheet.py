"""영상마다 일정 간격 프레임을 모아 시각 표시가 붙은 접촉 시트 PNG로 만든다."""
import sys, os, cv2, numpy as np

src, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 24
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
dur = total / fps
tiles = []
for k in range(n):
    t = dur * (k + 0.5) / n
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, f = cap.read()
    if not ok:
        continue
    h, w = f.shape[:2]
    f = cv2.resize(f, (320, int(320 * h / w)))
    cv2.rectangle(f, (0, 0), (70, 22), (0, 0, 0), -1)
    cv2.putText(f, f"{t:5.1f}s", (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    tiles.append(f)
cols = 6
th, tw = tiles[0].shape[:2]
while len(tiles) % cols:
    tiles.append(np.zeros_like(tiles[0]))
rows = [np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]
cv2.imwrite(out, np.vstack(rows))
print(out, f"{dur:.1f}s", f"{fps:.2f}fps")
