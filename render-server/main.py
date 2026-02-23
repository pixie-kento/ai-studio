import copy
import hashlib
import json
import mimetypes
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="StudioAI Render Server", version="0.2.0")
DEFAULT_COMFYUI_URLS = ("http://127.0.0.1:8000", "http://127.0.0.1:8188")
TRANSPARENT_1PX_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
    b"\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc`\x00\x02\x00\x00\x05"
    b"\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


class VoiceAssignmentPayload(BaseModel):
    voice_actor_id: str = ""
    voice_actor_name: str = ""
    provider: str = ""
    external_voice_id: str = ""
    tts_style: str = ""
    tts_speed: float = 1.0
    tts_pitch: float = 0.0
    settings: dict[str, Any] = Field(default_factory=dict)


class EmotionReferencePayload(BaseModel):
    id: str = ""
    emotion: str = "neutral"
    prompt_hint: str = ""
    reference_image: str = ""
    reference_image_url: str | None = None


class CharacterPayload(BaseModel):
    id: str = ""
    name: str
    role: str = ""
    positive_prompt: str = ""
    negative_prompt: str = ""
    seed: int | None = None
    lora_file: str = ""
    reference_image: str = ""
    reference_image_url: str | None = None
    voice_assignment: VoiceAssignmentPayload | None = None
    emotion_references: list[EmotionReferencePayload] = Field(default_factory=list)


class ShotPayload(BaseModel):
    scene: int = 1
    shot_index: int = 1
    duration_sec: float = 4
    camera: str = "medium"
    action: str = ""
    emotion: str = ""
    music_mood: str = ""
    prompt_positive: str = ""
    prompt_negative: str = ""
    focus_character: str = ""
    seed: int | None = None


class RenderRequest(BaseModel):
    episode_id: str
    episode_number: int | None = None
    title: str = ""
    script: str = ""
    moral: str = ""
    style: str = ""
    storyboard: list[ShotPayload] = Field(default_factory=list)
    characters: list[CharacterPayload] = Field(default_factory=list)
    audio: dict[str, Any] = Field(default_factory=dict)
    render: dict[str, Any] = Field(default_factory=dict)
    production: dict[str, Any] = Field(default_factory=dict)
    callback_url: str
    callback_key: str
    job_id: str


def normalize_url(url: str) -> str:
    return url.rstrip("/")


