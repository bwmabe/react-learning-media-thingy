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

export interface Thumb {
  user: string
  filename: string
}

export interface GetThumbsResult {
  thumbs: Thumb[]
}