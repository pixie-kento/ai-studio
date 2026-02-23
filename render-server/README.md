# StudioAI Render Server (ComfyUI Bridge)

This service receives render jobs from `apps/api` and sends progress callbacks back to:
- `POST /api/webhooks/render/progress`
- `POST /api/webhooks/render/complete`
- `POST /api/webhooks/render/failed`

## 1) Setup

```bash
cd render-server
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Set `.env` values:
- `RENDER_API_KEY`: must match `RENDER_API_KEY` in `studioai/.env`
- `COMFYUI_URL`: for ComfyUI Desktop usually `http://127.0.0.1:8000` (classic Python launch is often `8188`)
- `COMFYUI_WORKFLOW_PATH`: optional exported ComfyUI workflow JSON path (recommended for custom nodes/models)
- `COMFYUI_CHECKPOINT`: optional checkpoint name for built-in fallback workflow
- `FFMPEG_PATH`: path to ffmpeg binary (or `ffmpeg` if in PATH)

## 2) Run

```bash
uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

Health check:

```bash
curl http://localhost:9000/health
curl http://localhost:9000/comfy/health
```

If `default_checkpoint` is `null`, either:
- set `COMFYUI_CHECKPOINT` explicitly, or
- set `COMFYUI_WORKFLOW_PATH` to a workflow that already includes your model loaders.

Use an **API workflow JSON** (`Save (API format)` / copied API prompt JSON), not the UI graph export.

Without either of those, render jobs fail fast with a clear configuration error.

## 3) Connect to StudioAI API

In `studioai/.env`:

```env
RENDER_SERVER_URL=http://localhost:9000
RENDER_API_KEY=your-render-server-secret
RENDER_SERVER_CALLBACK_KEY=your-callback-secret
```

Restart API after editing env.

## 4) What this scaffold does now

- Accepts `POST /render-full-episode`
- Renders one keyframe per storyboard shot using ComfyUI API
- Uses deterministic seeds and character prompt blending for consistency
- Uses uploaded character reference images when available (`LoadImage` / IPAdapter-compatible templates)
- Emits callback progress updates during shot rendering and muxing
- Builds final mp4 with ffmpeg from keyframes

## 5) Rendering mode

- Default mode: `storyboard_keyframes` (image-first, stable on mid-range GPUs)
- Built-in fallback workflow:
1. Text-to-image if no reference image exists
2. Image-to-image when a reference image exists
- Recommended mode: set `COMFYUI_WORKFLOW_PATH` to your own exported workflow JSON for best quality/control