def parse_bool(value: Any, fallback: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return fallback


def parse_int(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except Exception:
        return fallback


def parse_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except Exception:
        return fallback


def get_ffmpeg_path() -> str:
    return os.getenv("FFMPEG_PATH", "ffmpeg")


def get_render_config(overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    overrides = overrides or {}
    return {
        "width": max(256, parse_int(overrides.get("width", os.getenv("COMFYUI_WIDTH", 832)), 832)),
        "height": max(256, parse_int(overrides.get("height", os.getenv("COMFYUI_HEIGHT", 480)), 480)),
        "steps": max(6, parse_int(overrides.get("steps", os.getenv("COMFYUI_STEPS", 24)), 24)),
        "cfg": max(1.0, parse_float(overrides.get("cfg", os.getenv("COMFYUI_CFG", 7.0)), 7.0)),
        "denoise": min(1.0, max(0.1, parse_float(overrides.get("denoise", os.getenv("COMFYUI_DENOISE", 0.55)), 0.55))),
        "fps": max(6, parse_int(overrides.get("fps", os.getenv("COMFYUI_FPS", 12)), 12)),
        "sampler": str(overrides.get("sampler", os.getenv("COMFYUI_SAMPLER", "euler"))),
        "scheduler": str(overrides.get("scheduler", os.getenv("COMFYUI_SCHEDULER", "normal"))),
        "timeout_seconds": max(
            30, parse_int(overrides.get("timeout_seconds", os.getenv("COMFYUI_TIMEOUT_SECONDS", 240)), 240)
        ),
        "reference_strength": min(
            1.0,
            max(0.0, parse_float(overrides.get("reference_strength", os.getenv("COMFYUI_REFERENCE_STRENGTH", 0.65)), 0.65)),
        ),
        "fail_on_shot_error": parse_bool(
            overrides.get("fail_on_shot_error", os.getenv("RENDER_FAIL_ON_SHOT_ERROR", "false")),
            False,
        ),
        "require_ffmpeg": parse_bool(
            overrides.get("require_ffmpeg", os.getenv("RENDER_REQUIRE_FFMPEG", "false")),
            False,
        ),
    }


def get_comfy_system_stats(base_url: str) -> dict[str, Any] | None:
    try:
        response = requests.get(f"{normalize_url(base_url)}/system_stats", timeout=4)
        if response.status_code >= 400:
            return None
        return response.json()
    except Exception:
        return None


def resolve_comfyui_url(explicit_url: str | None = None) -> tuple[str | None, dict[str, Any] | None]:
    candidates: list[str] = []
    for candidate in [explicit_url, os.getenv("COMFYUI_URL"), *DEFAULT_COMFYUI_URLS]:
        if not candidate:
            continue
        normalized = normalize_url(candidate)
        if normalized not in candidates:
            candidates.append(normalized)

    for candidate in candidates:
        stats = get_comfy_system_stats(candidate)
        if stats is not None:
            return candidate, stats
    return None, None


def comfy_get_json(comfyui_url: str, path: str, params: dict[str, Any] | None = None, timeout: int = 10) -> dict[str, Any]:
    response = requests.get(f"{normalize_url(comfyui_url)}{path}", params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


def comfy_post_json(comfyui_url: str, path: str, payload: dict[str, Any], timeout: int = 30) -> dict[str, Any]:
    response = requests.post(f"{normalize_url(comfyui_url)}{path}", json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()


def send_callback(base_url: str, callback_key: str, route: str, payload: dict[str, Any]) -> None:
    url = f"{base_url.rstrip('/')}/{route.lstrip('/')}"
    headers = {"x-render-server-key": callback_key, "Content-Type": "application/json"}
    try:
        requests.post(url, json=payload, headers=headers, timeout=20)
    except Exception as err:
        print(f"[render-server] callback failed {route}: {err}")


def slugify(value: str) -> str:
    clean = "".join(ch.lower() if ch.isalnum() else "-" for ch in (value or "shot"))
    while "--" in clean:
        clean = clean.replace("--", "-")
    clean = clean.strip("-")
    return clean or "shot"


def deterministic_seed(*parts: Any) -> int:
    raw = "|".join(str(p) for p in parts)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:12], 16) % 2147483647


def pick_primary_character(characters: list[CharacterPayload]) -> CharacterPayload | None:
    if not characters:
        return None
    for character in characters:
        if (character.role or "").lower() == "main":
            return character
    for character in characters:
        if character.reference_image_url:
            return character
    return characters[0]


def get_focus_character(
    shot: ShotPayload, characters: list[CharacterPayload], fallback: CharacterPayload | None
) -> CharacterPayload | None:
    target = (shot.focus_character or "").strip().lower()
    if target:
        for character in characters:
            if character.name.lower() == target:
                return character
    return fallback


def normalize_emotion(value: str) -> str:
    v = (value or "").strip().lower()
    if not v:
        return "neutral"
    if "happy" in v or "joy" in v:
        return "happy"
    if "sad" in v:
        return "sad"
    if "angry" in v or "mad" in v:
        return "angry"
    if "excited" in v:
        return "excited"
    if "scared" in v or "fear" in v:
        return "scared"
    if "think" in v:
        return "thinking"
    if "surpris" in v:
        return "surprised"
    return v


def pick_emotion_reference(
    focus_character: CharacterPayload | None,
    shot: ShotPayload,
) -> tuple[str | None, str]:
    if not focus_character:
        return None, ""
    refs = focus_character.emotion_references or []
    if not refs:
        return focus_character.reference_image_url, ""

    desired = normalize_emotion(shot.emotion)
    for ref in refs:
        if normalize_emotion(ref.emotion) == desired and ref.reference_image_url:
            return ref.reference_image_url, (ref.prompt_hint or "")
    for ref in refs:
        if normalize_emotion(ref.emotion) == "neutral" and ref.reference_image_url:
            return ref.reference_image_url, (ref.prompt_hint or "")
    for ref in refs:
        if ref.reference_image_url:
            return ref.reference_image_url, (ref.prompt_hint or "")
    return focus_character.reference_image_url, ""


def build_shot_prompt(
    req: RenderRequest,
    shot: ShotPayload,
    characters: list[CharacterPayload],
    focus_character: CharacterPayload | None,
    config: dict[str, Any],
    reference_url: str | None = None,
    reference_hint: str = "",
) -> tuple[str, str, int, str | None]:
    base_positive_parts = [req.style, shot.prompt_positive, shot.action, f"camera: {shot.camera}", f"emotion: {shot.emotion}"]
    character_positive_parts: list[str] = []
    character_negative_parts: list[str] = []
    for character in characters:
        if character.positive_prompt:
            character_positive_parts.append(f"{character.name}: {character.positive_prompt}")
        if character.negative_prompt:
            character_negative_parts.append(character.negative_prompt)

    positive_parts = [p.strip() for p in base_positive_parts if p and p.strip()]
    if character_positive_parts:
        positive_parts.append("characters: " + " | ".join(character_positive_parts))
    if reference_url:
        positive_parts.append(
            f"reference consistency strength {config['reference_strength']:.2f}, same face, same outfit, same colors"
        )
        if reference_hint:
            positive_parts.append(f"emotion reference: {reference_hint}")

    negative_parts = [p.strip() for p in [shot.prompt_negative] if p and p.strip()]
    if character_negative_parts:
        negative_parts.append(" | ".join(character_negative_parts))
    default_negative = os.getenv("COMFYUI_NEGATIVE_BASE", "blurry, low quality, distorted face, extra limbs, text, watermark")
    if default_negative:
        negative_parts.append(default_negative)

    positive = ", ".join(positive_parts)
    negative = ", ".join(negative_parts)

    base_seed = (focus_character.seed if focus_character and focus_character.seed is not None else None) or deterministic_seed(
        req.episode_id, req.episode_number or 0, req.title or "episode"
    )
    shot_seed = shot.seed if shot.seed is not None else (base_seed + shot.scene * 1000 + shot.shot_index * 17)

    return positive, negative, int(shot_seed), reference_url


def fetch_default_checkpoint(comfyui_url: str) -> str | None:
    forced = (os.getenv("COMFYUI_CHECKPOINT") or "").strip()
    if forced:
        return forced
    try:
        info = comfy_get_json(comfyui_url, "/object_info/CheckpointLoaderSimple", timeout=10)
        values = (((info.get("CheckpointLoaderSimple") or {}).get("input") or {}).get("required") or {}).get("ckpt_name") or []
        if values and isinstance(values[0], list) and values[0]:
            return str(values[0][0])
    except Exception:
        return None
    return None


def load_workflow_template() -> dict[str, Any] | None:
    path = (os.getenv("COMFYUI_WORKFLOW_PATH") or "").strip()
    if not path:
        return None
    workflow_path = Path(path)
    if not workflow_path.exists() or workflow_path.suffix.lower() != ".json":
        raise RuntimeError(f"COMFYUI_WORKFLOW_PATH not found or not JSON: {workflow_path}")
    loaded = json.loads(workflow_path.read_text(encoding="utf-8"))
    if isinstance(loaded, dict) and isinstance(loaded.get("prompt"), dict):
        loaded = loaded["prompt"]
    if not isinstance(loaded, dict):
        raise RuntimeError("COMFYUI_WORKFLOW_PATH must contain an API prompt JSON object.")
    has_nodes = any(isinstance(node, dict) and node.get("class_type") for node in loaded.values())
    if not has_nodes:
        raise RuntimeError("COMFYUI_WORKFLOW_PATH does not look like a ComfyUI API workflow.")
    return loaded


def find_nodes_by_class(workflow: dict[str, Any], class_type: str) -> list[tuple[str, dict[str, Any]]]:
    result: list[tuple[str, dict[str, Any]]] = []
    for node_id, node in workflow.items():
        if isinstance(node, dict) and node.get("class_type") == class_type:
            result.append((node_id, node))
    return result


def patch_workflow_text_nodes(workflow: dict[str, Any], positive_prompt: str, negative_prompt: str) -> None:
    text_nodes = find_nodes_by_class(workflow, "CLIPTextEncode")
    if not text_nodes:
        return
    text_nodes[0][1].setdefault("inputs", {})["text"] = positive_prompt
    if len(text_nodes) > 1:
        text_nodes[1][1].setdefault("inputs", {})["text"] = negative_prompt


def patch_workflow_common(
    workflow: dict[str, Any],
    positive_prompt: str,
    negative_prompt: str,
    seed: int,
    prefix: str,
    config: dict[str, Any],
) -> None:
    patch_workflow_text_nodes(workflow, positive_prompt, negative_prompt)

    for _, node in find_nodes_by_class(workflow, "KSampler"):
        inputs = node.setdefault("inputs", {})
        inputs["seed"] = int(seed)
        inputs["steps"] = int(config["steps"])
        inputs["cfg"] = float(config["cfg"])
        inputs["sampler_name"] = config["sampler"]
        inputs["scheduler"] = config["scheduler"]
        if "denoise" in inputs:
            inputs["denoise"] = float(config["denoise"])

    for _, node in find_nodes_by_class(workflow, "EmptyLatentImage"):
        inputs = node.setdefault("inputs", {})
        inputs["width"] = int(config["width"])
        inputs["height"] = int(config["height"])
        inputs["batch_size"] = 1

    for _, node in find_nodes_by_class(workflow, "SaveImage"):
        node.setdefault("inputs", {})["filename_prefix"] = prefix


def patch_workflow_reference_image(workflow: dict[str, Any], comfy_input_name: str, config: dict[str, Any]) -> None:
    for _, node in find_nodes_by_class(workflow, "LoadImage"):
        node.setdefault("inputs", {})["image"] = comfy_input_name

    # Handle popular IPAdapter custom nodes when present in workflow templates.
    for _, node in workflow.items():
        if not isinstance(node, dict):
            continue
        class_type = str(node.get("class_type", ""))
        if "IPAdapter" not in class_type:
            continue
        inputs = node.setdefault("inputs", {})
        if "weight" in inputs:
            inputs["weight"] = float(config["reference_strength"])
        if "image" in inputs:
            inputs["image"] = comfy_input_name


def build_builtin_workflow_text2img(checkpoint: str, prefix: str, config: dict[str, Any]) -> dict[str, Any]:
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": 0,
                "steps": int(config["steps"]),
                "cfg": float(config["cfg"]),
                "sampler_name": config["sampler"],
                "scheduler": config["scheduler"],
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": int(config["width"]), "height": int(config["height"]), "batch_size": 1},
        },
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefix, "images": ["8", 0]}},
    }


