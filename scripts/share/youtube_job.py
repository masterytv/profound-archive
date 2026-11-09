"""Daily Share Your Experience job (run by .github/workflows/share-youtube.yml).

For each published story the app hands out (GET /api/share/jobs/queue):
  1. narration: if the story needs a synthetic narration (text stories, and every
     anonymous story: an anonymous person's own voice is never published), read
     it with Chatterbox cloning Tom's voice sample, and upload the mp3 to the
     signed upload URL the app provided;
  2. video: build the YouTube video (original video; or the illustration with
     the original audio / the narration) with ffmpeg and upload it to the
     Project Profound channel;
  3. report back (POST /api/share/jobs/result).
It also deletes YouTube videos of stories that were deleted or removed.

This script never touches the database or storage keys: it only talks to the
app with CRON_SECRET, uses one-off signed URLs, and YouTube's API.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import time

import requests

APP_URL = os.environ["APP_URL"].rstrip("/")
CRON_SECRET = os.environ["CRON_SECRET"]
SAMPLE_URL = os.environ.get("SHARE_NARRATOR_SAMPLE_URL", "")
YT_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID", "")
YT_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET", "")
YT_REFRESH_TOKEN = os.environ.get("YOUTUBE_REFRESH_TOKEN", "")
YT_PRIVACY = os.environ.get("YOUTUBE_PRIVACY", "public")
BUDGET_SECONDS = float(os.environ.get("SHARE_JOB_BUDGET_MINUTES") or 300) * 60
STARTED = time.monotonic()
HEADERS = {"x-cron-secret": CRON_SECRET}


def log(msg):
    print(f"[{(time.monotonic() - STARTED) / 60:5.1f} min] {msg}", flush=True)


def app_get(path):
    r = requests.get(f"{APP_URL}{path}", headers=HEADERS, timeout=300)
    r.raise_for_status()
    return r.json()


def app_post(path, body):
    r = requests.post(f"{APP_URL}{path}", headers={**HEADERS, "content-type": "application/json"}, data=json.dumps(body), timeout=120)
    if not r.ok:
        log(f"POST {path} failed: {r.status_code} {r.text[:300]}")
    return r.ok


def download(url, dest):
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    return dest


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


# ── Narration ────────────────────────────────────────────────────────────────

def split_lines(text, max_chars=260):
    """Sentences grouped into lines Chatterbox reads well (it drifts on long input)."""
    out = []
    for para in re.split(r"\n\s*\n", text.strip()):
        sentences = re.findall(r"[^.!?]+[.!?]+[\"')\]]*|[^.!?]+$", para.replace("\n", " "))
        line = ""
        for s in (x.strip() for x in sentences):
            if not s:
                continue
            if line and len(line) + len(s) + 1 > max_chars:
                out.append(line)
                line = s
            else:
                line = f"{line} {s}".strip()
            while len(line) > max_chars * 1.6:  # a very long sentence: cut at a comma or space
                cut = line.rfind(",", 0, max_chars) + 1 or line.rfind(" ", 0, max_chars) + 1 or max_chars
                out.append(line[:cut].strip())
                line = line[cut:].strip()
        if line:
            out.append(line)
    return out


_voice = None


def voice():
    """Load Chatterbox once and learn Tom's voice from the sample."""
    global _voice
    if _voice is None:
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS

        if not SAMPLE_URL:
            raise RuntimeError("SHARE_NARRATOR_SAMPLE_URL is not set")
        torch.set_num_threads(os.cpu_count() or 2)
        tmp = tempfile.mkdtemp()
        raw = download(SAMPLE_URL, os.path.join(tmp, "sample.audio"))
        wav = os.path.join(tmp, "sample.wav")
        ffmpeg("-i", raw, "-ac", "1", "-ar", "24000", wav)
        log("loading Chatterbox and learning the narrator's voice")
        model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
        model.prepare_conditionals(wav)
        _voice = model
    return _voice


