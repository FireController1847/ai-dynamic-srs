export type SemanticVersion =
  | `${number}.${number}.${number}`
  | `${number}.${number}.${number}-${string}`;

export const APPLICATION_VERSION = "0.11.0-alpha" satisfies SemanticVersion;
