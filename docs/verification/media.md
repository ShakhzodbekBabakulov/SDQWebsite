# Desktop media verification

## Accepted source

- File: `assets/source/SDQ_Train_Master_1080p.mp4`
- SHA-256: `2f060bfa61d809bbd9b71185bfa89545a75b2ee650a3d6183c92a61fbc47344f`
- 1920 x 1080, HEVC 10-bit 4:2:0, 24 fps, 721 frames, 30.041667 seconds, silent

## Browser copies

- `public/video/sdq-train-desktop.mp4`
- `public/video/sdq-train-desktop-reverse.mp4`
- H.264 High, 8-bit 4:2:0, 1920 x 1080, 24 fps, 721 frames, 30.041667 seconds, silent
- Fast-start MP4 with 121 keyframes: frames 0, 6, 12, ... 720
- Opening poster: `public/video/sdq-train-poster.jpg`, 1920 x 1080

Both browser movies decode completely with FFmpeg. Reversing the reverse copy and comparing it with the forward copy at 960 x 540 produces 50.014 dB average PSNR, confirming the expected frame correspondence after independent H.264 encoding.

## Mobile wide media

Generated with FFmpeg 8.1.1 from the accepted source. The scale is uncropped: the full 16:9 frame is resized from 1920 x 1080 to 1280 x 720 with Lanczos filtering.

```sh
ffmpeg -hide_banner -y \
  -i assets/source/SDQ_Train_Master_1080p.mp4 \
  -map 0:v:0 \
  -vf 'scale=1280:720:flags=lanczos,fps=24,format=yuv420p' \
  -frames:v 721 -an -c:v libx264 -preset medium -crf 21 \
  -g 6 -keyint_min 6 -sc_threshold 0 -movflags +faststart \
  public/video/sdq-train-mobile-wide.mp4

ffmpeg -hide_banner -y \
  -i assets/source/SDQ_Train_Master_1080p.mp4 \
  -map 0:v:0 \
  -vf 'reverse,scale=1280:720:flags=lanczos,fps=24,format=yuv420p' \
  -frames:v 721 -an -c:v libx264 -preset medium -crf 21 \
  -g 6 -keyint_min 6 -sc_threshold 0 -movflags +faststart \
  public/video/sdq-train-mobile-wide-reverse.mp4

ffmpeg -hide_banner -loglevel error -y \
  -i assets/source/SDQ_Train_Master_1080p.mp4 \
  -map 0:v:0 \
  -vf 'select=eq(n\,0),scale=1280:720:flags=lanczos' \
  -frames:v 1 -an -q:v 2 -update 1 \
  public/video/sdq-train-mobile-wide-poster.jpg
```

The source and pre-existing browser files remained unchanged:

```text
2f060bfa61d809bbd9b71185bfa89545a75b2ee650a3d6183c92a61fbc47344f  assets/source/SDQ_Train_Master_1080p.mp4
a5824ce3111b8ed22c3efa598eeca6bfef50705327f6af7ccc44748bc3022b85  public/video/sdq-train-desktop.mp4
efd2ff0bbc272a07f2d0487aac362cf2638994b077064f47b00b72c4a44da582  public/video/sdq-train-desktop-reverse.mp4
28c2e7aaf54c1e70f781d0ed46bbb5ee71cde7b5f827748636b556cce79c6aeb  public/video/sdq-train-poster.jpg
```

New file checksums:

```text
6a59873d3f757aa93b0164d7a01bcc18c6218bca1b7bbd1deed2c5378fd732ef  public/video/sdq-train-mobile-wide.mp4
263a69a9e5d57bee74cc596f8b755f5af9c18afb1e5d1df2812b53266bb5ca7c  public/video/sdq-train-mobile-wide-reverse.mp4
ca6196a3a12cc5ad896a56e8b9cf60700a1316f9ba7ab29d7744154faae1e611  public/video/sdq-train-mobile-wide-poster.jpg
```

### Verification

`ffprobe -count_frames` reports both movies as H.264 High, yuv420p, 1280 x 720, 24/1 fps, 721 declared and decoded frames, a 30.041667-second duration, a zero-second start time, and one video stream with no audio stream. The poster is 1280 x 720 MJPEG/yuvj420p.

The following check counted 121 keyframes in each movie at frames 0, 6, 12, ... 720:

```sh
for f in public/video/sdq-train-mobile-wide.mp4 public/video/sdq-train-mobile-wide-reverse.mp4; do
  ffprobe -v error -select_streams v:0 -show_frames \
    -show_entries frame=key_frame -of csv=p=0 "$f" |
  awk -F, 'BEGIN{i=0;c=0;ok=1} $1==1 {if(i%6!=0)ok=0;c++} {i++} END {exit !(i==721&&c==121&&ok)}'
done
```

The command requests `keyint_min 6`; libx264 165 reports its internally clamped `keyint_min=4` when `keyint=6`. With scene-cut keyframes disabled, the decoded result still has the required fixed six-frame spacing verified above.

Both complete decode checks exited 0 with no errors:

```sh
for f in public/video/sdq-train-mobile-wide.mp4 public/video/sdq-train-mobile-wide-reverse.mp4; do
  ffmpeg -v error -i "$f" -map 0:v:0 -f null -
done
```

Fast-start inspection with `grep -aob -m1 'moov'` and `grep -aob -m1 'mdat'` placed `moov` before `mdat` in both movies: byte 36 before byte 8792 in the forward file, and byte 36 before byte 8672 in the reverse file.

Reversing the reverse movie back, resizing both decoded streams to 960 x 540, and comparing all 721 corresponding frames produced 46.029158 dB average PSNR (minimum 42.556072 dB, maximum 55.197360 dB):

```sh
ffmpeg -hide_banner \
  -i public/video/sdq-train-mobile-wide.mp4 \
  -i public/video/sdq-train-mobile-wide-reverse.mp4 \
  -filter_complex \
  '[1:v]reverse,scale=960:540:flags=lanczos,setpts=N/(24*TB)[reversed];[0:v]scale=960:540:flags=lanczos,setpts=N/(24*TB)[forward];[forward][reversed]psnr' \
  -an -f null -
```

### Local partial-file delivery

Both new MP4s returned HTTP `206 Partial Content` for `Range: bytes=1000-1999`, with `Accept-Ranges: bytes`, a 1,000-byte response, and matching `Content-Range` totals (9,717,179 bytes forward; 9,727,838 bytes reverse). The final local check also decoded/count-verified all 721 frames again and compared every pre-existing video/poster and the master byte-for-byte against the untouched main checkout. See [media-checks.json](mobile-cinematic/media-checks.json).
