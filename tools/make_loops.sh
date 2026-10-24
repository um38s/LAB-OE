#!/usr/bin/env bash
# 대표작 반복 클립(기본 6초): 끝 F초를 처음 F초와 겹쳐 녹여 이음새 없이 반복되게 만든다(기본 F=1초).
# 웹 전달용 H.264(1920px 원본 해상도, 30fps, 무음, faststart) + 첫 프레임 WebP 포스터 + 폰용 900px 정사각본.
# 사용: bash make_loops.sh [작품이름만]   예) bash make_loops.sh w03_kangwonland
set -e
cd "$(dirname "$0")/.."
OUT=img/works
mkdir -p "$OUT"
ONLY=$1
clip() { # 이름 원본 시작초 [앞단 필터(없으면 "")] [겹침 초] [길이 초]
  local name=$1 src=$2 ss=$3 pre=${4:+$4,} F=${5:-1.0} D=${6:-6}
  [ -n "$ONLY" ] && [ "$ONLY" != "$name" ] && return 0
  local N; N=$(python -c "print(round($F*30))")          # 겹침 프레임 수
  local OFF; OFF=$(python -c "print($D-$F)")             # 겹침 시작 시각
  local NF=$((D * 30))                                   # 결과 프레임 수
  ffmpeg -y -v error -ss "$ss" -t "7.6" -i "_scratch/yt/$src.mp4" \
    -filter_complex "[0:v]${pre}scale=1920:-2:flags=lanczos,fps=30,split[a][b];[a]trim=start_frame=$N:end_frame=$((NF + 3 + N)),setpts=PTS-STARTPTS[m];[b]trim=end_frame=$N,setpts=PTS-STARTPTS[h];[m][h]xfade=transition=fade:duration=$F:offset=$OFF,trim=end_frame=$NF,format=yuv420p[v]" \
    -map "[v]" -an -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -y -v error -i "$OUT/$name.mp4" -frames:v 1 -c:v libwebp -quality 78 "$OUT/$name.webp"
  # 폰용: 화면에서 정사각 가운데만 보이므로 가운데 정사각을 900px로
  ffmpeg -y -v error -i "$OUT/$name.mp4" -vf "crop=ih:ih,scale=900:900:flags=lanczos,format=yuv420p" -an -c:v libx264 -preset slow -crf 23 -profile:v high \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart "$OUT/${name}_m.mp4"
  echo "$name: $(du -k "$OUT/$name.mp4" | cut -f1) KB, 폰 $(du -k "$OUT/${name}_m.mp4" | cut -f1) KB, 포스터 $(du -k "$OUT/$name.webp" | cut -f1) KB"
}
clip w01_seoullight  IWG60YMttEs 46.7
clip w02_janganmun   niTaHsrvXlQ 280
# 03: 원본 왼쪽 아래 작품 설명 자막을 피해 아래 8%를 잘라냄(가운데 정렬).
#     0:40 이후 선명한 색 구간(사용자 지정). 채도 측정상 선명한 구간이 40.0~45.2초뿐(뒤는 영상 끝 페이드) → 5초 반복.
#     이 흐름은 비슷한 프레임으로 돌아오지 않아 겹침이 길면 뿌옇게 섞여 보임 → 겹침 0.4초
clip w03_kangwonland 57afv7eFpKw 39.8 "crop=iw*0.92:ih*0.92:iw*0.04:0" 0.4 5
