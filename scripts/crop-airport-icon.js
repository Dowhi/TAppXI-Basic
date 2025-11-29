import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const cropAndResizeImage = async () => {
    const sourcePath = path.join(publicDir, 'airplane-source.png');
    const outputPath = path.join(publicDir, 'airport-icon.png');

    if (!fs.existsSync(sourcePath)) {
        console.error('❌ Source image not found:', sourcePath);
        process.exit(1);
    }

    // Load the original image
    const image = await loadImage(sourcePath);

    // Create a temporary canvas with the original size
    const tempCanvas = createCanvas(image.width, image.height);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(image, 0, 0);

    // Get image data to find the bounding box
    const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;

    let minX = image.width;
    let minY = image.height;
    let maxX = 0;
    let maxY = 0;

    // Find the bounding box of non-transparent pixels
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const alpha = data[(y * image.width + x) * 4 + 3];
            if (alpha > 10) { // Not fully transparent
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // Add a small padding (5% of the size)
    const padding = Math.floor(Math.max(maxX - minX, maxY - minY) * 0.05);
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(image.width, maxX + padding);
    maxY = Math.min(image.height, maxY + padding);

    const croppedWidth = maxX - minX;
    const croppedHeight = maxY - minY;

    console.log(`Original size: ${image.width}x${image.height}`);
    console.log(`Cropped size: ${croppedWidth}x${croppedHeight}`);
    console.log(`Bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY})`);

    // Create the final canvas with the cropped size
    const finalCanvas = createCanvas(croppedWidth, croppedHeight);
    const finalCtx = finalCanvas.getContext('2d');

    // Draw the cropped portion
    finalCtx.drawImage(
        image,
        minX, minY, croppedWidth, croppedHeight,
        0, 0, croppedWidth, croppedHeight
    );

    // Save the cropped image
    const buffer = finalCanvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Cropped and saved to ${outputPath}`);
};

cropAndResizeImage().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
