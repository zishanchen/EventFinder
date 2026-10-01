const DEFAULT_USER_RATING = 5.0;

const roundToOneDecimal = (value) => {
  return Math.round(value * 10) / 10;
};

const getRatingValue = (rating) => {
  return Number(typeof rating === 'number' ? rating : rating?.rating);
};

const calculateAverageRating = (ratings = []) => {
  const ratingValues = ratings
    .map(getRatingValue)
    .filter((rating) => Number.isFinite(rating));

  if (ratingValues.length === 0) {
    return DEFAULT_USER_RATING;
  }

  const average = ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length;
  return roundToOneDecimal(average);
};

export { DEFAULT_USER_RATING, calculateAverageRating, roundToOneDecimal };
