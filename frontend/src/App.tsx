import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { useState } from "react"

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  if (loading) return <p>Loading...</p>

  const isVideo = (filename: string) => {
    const videoExtensions = ["mp4", "mov", "webm", "ogv"]
    const extension = filename.split(".").pop()?.toLowerCase()
    return extension ? videoExtensions.includes(extension) : false
  }

  const getMediaUrl = (filename: string) => {
    const backendHost = process.env.REACT_APP_GRAPHQL_URI?.split("/graphql")[0] || "http://localhost:4000"
    return `${backendHost}/static/${filename}`
  }

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1>Media Thing</h1>
      <div style={{ display: "flex", height: "100vh" }}>
        <div style={{ width: "30%", borderRight: "1.5px solid #ccc", overflowY: "auto" }}>
          <h2>Files</h2>
          {data && data.files.map((file: File) => (
            <div 
              key={file.id} 
              onClick={() => setSelectedFile(file)} 
              style={{ 
                cursor: "pointer", 
                padding: "10px 15px", 
                borderTop: "1px solid #eee",
                backgroundColor: selectedFile?.id === file.id ? "#e0e0e0" : "transparent"
              }}
            >
              {file.title}
            </div>
          ))}
        </div>
        <div style={{ width: "70%", padding: "0 20px" }}>
          {selectedFile ? (
            <div>
              <h2>{selectedFile.title}</h2>
              <p><strong>ID:</strong> {selectedFile.id}</p>
              <p><strong>User:</strong> {selectedFile.user || "N/A"}</p>
              <p><strong>Filename:</strong> {selectedFile.filename}</p>
              
              {isVideo(selectedFile.filename) ? (
                <div style={{ marginTop: "20px" }}>
                  <h3>Video Player</h3>
                  <video key={selectedFile.id} width="100%" controls autoPlay>
                    <source src={getMediaUrl(selectedFile.filename)} type={`video/${selectedFile.filename.split(".").pop()}`} />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <p style={{ marginTop: "20px", fontStyle: "italic" }}>Select a video file to play.</p>
              )}
            </div>
          ) : (
            <p style={{ textAlign: "center", marginTop: "50px" }}>Select a file from the list to see details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
