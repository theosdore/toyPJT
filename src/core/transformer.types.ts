export interface ReplacementConfig {
  find: string;
  replace: string;
}

export interface TextOperationSettings {
  lowercase?: boolean;
  uppercase?: boolean;
  titleCase?: boolean;
  trimWhitespace?: boolean;
  spaceToUnderscore?: boolean;
  replaceWith?: ReplacementConfig[];
  prefix?: string;
  suffix?: string;
  deleteText?: string;
  changeExtension?: string;
}
