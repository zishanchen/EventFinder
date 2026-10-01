export const MAX_AVATAR_FILE_SIZE = 1.5 * 1024 * 1024;
export const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const ACCEPTED_AVATAR_INPUT_TYPES = "image/png,image/jpeg,image/webp";

// TODO: In the future, upload avatar images to storage and store only a URL or file reference instead of a base64 data URL.
export const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the selected image."));
        reader.readAsDataURL(file);
    });
};

export const validateAvatarFile = (file) => {
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
        return "Please choose a PNG, JPG, or WebP image.";
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
        return "Please choose an image under 1.5 MB.";
    }

    return "";
};

export const getFirstWordInitial = (name = "", fallback = "H") => {
    const firstWord = String(name).trim().split(/\s+/).find(Boolean);
    return firstWord ? firstWord[0].toUpperCase() : fallback;
};