def build_builtin_workflow_img2img(
    checkpoint: str, input_name: str, prefix: str, config: dict[str, Any]
) -> dict[str, Any]:
    return {
        "10": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
        "11": {"class_type": "LoadImage", "inputs": {"image": input_name}},
        "12": {"class_type": "VAEEncode", "inputs": {"pixels": ["11", 0], "vae": ["10", 2]}},
        "13": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["10", 1]}},
        "14": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["10", 1]}},
        "15": {
            "class_type": "KSampler",
            "inputs": {
                "seed": 0,
                "steps": int(config["steps"]),
                "cfg": float(config["cfg"]),
                "sampler_name": config["sampler"],
                "scheduler": config["scheduler"],
                "denoise": float(config["denoise"]),
                "model": ["10", 0],
                "positive": ["13", 0],
                "negative": ["14", 0],
                "latent_image": ["12", 0],
            },
        },
        "16": {"class_type": "VAEDecode", "inputs": {"samples": ["15", 0], "vae": ["10", 2]}},
        "17": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefix, "images": ["16", 0]}},
    }


def download_reference_image(url: str, output_dir: Path) -> Path:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    parsed = urlparse(url)
    ext = Path(parsed.path).suffix or ".png"
    file_path = output_dir / f"reference-{uuid.uuid4().hex[:10]}{ext}"
    file_path.write_bytes(response.content)
    return file_path


