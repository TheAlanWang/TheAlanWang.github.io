---
layout: layouts/post.njk
title: VLM Rating Pipeline
description: How the YD-AD-VLM-eval pipeline has a VLM review audio descriptions like a QC reviewer, returning timestamped issues across five categories to compare against human raters.
excerpt: Having a VLM review audio descriptions segment by segment and return timestamped issues, not scores, so it can be compared with human raters.
date: 2026-10-12T12:00:00-07:00
category: Projects
subcategory: YouDescribe
topic: AI Pipelines
kind: Project
tags:
  - posts
permalink: /posts/vlm-rating-pipeline/index.html
---
> This post describes YD-AD-VLM-eval as of 2026-08-23.

## Overview
> **What it is.** We use a VLM as an AD reviewer. It watches a video with audio description and finds the problems. Then we compare what it finds with 23 human reviewers.
>
> **Input.** We cut every video into 30-second pieces, and we cut the whole video, even the parts with no description. For each piece, we take **2 frames per second** and put a timestamp on each frame. That way the model knows when things happen.
>
> **Prompt.** The prompt tells the model what good AD looks like and gives it **five types of problems**. It also has rules to stop false alarms. For example, the action can be up to 8 seconds off, and the model has to point to the frames as proof. We also send the whole AD track, the dialogue, and a timeline of the piece. The timeline shows whether each description plays over the video or pauses it. Mixing those two up would have wrongly flagged about 65 descriptions.
>
> **Output.** The model gives back a list of problems, each with a time and a type. It doesn't score each description. This way it can catch descriptions that are missing, and the output looks just like the human data, so we can compare them fairly.
>
> **Tuning.** We tested 2, 3 and 4 frames per second. 2 was just as accurate. With 4, the model flagged almost twice as many problems as the humans did. Each piece also runs on its own, so if one call fails, the rest keep going, and we can pick up where we stopped.

## What the pipeline does
Have a VLM "watch" a video with audio description (AD) the way a professional QC reviewer would, find problems with the AD, and tag each problem with a timestamp and a category. Then compare the issues the VLM finds against the results from 23 human reviewers.

- Repo: YD-AD-VLM-eval (private), code in `pipeline/`
- Models: closed models go through each vendor's API (Anthropic, OpenAI, Google); open models are served with vLLM on an H200 and called through the OpenAI provider (see [⑧ Plugging in open models](#plugging-in-open-models))
- Output: `results/<video>__<provider>.json`, one file per "video × model" pair

```
video file + AD track (text) + dialogue transcript
        ↓
① Segment: one segment every 30 seconds across the whole video, and mark how far each segment's frames extend (windows.py)
        ↓  per segment:
② Extract frames: 2fps, a timestamp on every frame (frames.py, ffmpeg)
③ Build the prompt: system prompt + whole-video data JSON + segment timeline + frames (prompts.py)
④ Call the model with structured output: a list of issues (schemas.py, providers/)
⑤ Clean: validate fields, assign to clips, drop issues outside the segment (run.py)
        ↓
⑥ Aggregate into JSON → export TSV tables for analysis (export_tsv.py)
```

---

## ① Segmenting (`windows.py`)
- **Cover the whole video**: from second 0 to the end, one segment every 30 seconds. Stretches with no AD at all are also segmented and sent to the model; the last segment can be shorter than 30 seconds
	- Why: `under_described` (missing description) happens exactly where there are no clips. Skip those stretches and you can never catch it
- Each clip belongs to exactly one segment: whichever segment its `start_time` falls in judges it, and it is judged only once
- **Mark each segment's `frame_end`** (how far frames extend): this step only computes numbers and never touches the video; the actual frame extraction happens in ②, over `[segment start, frame_end]`
	- Formula: `frame_end = max(segment end + 8, end of the last AD in the segment + 8)`, capped at the video length. "End" means that AD's `end_time`. Only extend forward, never backward
	- Example: segment 2 covers 30–60 seconds, so frames span 30–68 seconds; if a clip starts at 55 seconds and ends at 65, frames extend to 73 seconds
	- Why compute it while segmenting: you need to know which clips are in the segment and when the last one ends, and "which segment a clip belongs to" is decided in exactly this step
	- Why extend: AD usually plays before the action happens, so the evidence often comes after. Without the extension, descriptions near a segment boundary can't find their frames and get misjudged as too early or wrong
	- The extra frames are evidence only: reported issues are still limited to the segment's own range, so the same problem is never counted by two segments

## ② Frame extraction (`frames.py`)
- Extract frames with ffmpeg at 2fps: about 60 frames per 30-second segment, more with the extension; the long side is scaled down to at most 1024px
- **Put a timestamp label before every frame** `[12.5s]`
	- Why: given just a sequence of images, the model has to work out time as "index × interval", which it does poorly, so every timing judgment becomes a guess
