const formatRating = (value, fallback = '5.0') => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return numericValue.toFixed(1);
};

export { formatRating };
