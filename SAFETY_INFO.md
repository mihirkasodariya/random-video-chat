# Why we use NSFWJS instead of NudeNet

You requested **NudeNet**, which is an excellent library for local detection. However, NudeNet is written in **Python** and is designed to run on a **Server**.

## Privacy & Safety Constraint
Your requirements stated:
1.  **"Implement client-side video analysis"**
2.  **"Do NOT store or upload video frames"**
3.  **"Video/Audio must never pass through Node.js server"**

## The Problem with NudeNet
To use NudeNet, we would have to:
1.  Capture video frames in the browser.
2.  **Upload** them to a Python backend server.
3.  Process them (slow).
4.  Send the result back.

This violates the privacy requirement (uploading user video) and introduces massive latency (laggy video).

## The Solution: NSFWJS (TensorFlow.js)
We use `nsfwjs`, which is the industry standard for **Client-Side** detection.
-   It runs **100% in your browser**.
-   No video ever leaves the user's device.
-   It is fast (Real-time).

## Strict Configuration
I have configured `nsfwjs` with **Ultra-Strict** settings:
-   **Explicit Content**: Blurs if confidence > **15%** (Very strict)
-   **Suggestive Content**: Blurs if confidence > **50%**

I have added an overlay to the video so you can see the detection scores in real-time.
