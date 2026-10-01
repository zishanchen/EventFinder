const TAG_COLOR_PALETTE = [
  { background: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  { background: '#f0fdfa', border: '#99f6e4', text: '#0f766e' },
  { background: '#fefce8', border: '#fde68a', text: '#a16207' },
  { background: '#fdf2f8', border: '#fbcfe8', text: '#be185d' },
  { background: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
  { background: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
  { background: '#f7fee7', border: '#d9f99d', text: '#4d7c0f' },
  { background: '#fdf4ff', border: '#f5d0fe', text: '#a21caf' }
];

const FIXED_TAG_COLORS = {
  'free food': { background: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  sports: { background: '#ecfccb', border: '#bef264', text: '#3f6212' },
  networking: { background: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  tech: { background: '#eef2ff', border: '#c7d2fe', text: '#4338ca' },
  party: { background: '#fdf2f8', border: '#fbcfe8', text: '#be185d' },
  'study group': { background: '#f0fdfa', border: '#99f6e4', text: '#0f766e' },
  workshop: { background: '#fefce8', border: '#fde68a', text: '#a16207' },
  career: { background: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
  arts: { background: '#faf5ff', border: '#e9d5ff', text: '#9333ea' },
  music: { background: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
  games: { background: '#ecfeff', border: '#a5f3fc', text: '#0e7490' },
  culture: { background: '#fff1f2', border: '#fecdd3', text: '#be123c' },
  outdoor: { background: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  volunteering: { background: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
  entrepreneurship: { background: '#f7fee7', border: '#d9f99d', text: '#4d7c0f' },
  'language exchange': { background: '#fdf4ff', border: '#f5d0fe', text: '#a21caf' },
  wellness: { background: '#ecfdf5', border: '#a7f3d0', text: '#047857' }
};

const hashTagName = (name = '') => {
  return [...String(name)].reduce((sum, character) => {
    return sum + character.charCodeAt(0);
  }, 0);
};

const normalizeTagName = (name = '') => String(name).trim().toLowerCase();

const getTagColors = (name = '') => {
  const fixedColors = FIXED_TAG_COLORS[normalizeTagName(name)];

  if (fixedColors) {
    return fixedColors;
  }

  const paletteIndex = hashTagName(name);

  return TAG_COLOR_PALETTE[Math.abs(paletteIndex) % TAG_COLOR_PALETTE.length];
};

const normalizeTagColors = (tag) => {
  const fallback = getTagColors(tag?.name);
  const colors = tag?.colors || {};

  return {
    background: colors.background || fallback.background,
    border: colors.border || fallback.border,
    text: colors.text || fallback.text
  };
};

const tagDto = (tag) => ({
  _id: tag._id,
  name: tag.name,
  active: tag.active !== false,
  deletedAt: tag.deletedAt || null,
  colors: normalizeTagColors(tag)
});

export {
  FIXED_TAG_COLORS,
  TAG_COLOR_PALETTE,
  getTagColors,
  normalizeTagColors,
  tagDto
};
