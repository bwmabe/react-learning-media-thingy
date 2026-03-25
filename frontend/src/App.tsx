import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { useState } from "react"

import { File, GetFilesResult } from "./Interfaces"
import "./App.css"

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

const isVideo = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase()
  return ext ? ["mp4", "mov", "webm", "ogv"].includes(ext) : false
}

const isImage = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase()
  return ext ? ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext) : false
}

const getMediaUrl = (filename: string) => {
  const backendHost = process.env.REACT_APP_GRAPHQL_URI?.split("/graphql")[0] || "http://localhost:4000"
  return `${backendHost}/static/${filename}`
}

export const App: React.FC = () => {
  const { loading, data } = useQuery<GetFilesResult>(GET_FILES)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  if (loading) return <div className="empty-state">Loading...</div>

  return (
    <div className="app">
      <header className="app-header">
        <h1>Media Thing</h1>
      </header>
      <div className="app-body">
        <nav className="sidebar">
          <div className="sidebar-heading">Files</div>
          <div className="sidebar-list">
            {data?.files.map((file: File) => (
              <div
                key={file.id}
                className={`sidebar-item${selectedFile?.id === file.id ? " selected" : ""}`}
                onClick={() => setSelectedFile(file)}
              >
                {file.title}
              </div>
            ))}
          </div>
        </nav>
        <main className="main">
          {selectedFile ? (
            <>
              <h2 className="media-title">{selectedFile.title}</h2>
              <div className="media-player">
                {isVideo(selectedFile.filename) ? (
                  <video key={selectedFile.id} controls playsInline>
                    <source
                      src={getMediaUrl(selectedFile.filename)}
                      type={`video/${selectedFile.filename.split(".").pop()}`}
                    />
                  </video>
                ) : isImage(selectedFile.filename) ? (
                  <img src={getMediaUrl(selectedFile.filename)} alt={selectedFile.title} />
                ) : null}
              </div>
              <div className="media-meta">
                <div className="media-meta-row"><strong>ID:</strong> {selectedFile.id}</div>
                <div className="media-meta-row"><strong>User:</strong> {selectedFile.user || "N/A"}</div>
                <div className="media-meta-row"><strong>File:</strong> {selectedFile.filename}</div>
              </div>
            </>
          ) : (
            <div className="empty-state">Select a file to view it</div>
          )}
        </main>
      </div>
    </div>
  )
}
