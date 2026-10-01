export const resizeImageToDataURL = (file, maxWidth = 600, maxHeight = 900, quality = 0.75) => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
            const width = Math.round(img.width * scale);
            const height = Math.round(img.height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);

            const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            resolve(canvas.toDataURL(outputType, quality));
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => 
            reject(new Error('Failed to load image'));
        
        img.src = URL.createObjectURL(file);
    });
};