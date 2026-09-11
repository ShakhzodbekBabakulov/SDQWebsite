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