def upload_image_to_comfy(comfyui_url: str, image_path: Path) -> str:
    mime_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    with image_path.open("rb") as handle:
        files = {"image": (image_path.name, handle, mime_type)}
        data = {"type": "input", "overwrite": "true"}
        response = requests.post(f"{normalize_url(comfyui_url)}/upload/image", files=files, data=data, timeout=60)
    response.raise_for_status()
    payload = response.json()
    image_name = payload.get("name")
    if not image_name:
        raise RuntimeError("ComfyUI upload failed: missing image name in response")
    return str(image_name)


def queue_prompt(comfyui_url: str, workflow: dict[str, Any], client_id: str) -> str:
    payload = {"prompt": workflow, "client_id": client_id}
    data = comfy_post_json(comfyui_url, "/prompt", payload, timeout=30)
    prompt_id = data.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"ComfyUI did not return prompt_id: {data}")
    return str(prompt_id)


def wait_for_prompt_history(comfyui_url: str, prompt_id: str, timeout_seconds: int) -> dict[str, Any]:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        history = comfy_get_json(comfyui_url, f"/history/{prompt_id}", timeout=15)
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(1.2)
    raise TimeoutError(f"ComfyUI prompt timeout after {timeout_seconds}s: {prompt_id}")


def extract_output_images(history_item: dict[str, Any]) -> list[dict[str, Any]]:
    images: list[dict[str, Any]] = []
    outputs = history_item.get("outputs", {}) if isinstance(history_item, dict) else {}
    for node_output in outputs.values():
        if not isinstance(node_output, dict):
            continue
        for img in node_output.get("images", []) or []:
            if isinstance(img, dict) and img.get("filename"):
                images.append(img)
    return images


