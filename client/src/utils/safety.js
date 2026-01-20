import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';

// NOTE: NudeNet for browser (client-side JS) is currently archived/unmaintained and requires handling large unhosted model files.
// We are using NSFWJS (powered by TensorFlow.js) which is the industry standard for client-side checks.
// It effectively detects "Porn" and "Sexy" content to prevent inappropriate streams.
// We use strict thresholds to minimize risk.

let model = null;
let modelLoadingPromise = null;

export const loadModel = async () => {
    if (model) return model;
    if (modelLoadingPromise) return modelLoadingPromise;

    modelLoadingPromise = (async () => {
        try {
            // Loading the default model (MobileNetV2Mid) which offers good balance of speed and accuracy
            // To use a more accurate but heavier model, you could pass 'InceptionV3' as argument (if hosted)
            console.log("Loading NSFW model...");
            // Ensure tf ready
            await tf.ready();
            model = await nsfwjs.load(); // Loads from default CDN
            console.log("NSFW Model loaded");
            return model;
        } catch (err) {
            console.error("Failed to load NSFW model", err);
            modelLoadingPromise = null;
            return null;
        }
    })();

    return modelLoadingPromise;
};

export const checkImage = async (imgElement) => {
    if (!model) {
        // Try to load silently if not loaded
        await loadModel();
        if (!model) return null;
    }

    try {
        // Classify the image
        const predictions = await model.classify(imgElement);
        return predictions;
    } catch (err) {
        // Often happens if image is 0x0 or uninitialized
        // console.warn("Prediction error (frame likely empty)", err);
        return null;
    }
};

export const isUnsafe = (predictions) => {
    if (!predictions) return false;

    return predictions.some(p => {
        // STRICTER DETECTION RULES
        // 1. Explicit content (Porn/Hentai): Zero tolerance logic
        if (p.className === 'Porn' || p.className === 'Hentai') {
            return p.probability > 0.10; // >15% confidence -> Block
        }
        // 2. Suggestive content (Sexy): Medium threshold
        // "Sexy" usually means swimwear, lingerie, or partial nudity.
        // Lowering this threshold increases safety but might flag more false positives.
        if (p.className === 'Sexy') {
            return p.probability > 0.40; // >45% confidence -> Block
        }
        return false;
    });
};
