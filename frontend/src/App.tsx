import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"

import { File, GetFilesResult } from "./Interfaces"

const GET_FILES = gql`
  query GetFiles($filter: String) {
    files(filter: $filter) {
      id
      title
      user
      filename
    }
  }
`

export const App: React.FC = () => {
  const { loading, data } = useQuery<GetFilesResult>(GET_FILES)

  if (loading) return <p>Loading...</p>

  return (
    <div>
      {data && data.files.map((file: File) => (
        <div key={file.id}>{file.title}</div>
      ))}
    </div>
  )
}