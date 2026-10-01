const FALLBACK_TAG_COLORS = {
    background: '#f3e8ff',
    border: '#d8b4fe',
    text: '#6d28d9'
};

const getTagName = (tag) => {
    return typeof tag === 'string' ? tag : tag?.name || '';
};

const getTagColors = (tag) => {
    return tag?.colors || FALLBACK_TAG_COLORS;
};

const tagStyle = (tag) => {
    const colors = getTagColors(tag);

    return {
        '--tag-bg': colors.background,
        '--tag-border': colors.border,
        '--tag-text': colors.text
    };
};

const normalizeTag = (tag) => ({
    name: getTagName(tag),
    colors: getTagColors(tag)
});

export {
    FALLBACK_TAG_COLORS,
    getTagColors,
    getTagName,
    normalizeTag,
    tagStyle
};
