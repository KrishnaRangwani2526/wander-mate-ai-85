import { DESTINATIONS, type Destination } from "@/data/destinations";
import { trainTfidfModel } from "./text-model";

const activityDocuments = DESTINATIONS.flatMap((destination) => [
  ...destination.highlights.map(
    (highlight) => `${highlight} ${destination.tagline} ${destination.interests.join(" ")}`,
  ),
  ...destination.famous_food.map(
    (food) =>
      `${food} local food cuisine dish ${destination.tagline} ${destination.interests.join(" ")}`,
  ),
]);
const activityModel = trainTfidfModel(activityDocuments);

export interface RankedActivities {
  highlights: string[];
  foods: string[];
  matchedPreferences: string[];
}

function rankItems(
  destination: Destination,
  items: string[],
  preferences: string[],
  dislikes: string[],
  context: string,
): string[] {
  const liked = preferences.join(" ");
  const disliked = dislikes.join(" ");
  return items
    .map((item, index) => {
      const document = `${item} ${context} ${destination.tagline} ${destination.interests.join(" ")}`;
      const relevance = activityModel.similarity(liked, document);
      const aversion = activityModel.similarity(disliked, document);
      return { item, index, score: relevance - aversion };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ item }) => item);
}

export function rankItineraryActivities(
  destination: Destination,
  likes: string[] = [],
  dislikes: string[] = [],
): RankedActivities {
  const normalizedLikes = likes.map((preference) => preference.trim()).filter(Boolean);
  const normalizedDislikes = dislikes.map((preference) => preference.trim()).filter(Boolean);
  const highlights = rankItems(
    destination,
    destination.highlights,
    normalizedLikes,
    normalizedDislikes,
    "attraction sightseeing activity",
  );
  const foods = rankItems(
    destination,
    destination.famous_food,
    normalizedLikes,
    normalizedDislikes,
    "food cuisine restaurant meal dish",
  );

  const matchedPreferences = normalizedLikes.filter((preference) =>
    [...highlights, ...foods].some(
      (item) =>
        activityModel.similarity(preference, item) > 0 ||
        item.toLocaleLowerCase().includes(preference.toLocaleLowerCase()),
    ),
  );

  return { highlights, foods, matchedPreferences };
}

export const itineraryModelInfo = {
  method: "TF-IDF activity preference ranking",
  trained_documents: activityDocuments.length,
  vocabulary_size: activityModel.vocabularySize,
};
