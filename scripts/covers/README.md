# Course cover sources

HTML sources for the 1600x1000 course covers in `public/covers/`. Text stays inside the
16:9 crop used on the course page (about 60px of margin is trimmed top and bottom).

Re-render (Chromium, from this folder; the window is taller than the page, so crop to 1000px):

    chrome --headless --no-sandbox --hide-scrollbars --force-device-scale-factor=1 \
      --window-size=1600,1200 --screenshot=out.png file://$PWD/dptc.html

then crop `out.png` to 1600x1000 and save to `public/covers/<course-slug>.png`.
Set the course's `cover_path` to `/covers/<course-slug>.png`.
