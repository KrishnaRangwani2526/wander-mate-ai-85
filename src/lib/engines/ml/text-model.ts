export type TextVector = Map<string, number>;

export interface TfidfModel {
  vocabularySize: number;
  transform: (text: string) => TextVector;
  similarity: (left: string, right: string) => number;
}

function tokens(text: string): string[] {
  return (
    text
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((token) => token.length > 1) ?? []
  );
}

export function trainTfidfModel(documents: string[]): TfidfModel {
  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    for (const token of new Set(tokens(document))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const inverseDocumentFrequency = new Map(
    [...documentFrequency].map(([token, frequency]) => [
      token,
      Math.log((documents.length + 1) / (frequency + 1)) + 1,
    ]),
  );

  const transform = (text: string): TextVector => {
    const counts = new Map<string, number>();
    for (const token of tokens(text)) counts.set(token, (counts.get(token) ?? 0) + 1);

    const vector = new Map<string, number>();
    for (const [token, count] of counts) {
      const idf = inverseDocumentFrequency.get(token);
      if (idf != null) vector.set(token, (1 + Math.log(count)) * idf);
    }
    return vector;
  };

  return {
    vocabularySize: inverseDocumentFrequency.size,
    transform,
    similarity(left, right) {
      const a = transform(left);
      const b = transform(right);
      let dot = 0;
      let normA = 0;
      let normB = 0;
      for (const value of a.values()) normA += value * value;
      for (const value of b.values()) normB += value * value;
      for (const [token, value] of a) dot += value * (b.get(token) ?? 0);
      return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
    },
  };
}