def download_comfy_image(comfyui_url: str, image_meta: dict[str, Any], output_path: Path) -> Path:
    params = {
        "filename": image_meta["filename"],
        "subfolder": image_meta.get("subfolder", ""),
        "type": image_meta.get("type", "output"),
    }
    response = requests.get(f"{normalize_url(comfyui_url)}/view", params=params, timeout=60)
    response.raise_for_status()
    output_path.write_bytes(response.content)
    return output_path


def render_fallback_frame(output_path: Path, width: int, height: int) -> Path:
    ffmpeg_bin = get_ffmpeg_path()
    if shutil.which(ffmpeg_bin):
        cmd = [
            ffmpeg_bin,
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c=black:s={width}x{height}",
            "-frames:v",
            "1",
            str(output_path),
        ]
        subprocess.run(cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if output_path.exists() and output_path.stat().st_size > 0:
            return output_path
    output_path.write_bytes(TRANSPARENT_1PX_PNG)
    return output_path


def render_title_frame(output_path: Path, width: int, height: int, text: str) -> Path:
    ffmpeg_bin = get_ffmpeg_path()
    safe_text = (text or "").strip() or "StudioAI"
    drawtext_text = (
        safe_text.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("%", "\\%")
    )
    if shutil.which(ffmpeg_bin):
        cmd = [
            ffmpeg_bin,
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c=#111827:s={width}x{height}",
            "-vf",
            f"drawtext=text='{drawtext_text}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2",
            "-frames:v",
            "1",
            str(output_path),
        ]
        proc = subprocess.run(cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
            return output_path
    return render_fallback_frame(output_path, width, height)


def build_video_from_keyframes(
    keyframes: list[tuple[Path, float]],
    output_path: Path,
    fps: int,
    width: int,
    height: int,
    require_ffmpeg: bool,
) -> None:
    ffmpeg_bin = get_ffmpeg_path()
    if not shutil.which(ffmpeg_bin):
        if require_ffmpeg:
            raise RuntimeError("ffmpeg not found. Set FFMPEG_PATH or install ffmpeg.")
        output_path.write_bytes(b"")
        return

    if not keyframes:
        raise RuntimeError("No keyframes were generated")

    manifest_path = output_path.with_suffix(".concat.txt")
    lines: list[str] = []
    for frame_path, duration in keyframes:
        file_line = frame_path.resolve().as_posix().replace("'", "'\\''")
        lines.append(f"file '{file_line}'")
        lines.append(f"duration {max(0.5, float(duration))}")
    last_file = keyframes[-1][0].resolve().as_posix().replace("'", "'\\''")
    lines.append(f"file '{last_file}'")
    manifest_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    cmd = [
        ffmpeg_bin,
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(manifest_path),
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=44100:cl=stereo",
        "-shortest",
        "-vf",
        f"fps={fps},scale={width}:{height}:flags=lanczos,format=yuv420p",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        str(output_path),
    ]
    proc = subprocess.run(cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0 or not output_path.exists() or output_path.stat().st_size == 0:
        err = proc.stderr.decode("utf-8", errors="ignore")
        raise RuntimeError(f"ffmpeg failed to build video: {err[-500:]}")


def render_single_shot(
    comfyui_url: str,
    workflow_template: dict[str, Any] | None,
    checkpoint: str | None,
    output_dir: Path,
    index: int,
    positive_prompt: str,
    negative_prompt: str,
    seed: int,
    config: dict[str, Any],
    comfy_input_image: str | None = None,
) -> Path:
    shot_prefix = f"{slugify('shot')}-{index + 1:03d}-{seed}"

    if workflow_template is not None:
        workflow = copy.deepcopy(workflow_template)
        patch_workflow_common(workflow, positive_prompt, negative_prompt, seed, shot_prefix, config)
        if comfy_input_image:
            patch_workflow_reference_image(workflow, comfy_input_image, config)
    else:
        if not checkpoint:
            raise RuntimeError(
                "No checkpoint available. Set COMFYUI_CHECKPOINT or install a checkpoint model and restart ComfyUI."
            )
        if comfy_input_image:
            workflow = build_builtin_workflow_img2img(checkpoint, comfy_input_image, shot_prefix, config)
        else:
            workflow = build_builtin_workflow_text2img(checkpoint, shot_prefix, config)
        patch_workflow_common(workflow, positive_prompt, negative_prompt, seed, shot_prefix, config)

    client_id = f"studioai-{uuid.uuid4().hex[:10]}"
    prompt_id = queue_prompt(comfyui_url, workflow, client_id)
    history = wait_for_prompt_history(comfyui_url, prompt_id, timeout_seconds=int(config["timeout_seconds"]))
    images = extract_output_images(history)
    if not images:
        raise RuntimeError(f"ComfyUI produced no output images for prompt {prompt_id}")

    output_path = output_dir / f"{shot_prefix}.png"
    return download_comfy_image(comfyui_url, images[0], output_path)


def run_render_pipeline(req: RenderRequest) -> None:
    callback_base = req.callback_url
    callback_key = req.callback_key
    render_config = get_render_config(req.render)
    production = req.production or {}
    intro_enabled = parse_bool(production.get("intro_enabled"), False)
    outro_enabled = parse_bool(production.get("outro_enabled"), False)
    intro_text = str(production.get("intro_text") or req.title or "Episode")
    outro_text = str(production.get("outro_text") or "Thanks for watching")
    intro_duration_sec = max(1.0, float(parse_int(production.get("intro_duration_sec"), 4)))
    outro_duration_sec = max(1.0, float(parse_int(production.get("outro_duration_sec"), 4)))
    music_enabled = parse_bool(production.get("music_generation_enabled"), parse_bool(req.audio.get("background_music_enabled"), True))
    sfx_enabled = parse_bool(production.get("sfx_enabled"), parse_bool(req.audio.get("sfx_enabled"), True))
    tts_enabled = parse_bool(req.audio.get("tts_enabled"), True)
    comfyui_url, comfy_stats = resolve_comfyui_url()

    send_callback(
        callback_base,
        callback_key,
        "/progress",
        {
            "episode_id": req.episode_id,
            "job_id": req.job_id,
            "progress_percent": 5,
            "current_step": "queued_on_render_server",
        },
    )

    if not comfyui_url:
        send_callback(
            callback_base,
            callback_key,
            "/failed",
            {
                "episode_id": req.episode_id,
                "job_id": req.job_id,
                "error_message": "ComfyUI is not reachable on COMFYUI_URL, 127.0.0.1:8000, or 127.0.0.1:8188.",
            },
        )
        return

    comfy_version = comfy_stats.get("system", {}).get("comfyui_version", "unknown") if comfy_stats else "unknown"
    send_callback(
        callback_base,
        callback_key,
        "/progress",
        {
            "episode_id": req.episode_id,
            "job_id": req.job_id,
            "progress_percent": 12,
            "current_step": f"comfyui_connected:{comfy_version}",
        },
    )

    episode_dir = Path(tempfile.gettempdir()) / "studioai-renders" / req.episode_id / str(req.job_id)
    frames_dir = episode_dir / "frames"
    refs_dir = episode_dir / "refs"
    episode_dir.mkdir(parents=True, exist_ok=True)
    frames_dir.mkdir(parents=True, exist_ok=True)
    refs_dir.mkdir(parents=True, exist_ok=True)

    try:
        workflow_template = load_workflow_template()
        checkpoint = fetch_default_checkpoint(comfyui_url) if workflow_template is None else None
        if workflow_template is None and not checkpoint:
            raise RuntimeError(
                "No checkpoint detected. Set COMFYUI_CHECKPOINT or set COMFYUI_WORKFLOW_PATH to an exported workflow JSON."
            )
        primary_character = pick_primary_character(req.characters)

        storyboard = req.storyboard or [ShotPayload()]
        keyframes: list[tuple[Path, float]] = []
        reference_upload_cache: dict[str, str] = {}
        reference_download_cache: dict[str, Path] = {}

        for idx, shot in enumerate(storyboard):
            focus_character = get_focus_character(shot, req.characters, primary_character)
            reference_url, reference_hint = pick_emotion_reference(focus_character, shot)
            positive_prompt, negative_prompt, seed, reference_url = build_shot_prompt(
                req,
                shot,
                req.characters,
                focus_character,
                render_config,
                reference_url=reference_url,
                reference_hint=reference_hint,
            )

            comfy_input_name: str | None = None
            if reference_url:
                if reference_url not in reference_upload_cache:
                    downloaded_path = reference_download_cache.get(reference_url)
                    if downloaded_path is None:
                        downloaded_path = download_reference_image(reference_url, refs_dir)
                        reference_download_cache[reference_url] = downloaded_path
                    reference_upload_cache[reference_url] = upload_image_to_comfy(comfyui_url, downloaded_path)
                comfy_input_name = reference_upload_cache[reference_url]

            try:
                frame_path = render_single_shot(
                    comfyui_url=comfyui_url,
                    workflow_template=workflow_template,
                    checkpoint=checkpoint,
                    output_dir=frames_dir,
                    index=idx,
                    positive_prompt=positive_prompt,
                    negative_prompt=negative_prompt,
                    seed=seed,
                    config=render_config,
                    comfy_input_image=comfy_input_name,
                )
            except Exception as shot_err:
                if render_config["fail_on_shot_error"]:
                    raise RuntimeError(f"shot {idx + 1} failed: {shot_err}") from shot_err
                frame_path = render_fallback_frame(
                    frames_dir / f"shot-{idx + 1:03d}-fallback.png",
                    width=int(render_config["width"]),
                    height=int(render_config["height"]),
                )

            keyframes.append((frame_path, max(1.0, float(shot.duration_sec or 4))))
            progress = 12 + int(((idx + 1) / max(1, len(storyboard))) * 63)
            send_callback(
                callback_base,
                callback_key,
                "/progress",
                {
                    "episode_id": req.episode_id,
                    "job_id": req.job_id,
                    "progress_percent": min(75, progress),
                    "current_step": f"rendered_shot_{idx + 1}_of_{len(storyboard)}",
                },
            )

        if intro_enabled:
            intro_frame = render_title_frame(
                frames_dir / "intro-title.png",
                width=int(render_config["width"]),
                height=int(render_config["height"]),
                text=intro_text,
            )
            keyframes.insert(0, (intro_frame, intro_duration_sec))

        if outro_enabled:
            outro_frame = render_title_frame(
                frames_dir / "outro-title.png",
                width=int(render_config["width"]),
                height=int(render_config["height"]),
                text=outro_text,
            )
            keyframes.append((outro_frame, outro_duration_sec))

        if tts_enabled:
            send_callback(
                callback_base,
                callback_key,
                "/progress",
                {
                    "episode_id": req.episode_id,
                    "job_id": req.job_id,
                    "progress_percent": 78,
                    "current_step": "voice_generation_stub",
                },
            )

        if music_enabled:
            send_callback(
                callback_base,
                callback_key,
                "/progress",
                {
                    "episode_id": req.episode_id,
                    "job_id": req.job_id,
                    "progress_percent": 81,
                    "current_step": "music_generation_stub",
                },
            )

        if sfx_enabled:
            send_callback(
                callback_base,
                callback_key,
                "/progress",
                {
                    "episode_id": req.episode_id,
                    "job_id": req.job_id,
                    "progress_percent": 83,
                    "current_step": "sfx_generation_stub",
                },
            )

        send_callback(
            callback_base,
            callback_key,
            "/progress",
            {
                "episode_id": req.episode_id,
                "job_id": req.job_id,
                "progress_percent": 85,
                "current_step": "assembling_video",
            },
        )

        output_file = episode_dir / f"{req.episode_id}-{uuid.uuid4().hex[:8]}.mp4"
        build_video_from_keyframes(
            keyframes=keyframes,
            output_path=output_file,
            fps=int(render_config["fps"]),
            width=int(render_config["width"]),
            height=int(render_config["height"]),
            require_ffmpeg=bool(render_config["require_ffmpeg"]),
        )
        duration_seconds = max(8, int(sum(duration for _, duration in keyframes) or 8))

        send_callback(
            callback_base,
            callback_key,
            "/complete",
            {
                "episode_id": req.episode_id,
                "job_id": req.job_id,
                "output_url": str(output_file),
                "duration_seconds": duration_seconds,
                "metadata": {
                    "mode": "storyboard_keyframes",
                    "shot_count": len(keyframes),
                    "comfyui_url": comfyui_url,
                    "intro_enabled": intro_enabled,
                    "outro_enabled": outro_enabled,
                    "tts_enabled": tts_enabled,
                    "music_enabled": music_enabled,
                    "sfx_enabled": sfx_enabled,
                    "voice_cast_count": len([c for c in req.characters if c.voice_assignment and c.voice_assignment.voice_actor_id]),
                },
            },
        )
    except Exception as err:
        send_callback(
            callback_base,
            callback_key,
            "/failed",
            {
                "episode_id": req.episode_id,
                "job_id": req.job_id,
                "error_message": str(err),
            },
        )


@app.get("/health")
def health() -> dict[str, Any]:
    configured_url = os.getenv("COMFYUI_URL")
    comfyui_url, stats = resolve_comfyui_url(configured_url)
    default_checkpoint = fetch_default_checkpoint(comfyui_url) if comfyui_url else None
    return {
        "status": "ok",
        "comfyui_online": bool(comfyui_url),
        "comfyui_url": comfyui_url or normalize_url(configured_url or DEFAULT_COMFYUI_URLS[0]),
        "comfyui_version": (stats or {}).get("system", {}).get("comfyui_version"),
        "render_mode": "storyboard_keyframes",
        "default_checkpoint": default_checkpoint,
    }


@app.get("/comfy/health")
def comfy_health() -> dict[str, Any]:
    configured_url = os.getenv("COMFYUI_URL")
    comfyui_url, stats = resolve_comfyui_url(configured_url)
    if not comfyui_url:
        raise HTTPException(status_code=503, detail="ComfyUI not reachable")
    return {
        "status": "ok",
        "comfyui_url": comfyui_url,
        "system": (stats or {}).get("system", {}),
        "devices": (stats or {}).get("devices", []),
        "workflow_path": os.getenv("COMFYUI_WORKFLOW_PATH", ""),
        "checkpoint": os.getenv("COMFYUI_CHECKPOINT", ""),
        "default_checkpoint": fetch_default_checkpoint(comfyui_url),
    }


@app.post("/render-full-episode")
def render_full_episode(
    req: RenderRequest,
    background_tasks: BackgroundTasks,
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    expected_key = os.getenv("RENDER_API_KEY", "")
    if expected_key and x_api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid API key")

    background_tasks.add_task(run_render_pipeline, req)
    return {
        "accepted": True,
        "episode_id": req.episode_id,
        "job_id": req.job_id,
        "shot_count": len(req.storyboard),
        "render_mode": "storyboard_keyframes",
    }
