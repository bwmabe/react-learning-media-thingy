export interface File {
  id: string
  title: string
  user: string
  filename: string
  published: string
}

export interface GetFilesResult {
  files: File[]
}

export interface GetUsersResult {
  users: string[]
}
