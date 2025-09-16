# Melody Dash Embed Guide

Use the snippet below to embed Melody Dash in a responsive container. Replace `https://your-cloud-run-url` with the production URL once the Cloud Run deployment is live.

```html
<div style="position: relative; padding-top: 56.25%; width: 100%; max-width: 960px; margin: 0 auto;">
  <iframe
    src="https://your-cloud-run-url"
    title="Melody Dash"
    allow="fullscreen; autoplay"
    style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #121212;"
  ></iframe>
</div>
```

For tighter spaces (e.g., a sidebar), adjust `padding-top` to `75%` for a 4:3 aspect ratio. Keep at least 640×360 pixels to preserve the layout and controls.
