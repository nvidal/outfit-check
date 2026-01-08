# Model Benchmark Results (Local)

**Date:** 2026-01-08
**Test Image:** Editor Style (Complex fashion image)
**Task:** Analyze + Search (Google Retrieval) + JSON Output

## Final Status (Optimized)
| Model | Time | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Gemini 2.5 Flash Image** | **~9-10s** | ✅ Success | Optimized Prompt + JSON Mode. Default. |
| **Gemini 2.5 Flash Lite** | **~8.7s** | ✅ Success | Fastest, but 'Image' model preferred for quality. |
| **Gemini 2.0 Flash Exp** | ~10-11s | ✅ Success | Previous Baseline. |

## Optimizations Applied
- **Conditional Search:** Prompt modified to prioritize internal knowledge over Google Search unless verifying specific trends.
- **JSON Mode:** Enforced `responseMimeType: "application/json"` for cleaner, faster output.
- **Token Limit:** Set `maxOutputTokens: 2500` to prevent runaway generation.
- **Box Normalization:** Auto-scaling of bounding boxes enabled.

## Recommendations
- **Gemini 2.5 Flash Image** is the best balance of Speed and Quality for this multimodal task.
- **Gemini 2.5 Flash Lite** is a viable backup if extreme speed is needed.