def narrate(text, dest_mp3, language="en"):
    import numpy as np
    import soundfile as sf

    model = voice()
    lines = split_lines(text)
    parts, rate = [], 24000
    for i, line in enumerate(lines, 1):
        if time.monotonic() - STARTED > BUDGET_SECONDS:
            raise RuntimeError(f"time budget used up after {i - 1} of {len(lines)} lines; will retry tomorrow")
        audio = model.generate(line, language_id=language).squeeze(0).numpy()
        rate = model.sr
        expected = max(1.0, len(line.split()) / 2.6)
        if len(audio) / rate < 0.45 * expected:  # stopped early: once more, keep the longer
            again = model.generate(line, language_id=language).squeeze(0).numpy()
            audio = again if len(again) > len(audio) else audio
        if i % 10 == 0:
            log(f"  line {i}/{len(lines)}")
        parts += [audio, np.zeros(int(rate * 0.45), dtype=np.float32)]
    wav = dest_mp3.replace(".mp3", ".wav")
    sf.write(wav, np.concatenate(parts[:-1]), rate)
    ffmpeg("-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-codec:a", "libmp3lame", "-b:a", "96k", dest_mp3)
    return dest_mp3


def upload_narration(signed_url, mp3):
    with open(mp3, "rb") as f:
        r = requests.put(signed_url, data=f, headers={"content-type": "audio/mpeg", "x-upsert": "true"}, timeout=600)
    r.raise_for_status()


# ── Video ────────────────────────────────────────────────────────────────────

def still_video(image, audio, dest):
    if image:
        ffmpeg("-loop", "1", "-i", image, "-i", audio, "-c:v", "libx264", "-tune", "stillimage", "-preset", "veryfast",
               "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
               "-r", "2", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", dest)
    else:
        ffmpeg("-f", "lavfi", "-i", "color=c=0x1e1b4b:s=1280x720:r=2", "-i", audio, "-c:v", "libx264", "-tune", "stillimage",
               "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", dest)
    return dest


# ── YouTube ──────────────────────────────────────────────────────────────────

_token = {"value": None, "at": 0}


def yt_token():
    if _token["value"] and time.time() - _token["at"] < 3000:
        return _token["value"]
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": YT_CLIENT_ID, "client_secret": YT_CLIENT_SECRET,
        "refresh_token": YT_REFRESH_TOKEN, "grant_type": "refresh_token"}, timeout=60)
    r.raise_for_status()
    _token.update(value=r.json()["access_token"], at=time.time())
    return _token["value"]


def yt_upload(path, meta, synthetic):
    body = {
        "snippet": {"title": meta["title"], "description": meta["description"], "tags": meta["tags"], "categoryId": "22"},
        "status": {"privacyStatus": YT_PRIVACY, "selfDeclaredMadeForKids": False, "containsSyntheticMedia": bool(synthetic)},
    }
    size = os.path.getsize(path)
    init = requests.post(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        headers={"authorization": f"Bearer {yt_token()}", "content-type": "application/json; charset=UTF-8",
                 "x-upload-content-type": "video/*", "x-upload-content-length": str(size)},
        data=json.dumps(body), timeout=60)
    init.raise_for_status()
    location = init.headers["location"]
    with open(path, "rb") as f:
        r = requests.put(location, data=f, headers={"authorization": f"Bearer {yt_token()}", "content-type": "video/*"}, timeout=3600)
    r.raise_for_status()
    return r.json()["id"]


def yt_delete(video_id):
    r = requests.delete(f"https://www.googleapis.com/youtube/v3/videos?id={video_id}",
                        headers={"authorization": f"Bearer {yt_token()}"}, timeout=60)
    if r.status_code not in (204, 404):  # 404: already gone
        raise RuntimeError(f"{r.status_code} {r.text[:200]}")


# ── Main ─────────────────────────────────────────────────────────────────────

