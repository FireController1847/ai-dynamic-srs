export type SemanticVersion =
  | `${number}.${number}.${number}`
  | `${number}.${number}.${number}-${string}`;

export const APPLICATION_VERSION = "0.9.1-alpha" satisfies SemanticVersion;
