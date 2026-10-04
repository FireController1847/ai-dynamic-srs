export type SemanticVersion =
  | `${number}.${number}.${number}`
  | `${number}.${number}.${number}-${string}`;

export const APPLICATION_VERSION = "0.5.3-alpha" satisfies SemanticVersion;
