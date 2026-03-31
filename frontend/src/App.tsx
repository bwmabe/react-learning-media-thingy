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
  const backendHost = import.meta.env.VITE_GRAPHQL_URI?.split("/graphql")[0] || "http://localhost:4000"
  return `${backendHost}/static/${filename}`
}

export const App: React.FC = () => {
  const { loading, data } = useQuery<GetFilesResult>(GET_FILES)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expandedGalleries, setExpandedGalleries] = useState<Set<string>>(new Set())

  if (loading) return <div className="empty-state">Loading...</div>

  const users = [...new Set(data?.files.map(f => f.user) ?? [])]

  const userFiles = (data?.files ?? []).filter(f => f.user === selectedUser)

  const galleries = userFiles.reduce<Record<string, File[]>>((acc, file) => {
    if (!acc[file.title]) acc[file.title] = []
    acc[file.title].push(file)
    return acc
  }, {})

  const toggleGallery = (title: string) => {
    setExpandedGalleries(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const selectUser = (user: string) => {
    setSelectedUser(user)
    setSelectedFile(null)
    setExpandedGalleries(new Set())
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Media Thing</h1>
      </header>
      <div className="app-body">
        <nav className="sidebar">
          <div className="sidebar-heading">Users</div>
          <div className="sidebar-list">
            {users.map(user => (
              <div
                key={user}
                className={`sidebar-item${selectedUser === user ? " selected" : ""}`}
                onClick={() => selectUser(user)}
              >
                {user}
              </div>
            ))}
          </div>
        </nav>

        {selectedUser && (
          <nav className="sidebar">
            <div className="sidebar-heading">Galleries</div>
            <div className="sidebar-list">
              {Object.entries(galleries).map(([title, files]) => {
                const expanded = expandedGalleries.has(title)
                return (
                  <div key={title}>
                    <div className="gallery-header" onClick={() => toggleGallery(title)}>
                      <span className={`gallery-toggle${expanded ? " expanded" : ""}`}>▶</span>
                      {title}
                    </div>
                    {expanded && files.map(file => (
                      <div
                        key={file.id}
                        className={`gallery-file${selectedFile?.id === file.id ? " selected" : ""}`}
                        onClick={() => setSelectedFile(file)}
                      >
                        {file.filename.split("/").pop()}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </nav>
        )}

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
            <div className="empty-state">
              {selectedUser ? "Select a file to view it" : "Select a user to browse galleries"}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
