export interface SerializeInput {
  originalName: string;
  originalPath: string;
  ext: string;
  baseWithoutExt: string;
  originalFull: string;
  datePart: Date | null;
  number: number;
}

export interface SerializeEntry {
  originalName: string;
  finalName: string;
  existsInDest: boolean;
}
