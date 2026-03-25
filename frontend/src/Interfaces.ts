export interface File {
  id: string
  title: string
  user: string
  filename: string
}

export interface GetFilesResult {
  files: File[]
}