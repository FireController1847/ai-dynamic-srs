export type SemanticVersion =
  | `${number}.${number}.${number}`
  | `${number}.${number}.${number}-${string}`;

export const APPLICATION_VERSION = "0.3.0-alpha" satisfies SemanticVersion;