- **How images are sent**: each JPEG is converted to base64 text, written as `data:image/jpeg;base64,...`, and placed directly in the request JSON. No separate upload, no URL
	- One request per segment, with the user message in order: segment text → `[30.0s]` → image → `[30.5s]` → image → …
	- Why base64: JSON can only hold text, and images are binary; the conversion makes them about 1/3 larger, which is why we downscale and use JPEG compression
- **2fps**: on video8_ai we compared 2, 3, and 4fps. Precision against the human results was 87%, 86%, and 79%: flat or even worse. 4fps inflated the flag count to 1.9× the humans'. More frames cost more and gain nothing. Also, each vendor's API accepts only about 100 images per request

## ③ Prompt (`prompts.py`)
Each call has three parts:

**A. System prompt (`SYSTEM_PROMPT`)**: has the model play a professional AD quality reviewer
- **AD quality principles**: objective, don't repeat dialogue, prefer inline over extended when possible, less is more
- **Definitions and examples for the 5 issue categories**: every issue must carry one of them, see [The 5 categories](#the-5-categories)
- **Rules against false positives**:
	- Frames are only samples; the description doesn't have to match the frame at `start_time` exactly, compare it against a run of nearby frames
	- ±8 second tolerance: if the action appears within 8 seconds before or after the description, the timing is reasonable; a description slightly ahead of the action is normal "lead-in" narration
	- Before calling `timing` or `not_factual`, check every frame within 8 seconds on either side; flag only if no evidence turns up anywhere in that range, and cite frame timestamps as evidence
	- For extended, only `start_time` counts (the video is paused, so `end_time` isn't real video time)
	- Tell the model explicitly "this segment may have no issues at all", and flag only clear departures from good AD practice

**B. Whole-video data JSON (`build_video_context`)**: every call carries all of the video's AD and dialogue
- Why send all of it: text is far cheaper than images. The longest video's full AD track is about 1.8k tokens, less than two frames. And this block is identical for every call on the same video, so it works as a fixed prompt-cache prefix
- For videos with no dialogue transcript (3 of them), we mark `dialogue: null` with a note, so the model doesn't read an empty list as "nobody speaks"

**C. Segment timeline (`_timeline`)**: what the viewer actually experiences, in chronological order
```
[10.2s-12.8s] DIALOGUE: "Where are you going?"
[13.0s-15.1s] AD #4 INLINE (2.1s, Visual) - plays over the running video
          "She grabs her coat and heads for the door."
[22.0s] AD #5 EXTENDED (3.4s, Visual) - VIDEO PAUSES here, resumes from this frame
[24.0s-29.5s] -- no description for 5.5s --
```
- Inline and extended are labeled explicitly: confusing the two would wrongly flag about 65 descriptions for timing, see [Why inline and extended must be kept apart](#why-inline-and-extended-must-be-kept-apart)
- Gaps of 3 seconds or more with no description get their own line, hinting that a description may be needed there. The median gap between descriptions is 1.6 seconds; shorter gaps are left out, or they'd drown the important information
- The last AD before the segment and the first AD after it are attached as context: otherwise a segment whose first 20 seconds have no description looks like missing description, when the previous segment's description may still be playing

<h3 id="why-inline-and-extended-must-be-kept-apart">Why inline and extended must be kept apart</h3>

- **Inline**: plays over the running video. `[start, end]` is real video time, so overlapping dialogue is a real conflict
- **Extended**: the video pauses at `start_time` and resumes after the description finishes, so `end_time` is just bookkeeping and "overlap" with dialogue means nothing
- Evidence from the data: inline descriptions never overlap each other (0/135), while extended ones overlap in 39/76 cases, which shows extended `end_time` isn't real video time. 66% of extended descriptions nominally overlap dialogue, versus only 6% of inline ones; treating that as conflict would wrongly flag about 65 descriptions that are fine
- What actually matters for extended is the pause point: 42 extended descriptions pause in the middle of a sentence

## ④ Output format (`schemas.py`): return a list of issues
```json
{ "issues": [
  { "timestamp": 13.0,
    "category": "not_factual",
    "clip_index": 4,            // index into the whole video's AD; null for missing description
    "evidence": "Frames [13.0s]-[16.5s] show him, not her, at the door",
    "rationale": "The description names the wrong person." }
]}
```
- **Why a list of issues instead of "one verdict per clip"**:
	1. `under_described` can happen where there is no clip at all, and a per-clip format has nowhere to put it
	2. The human review data is also "timestamped flags". With the same output shape, both sides go through the same assignment logic, which keeps the comparison fair

<h3 id="the-5-categories">The 5 categories</h3>

**What they are**: the 5 kinds of problems AD can have. Every issue the model finds must carry one of them.

**Where they live**: all 5 definitions and examples are written in the system prompt (`SYSTEM_PROMPT` in `prompts.py`) and sent with every call. The text is the same every time, so it's part of the cacheable fixed prefix.

**How we keep the model to these 5**:
- The prompt says "Only use the categories below"
- The output format locks `category` to these 5 names (the `enum` in `schemas.py`); any other name fails format validation

**What the prompt says for each category** (`A → B`: A is the name in the prompt, B is the key in the human data; ⑤ maps it back during cleaning)

| Category | One-line definition | Examples listed in the prompt |
| --- | --- | --- |
| `over_described` | The AD says more than the moment needs | Too much detail; repeats what the dialogue already makes clear; repeats what another AD already described; wordy phrasing |
| `under_described` | Visual information that should be described is missing | Misses an important action, person, object, or visual change; misses spatial or background information; misses on-screen text; an important moment has no description at all; mentions an event but leaves out details needed to understand it |
| `timing_conflict` → `timing` | In the wrong place, or clashing with dialogue | Clearly too early or too late for the action; inline overlaps dialogue or doesn't fit the gap; inline has too much content to fit and should be extended; uses extended when it isn't needed; uses inline when it should be extended |
| `not_factual` | Gets something wrong, or adds interpretation the frames don't support | Wrong person, object, action, location, direction, color, count, etc.; describes something that isn't there; gets the event wrong; gets spatial relationships wrong; asserts thoughts, motives, or emotions without visual grounding |
| `mismatched_tone` → `tone` | Wording, grammar, or style unsuited to professional AD, or out of step with the video's content and mood | Clashes with the scene, genre, audience, or mood; overly technical or difficult wording; awkward or unclear phrasing; grammar errors; inconsistent tense; fragments where a full sentence is needed; passive voice where active is needed |

A few categories carry extra rules in the prompt:
- `under_described`: tag the issue at roughly the time the description should have started (there's no clip to attach it to)
- `timing_conflict`: judge inline by `start_time` and `end_time`, extended by `start_time` only; anything within ±8 seconds counts as reasonable timing; before calling too early or too late, check every frame from the start of the description to 8 seconds after it ends, flag only if the action is nowhere in that span, and cite frame timestamps
- `not_factual`: compare against a run of nearby frames, not just the frame at `start_time`; before calling it, check every frame within 8 seconds on either side, flag only if no support turns up, and cite the timestamps of the frames checked

(Most of the "rules against false positives" in ③ live under these categories.)

- **The 6th category, `technical` (TTS glitches, audio dropouts), is not given to the model**: the model has no audio, only frames and text, so it can't judge this category. The human side keeps it; the model side always records 0

### How structured output works
- **Define the format**: `SEGMENT_SCHEMA` in `schemas.py` requires `{"issues": [...]}`, with all 5 fields required on each issue and no extras; `category` is locked to the 5 categories with an `enum`
- **Send it with the request**, which each vendor takes differently: OpenAI and vLLM use `response_format` (`json_schema`, `strict: true`); Anthropic uses `output_config`; Google uses `response_schema`
- **Fallback**: if OpenAI or Google rejects the request with the schema, resend without it and ask at the end of the prompt to "output only JSON of this shape"; if the response has other text mixed in, pull out the largest `{...}` and parse that (`extract_json`); if that still fails, record the segment as unanswered
- Anthropic has no fallback, but we check whether the output was truncated by `max_tokens` and raise an error if so, so half a JSON object never slips through
- Finally, ⑤ validates each issue field by field, which is the safety net for fallback responses

## ⑤ Cleaning and assignment (`run.py` → `clean_issue`)
For every issue the model returns:
1. Check that `timestamp` is a number and `category` is valid; drop anything that fails
2. Map category names back to the human data's keys (`timing_conflict` → `timing`)
3. **Which clip it belongs to**: use the model's `clip_index` if valid; also snap the timestamp to the nearest clip (`assign_clip`, the same function used for human flags), and record both results for comparison
4. **`in_segment`**: issues whose timestamp falls outside the segment aren't counted, to prevent double counting

## ⑥ Fault tolerance and resuming
- **Each segment gets its own try/except**: a full run is about 150 calls per provider. If one rate limit or dropped connection crashed the whole job, none of the remaining videos would run. A failed segment loses only itself, recorded as `responded: false` with the reason
- **`--resume`**: a rerun skips segments that already have answers and fills in only the failed ones; if the config changed (a different fps, say), old results are discarded
- **Tell "no problems" apart from "no answer"**: when rolling up per clip, judged with no issues → `flags: []`; its segment's call failed → `flags: null`. **null must never be read as "no problems"**; when computing flag rates, the denominator counts only clips that actually got an answer

## ⑦ Output file
- `segments[]`: the raw issues returned for each segment
- `clips[]`: flags rolled up per clip (for the clip-matrix analysis)
- `gap_issues[]`: issues at moments with no description (mostly under_described)
- Model and config metadata, and token usage for every call
- **TSV export**: `export_tsv.py` flattens the JSON into TSV tables for downstream analysis. The main one is `issues.tsv`, one row per issue, used for Kendall τb and heatmaps; missing descriptions appear only in this file
	- TSV (Tab-Separated Values): a plain-text table, one record per line, columns separated by tabs. Same idea as CSV, which uses commas; evidence, rationale, and AD text are full of commas, so TSV avoids escaping

## ⑧ Plugging in open models
- Runs on a single H200 (141GB VRAM); each GPU session is about 2 hours and runs one model. The open models are MiMo-VL-7B, InternVL3.5-38B, and GLM-4.5V-FP8
- **vLLM exposes an OpenAI-compatible API**: point `OPENAI_BASE_URL` at localhost and reuse the OpenAI provider as is, without changing a line of pipeline code
- Issues: MiMo's and InternVL's context limits were set too low, so we raised them to the models' real limits; InternVL's `max_dynamic_patch` parameter crashes on vLLM's video path, so we removed it; GLM-4.5V left 47.5% of segments unanswered because of context overflow, which we recorded and flagged as is

---

## Recap
1. **What it does**: has a VLM act as an AD quality reviewer that finds problems (instead of scoring) and returns a list of issues with timestamp, category, and evidence
2. **Flow**: 30-second segments covering the whole video → 2fps frames, each with a timestamp → prompt = system rules + whole-video AD and dialogue + segment timeline → structured issue output → clean and assign to clips → aggregate
3. **5 categories**: over_described / under_described / timing / not_factual / tone; technical isn't given to the model because it can't hear audio
4. **Key design choices**:
	- Output a list of issues → can express missing descriptions, and matches the shape of the human data
	- Extend frames 8 seconds forward → AD usually plays before the action
	- Separate inline and extended → extended pauses the video, so its end_time isn't real time
	- ±8 second tolerance, mandatory frame-timestamp citations → fewer false positives
5. **Why 2fps**: precision 87% / 86% / 79% (2, 3, 4fps), and 4fps produced 1.9× as many flags as the human reviewers
6. **Engineering**: per-segment fault tolerance; `--resume` to pick up where a run left off; null vs [] separates no answer from no problems; one shared logic across vendors; open models go through vLLM's OpenAI-compatible API

## Follow-up questions
1. How do you get a VLM to score AD?
	- It doesn't score, it finds problems: for each 30-second segment, give it frames (with timestamps), the whole video's AD and dialogue, and the segment timeline, and have it return a list of issues with timestamps and categories
2. Why output a list of **issues** instead of **scoring** each clip?
	- Missing descriptions happen where there are no clips; and the human data is also timestamped flags, so a matching shape is what makes the comparison fair
3. Why **30-second segments** and **2fps**?
	- In testing, 2fps and 4fps had about the same precision, and 4fps produced 1.9× as many flags as the human reviewers. 30 seconds at 2fps is 60 frames, and with the 8 extra seconds of frames that stays under the roughly 100-image limit per API request
4. Why segment the whole video, including parts with no AD?
	- Otherwise the parts with no description are never judged, and missing descriptions can never be found
5. How are clips near segment boundaries handled?
	- Each clip belongs to one segment only; frames extend 8 seconds forward as evidence, because AD usually plays before the action
6. Why send the whole video's AD and dialogue every time?
	- Text is cheap (about 1.8k tokens), it provides context, and it works as a prompt-cache prefix
7. Why do **inline** and **extended** need special handling?
	- Extended pauses the video, so its end_time isn't real time; treating it as conflict would wrongly flag about 65 descriptions
8. How do you reduce **false positives**?
	- ±8 second **tolerance**; check every nearby frame before deciding; cite frame timestamps as evidence; tell the model explicitly "this segment may have no problems"
9. How do you keep the output format **stable**?
	- Send a **JSON Schema** with the request so the model service enforces the format; when OpenAI or Google rejects it, fall back to asking for JSON in the prompt; finally, validate every issue field by field
10. What happens when a call fails?
	- Each segment catches its own exceptions and records them; `--resume` fills in only the failed segments; null vs [] separates no answer from no problems
11. How are results handed to analysis?
	- export_tsv.py flattens the JSON into TSV, mainly `issues.tsv` with one row per issue; unanswered segments are marked separately, never treated as no problems
12. How do you **control cost**?
	- fps and segment length are the main cost knobs; 
	- text goes in the **cacheable** prefix; 
	- before a full run, check the call count and try a few segments first