def process(item, tmp):
    sid = item["storyId"]
    result = {"storyId": sid}
    narration_mp3 = None

    if item.get("narrationText") and item.get("narrationUpload"):
        log(f"{sid}: narrating ({len(item['narrationText'].split())} words)")
        narration_mp3 = narrate(item["narrationText"], os.path.join(tmp, f"{sid}.mp3"))
        upload_narration(item["narrationUpload"]["signedUrl"], narration_mp3)
        result["narrationPath"] = item["narrationUpload"]["path"]
        app_post("/api/share/jobs/result", result)  # the website's Listen tab can use it now
    elif item.get("narrationUrl"):
        narration_mp3 = download(item["narrationUrl"], os.path.join(tmp, f"{sid}.mp3"))

    if not item.get("upload"):
        if item.get("markSkipped"):
            app_post("/api/share/jobs/result", {**result, "youtubeStatus": "skipped"})
        log(f"{sid}: narrated only (test story or already on YouTube)")
        return

    if not (YT_CLIENT_ID and YT_CLIENT_SECRET and YT_REFRESH_TOKEN):
        log(f"{sid}: YouTube credentials not set; leaving it queued")
        return

    image = download(item["imageUrl"], os.path.join(tmp, f"{sid}.jpg")) if item.get("imageUrl") else None
    synthetic = item.get("mediaUrl") is None
    if item["mediaKind"] == "video" and item.get("mediaUrl"):
        video = download(item["mediaUrl"], os.path.join(tmp, f"{sid}.source"))
    elif item.get("mediaUrl"):  # named audio
        audio = download(item["mediaUrl"], os.path.join(tmp, f"{sid}.audio"))
        video = still_video(image, audio, os.path.join(tmp, f"{sid}.mp4"))
    elif narration_mp3:
        video = still_video(image, narration_mp3, os.path.join(tmp, f"{sid}.mp4"))
    else:
        raise RuntimeError("no narration or media to build a video from")

    log(f"{sid}: uploading to YouTube")
    video_id = yt_upload(video, item["youtube"], synthetic)
    app_post("/api/share/jobs/result", {"storyId": sid, "youtubeVideoId": video_id, "youtubeStatus": "uploaded", "error": None})
    log(f"{sid}: uploaded as {video_id}")


def main():
    queue = app_get("/api/share/jobs/queue?limit=10")
    log(f"{len(queue['items'])} stories, {len(queue['removals'])} removals")

    if queue["removals"] and YT_REFRESH_TOKEN:
        for vid in queue["removals"]:
            try:
                yt_delete(vid)
                app_post("/api/share/jobs/removal-result", {"videoId": vid, "ok": True})
                log(f"removed {vid}")
            except Exception as e:  # noqa: BLE001
                app_post("/api/share/jobs/removal-result", {"videoId": vid, "ok": False, "error": str(e)[:500]})

    failures = 0
    for item in queue["items"]:
        if time.monotonic() - STARTED > BUDGET_SECONDS:
            log("time budget used up; the rest waits for tomorrow")
            break
        with tempfile.TemporaryDirectory() as tmp:
            try:
                process(item, tmp)
            except Exception as e:  # noqa: BLE001
                failures += 1
                log(f"{item['storyId']}: failed: {e}")
                # Budget overruns stay pending (retried tomorrow); real errors are marked failed.
                report = {"storyId": item["storyId"], "error": str(e)[:1000]}
                if item.get("upload"):
                    report["youtubeStatus"] = "pending" if "time budget" in str(e) else "failed"
                app_post("/api/share/jobs/result", report)

    try:
        r = requests.post(f"{APP_URL}/api/cron/share-maintenance", headers=HEADERS, timeout=300)
        log(f"maintenance: {r.status_code} {r.text[:200]}")
    except Exception as e:  # noqa: BLE001
        log(f"maintenance failed: {e}")

    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
