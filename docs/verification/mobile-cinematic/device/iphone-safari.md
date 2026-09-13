# Physical iPhone Safari verification

Tested on 2026-09-13 with a paired iPhone 14 Pro (iPhone15,2) running iOS 26.6 (23G71), using Mobile Safari against the final local production build.

## Harness and transport

The temporary LAN proxy accepted only the paired device and a one-use token, and forwarded only this SDQ preview to the localhost server. Its initial implementation forwarded a gzip header after Node had already decompressed JavaScript and CSS. That made Safari try to decompress the same bytes twice and prevented hydration. The corrected proxy requested `Accept-Encoding: identity` and stripped encoding and stale length headers from any decoded response. Before the final phone run, the proxied JavaScript matched the upstream file byte-for-byte: 177,995 bytes with SHA-256 `51545462a496f7ce9f6f807db10f00e3689612368d43f7cfabe788b96e10fcdf`.

## Verified on the physical phone

- The page hydrated at a 393 by 695 CSS-pixel portrait viewport, detected the mobile portrait layout, exposed all six native scroll stops, and reached a ready stage.
- Both mobile video elements reached `readyState = 4`. Initial forward playback and continuous looping in both directions were observed in telemetry.
- The six chapters were reached in order, and their intended film ranges and visible-content bounds passed the native harness checks.
- A fresh upward gesture from the final chapter, started in the film away from its links, entered wrap departure, advanced through the end of the film, returned to the opening at scroll position zero, and remained stable after snapping was restored.
- A full reverse gesture began reverse travel and the journey returned through the chapters to the opening without a chapter assertion failure.
- Uncropped portrait screenshots show sharp, readable chapter content without an obvious seam or bottom strip. On the contact chapter, the phone number, email address, and See More control remain clear of Safari's expanded and collapsed controls.
- During rotation, telemetry reported an 852 by 393 CSS-pixel landscape viewport on the Trusted Partnerships chapter, with the stage ready and looping. The heading, body copy, and language control bounds were inside the viewport.

## Limits of the run

The final XCTest run ended when Safari's accessibility diagnostic node became unavailable in landscape. Because of that harness failure, no settled landscape screenshot was captured and the background-and-return step was not performed. Portrait orientation was restored by teardown, but that return was not verified as part of the application flow. The XCTest result bundle was incomplete and was moved to the temporary harness folder rather than retained as proof.

VoiceOver, pinch zoom, pull-to-refresh, and Android were not tested. The wide images in `final-continuation` show film travel only and do not establish a settled landscape layout.

## Evidence

- `forward-stops/`: uncropped portrait screenshots for every chapter, with additional contact toolbar states.
- `final-continuation/`: uncropped screenshots from the wrap and reverse continuation. Each filename states its visible content; the folder README explains the transition images.
- `sdq-iphone14pro-final-trace-compact.json`: token-free samples covering startup, media state, chapter travel, wrap, reverse travel, and rotation.
- `sdq-iphone14pro-final-network.jsonl`: compact token-free request/status record from the final run.
- `iphone14pro-opening-reverse-stalled.png`: pre-fix diagnostic image retained to document the physical reverse-decoder stall that the final build corrected.
