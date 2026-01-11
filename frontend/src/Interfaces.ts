export interface File {
  id: string;
  title: string;
}

export interface GetFilesResult {
    files: File[]
}