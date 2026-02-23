# StudioAI Render Server (ComfyUI Bridge)

This service receives render jobs from `apps/api` and sends progress/completion callbacks back to the API webhook endpoints.

## What It Does

- accepts `POST /render-full-episode`
- renders one image per storyboard shot using ComfyUI
- supports character reference image consistency
- supports emotion reference images per character
- reports progress to API callbacks
- creates final MP4 with ffmpeg

Current mode is `storyboard_keyframes` (stable and GPU-friendly for local workflows).

## Requirements

- Python 3.10+
- ComfyUI running locally (Desktop app on `http://127.0.0.1:8000` or classic on `http://127.0.0.1:8188`)
- ffmpeg installed and available in `PATH` (or set `FFMPEG_PATH`)

## Setup

```bash
cd render-server
python -m venv .venv
```

Activate venv:

- Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create env file:

```bash
cp .env.example .env
```

## Environment Variables

```env
# Security with StudioAI API
RENDER_API_KEY=local-render-key

# ComfyUI
COMFYUI_URL=http://127.0.0.1:8000
COMFYUI_WORKFLOW_PATH=
COMFYUI_CHECKPOINT=

# Render tuning
COMFYUI_WIDTH=832
COMFYUI_HEIGHT=480
COMFYUI_STEPS=24
COMFYUI_CFG=7
COMFYUI_DENOISE=0.55
COMFYUI_FPS=12
COMFYUI_SAMPLER=euler
COMFYUI_SCHEDULER=normal
COMFYUI_TIMEOUT_SECONDS=240
COMFYUI_REFERENCE_STRENGTH=0.65
COMFYUI_NEGATIVE_BASE=blurry, low quality, distorted face, extra limbs, text, watermark

# ffmpeg
FFMPEG_PATH=ffmpeg
```

Notes:

- If `COMFYUI_WORKFLOW_PATH` is set, use an API-format workflow JSON.
- If no workflow path is set, `COMFYUI_CHECKPOINT` or an auto-detected checkpoint is required.

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

Health checks:

```bash
curl http://localhost:9000/health
curl http://localhost:9000/comfy/health
```

## Connect to StudioAI API

In root `studioai/.env`:

```env
RENDER_SERVER_URL=http://localhost:9000
RENDER_API_KEY=local-render-key
RENDER_SERVER_CALLBACK_KEY=local-callback-key
```

Restart API after env changes.

## API Contract Summary

### Inbound

- `POST /render-full-episode`
- Header: `x-api-key: <RENDER_API_KEY>` (if configured)

### Outbound callbacks (to StudioAI API)

- `POST /api/webhooks/render/progress`
- `POST /api/webhooks/render/complete`
- `POST /api/webhooks/render/failed`

Header used on callbacks:

- `x-render-server-key: <callback_key from request>`

## ComfyUI Workflow Guidance

- Best quality/control: provide `COMFYUI_WORKFLOW_PATH`
- Quick fallback: use built-in text2img/img2img workflows with `COMFYUI_CHECKPOINT`
- For reference-image workflows, include `LoadImage` and your IPAdapter nodes if desired

## Known Limitations

- TTS/music/SFX are currently callback progress stubs (not full synthesis pipelines yet)
- Output is keyframe-based video assembly, not full frame-by-frame diffusion animation
