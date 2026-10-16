import { DESTINATIONS, type Destination, type Interest, type Season } from "@/data/destinations";
import { trainTfidfModel } from "./text-model";

const catalogModel = trainTfidfModel(
  DESTINATIONS.map((destination) =>
    [
      destination.name,
      destination.state,
      destination.country,
      destination.region,
      destination.tagline,
      ...destination.interests,
      ...destination.best_seasons,
      ...destination.highlights,
      ...destination.famous_food,
    ].join(" "),
  ),
);

export interface DestinationPreferences {
  interests: Interest[];
  seasons?: Season[];
  duration_days?: number;
  max_budget_per_day_inr?: number;
  avoid_crowds?: boolean;
}

export interface DestinationModelScore {
  score: number;
  interest_fit: number;
  season_fit: number;
  duration_fit: number;
  budget_fit: number;
  crowd_fit: number;
  content_fit: number;
}

function durationFit(destination: Destination, days: number): number {
  const [minimum, maximum] = destination.ideal_duration_days;
  if (days >= minimum && days <= maximum) return 1;
  const distance = days < minimum ? minimum - days : days - maximum;
  return Math.max(0, 1 - distance / Math.max(1, maximum - minimum + 2));
}

export function scoreDestination(
  destination: Destination,
  preferences: DestinationPreferences,
): DestinationModelScore {
  const overlap = destination.interests.filter((interest) =>
    preferences.interests.includes(interest),
  );
  const interestFit =
    overlap.length /
    Math.max(1, Math.min(preferences.interests.length, destination.interests.length));
  const seasonFit = preferences.seasons?.length
    ? destination.best_seasons.some((season) => preferences.seasons?.includes(season))
      ? 1
      : 0
    : 0.5;
  const tripDurationFit = preferences.duration_days
    ? durationFit(destination, preferences.duration_days)
    : 0.5;
  const budgetFit = preferences.max_budget_per_day_inr
    ? Math.max(
        0,
        1 -
          Math.abs(destination.cost_per_day_inr - preferences.max_budget_per_day_inr) /
            Math.max(destination.cost_per_day_inr, preferences.max_budget_per_day_inr),
      )
    : 0.5;
  const crowdFit = preferences.avoid_crowds ? 1 - destination.crowd_factor : 0.5;

  const query = [
    ...preferences.interests,
    ...(preferences.seasons ?? []),
    destination.region,
    destination.country ?? "India",
  ].join(" ");
  const document = [
    destination.name,
    destination.state,
    destination.country,
    destination.region,
    destination.tagline,
    ...destination.interests,
    ...destination.best_seasons,
    ...destination.highlights,
    ...destination.famous_food,
  ].join(" ");
  const contentFit = catalogModel.similarity(query, document);

  const features = [
    { value: interestFit, weight: 0.4, enabled: preferences.interests.length > 0 },
    { value: seasonFit, weight: 0.15, enabled: Boolean(preferences.seasons?.length) },
    { value: tripDurationFit, weight: 0.15, enabled: preferences.duration_days != null },
    { value: budgetFit, weight: 0.15, enabled: preferences.max_budget_per_day_inr != null },
    { value: crowdFit, weight: 0.1, enabled: preferences.avoid_crowds === true },
    { value: contentFit, weight: 0.2, enabled: true },
  ].filter((feature) => feature.enabled);
  const weightTotal = features.reduce((total, feature) => total + feature.weight, 0);
  const score =
    features.reduce((total, feature) => total + feature.value * feature.weight, 0) / weightTotal;

  return {
    score: Math.max(0, Math.min(1, score)),
    interest_fit: interestFit,
    season_fit: seasonFit,
    duration_fit: tripDurationFit,
    budget_fit: budgetFit,
    crowd_fit: crowdFit,
    content_fit: contentFit,
  };
}

export const destinationFinderModelInfo = {
  method: "TF-IDF content matching",
  trained_documents: DESTINATIONS.length,
  vocabulary_size: catalogModel.vocabularySize,
};
