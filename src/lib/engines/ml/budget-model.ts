import { DESTINATIONS, type Destination } from "@/data/destinations";

const REGIONS = [
  "north",
  "south",
  "east",
  "west",
  "central",
  "northeast",
  "international",
] as const;
const FEATURE_COUNT = REGIONS.length + 5;
const TRAINING_STEPS = 1800;
const LEARNING_RATE = 0.035;
const REGULARIZATION = 0.002;

function featuresFor(destination: Destination): number[] {
  const averageDuration =
    (destination.ideal_duration_days[0] + destination.ideal_duration_days[1]) / 2;
  return [
    ...REGIONS.map((region) => Number(destination.region === region)),
    destination.crowd_factor,
    averageDuration / 10,
    Math.log1p(destination.approx_flight_inr_from_del) / 10,
    Math.log1p(destination.approx_train_inr_from_del) / 10,
    destination.interests.length / 10,
  ];
}

const trainingRows = DESTINATIONS.map((destination) => ({
  features: featuresFor(destination),
  target: Math.log(destination.cost_per_day_inr),
}));
const means = Array.from(
  { length: FEATURE_COUNT },
  (_, index) =>
    trainingRows.reduce((total, row) => total + row.features[index], 0) / trainingRows.length,
);
const scales = Array.from({ length: FEATURE_COUNT }, (_, index) => {
  const variance =
    trainingRows.reduce((total, row) => total + (row.features[index] - means[index]) ** 2, 0) /
    trainingRows.length;
  return Math.sqrt(variance) || 1;
});
const targetMean = trainingRows.reduce((total, row) => total + row.target, 0) / trainingRows.length;
const targetScale =
  Math.sqrt(
    trainingRows.reduce((total, row) => total + (row.target - targetMean) ** 2, 0) /
      trainingRows.length,
  ) || 1;
const weights = Array<number>(FEATURE_COUNT).fill(0);
let bias = 0;

for (let step = 0; step < TRAINING_STEPS; step++) {
  const weightGradients = Array<number>(FEATURE_COUNT).fill(0);
  let biasGradient = 0;

  for (const row of trainingRows) {
    const normalized = row.features.map((value, index) => (value - means[index]) / scales[index]);
    const target = (row.target - targetMean) / targetScale;
    const prediction =
      bias + normalized.reduce((sum, value, index) => sum + value * weights[index], 0);
    const error = prediction - target;
    biasGradient += error;
    normalized.forEach((value, index) => {
      weightGradients[index] += error * value;
    });
  }

  const sampleCount = trainingRows.length;
  bias -= (LEARNING_RATE * biasGradient) / sampleCount;
  weights.forEach((weight, index) => {
    const gradient = weightGradients[index] / sampleCount + REGULARIZATION * weight;
    weights[index] -= LEARNING_RATE * gradient;
  });
}

function predictLogCost(destination: Destination): number {
  const normalized = featuresFor(destination).map(
    (value, index) => (value - means[index]) / scales[index],
  );
  const standardized =
    bias + normalized.reduce((sum, value, index) => sum + value * weights[index], 0);
  return standardized * targetScale + targetMean;
}

function findDestination(nameOrId: string): Destination | undefined {
  const search = nameOrId.trim().toLocaleLowerCase();
  return DESTINATIONS.find(
    (destination) =>
      destination.id.toLocaleLowerCase() === search ||
      destination.name.toLocaleLowerCase() === search,
  );
}

const inSampleMaeInr =
  trainingRows.reduce((total, row, index) => {
    const prediction = Math.exp(predictLogCost(DESTINATIONS[index]));
    return total + Math.abs(prediction - Math.exp(row.target));
  }, 0) / trainingRows.length;

export function estimateDailyCostInr(destination: Destination): number {
  return Math.max(500, Math.round(Math.exp(predictLogCost(destination))));
}

export function predictDestinationDailyCostInr(nameOrId: string): number {
  const destination = findDestination(nameOrId);
  if (destination) return estimateDailyCostInr(destination);

  const averageCost =
    trainingRows.reduce((total, row) => total + Math.exp(row.target), 0) / trainingRows.length;
  return Math.round(averageCost);
}

export const budgetModelInfo = {
  method: "Ridge-regularized linear regression",
  target: "log daily destination cost (INR)",
  trained_records: trainingRows.length,
  training_mean_absolute_error_inr: Math.round(inSampleMaeInr),
  estimate_note: "Trained on the bundled destination catalog; estimates are not live quotes.",
};
