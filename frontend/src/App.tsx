import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { useMemo, useState } from "react"

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

  const userCards = useMemo(() => {
    const users = [...new Set(data?.files.map(f => f.user) ?? [])]
    return users.map(user => {
      const images = (data?.files ?? []).filter(f => f.user === user && isImage(f.filename))
      const preview = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : null
      return { user, preview }
    })
  }, [data])

  if (loading) return <div className="empty-state">Loading...</div>

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

  const goHome = () => {
    setSelectedUser(null)
    setSelectedFile(null)
    setExpandedGalleries(new Set())
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1
          className={selectedUser ? "app-title clickable" : "app-title"}
          onClick={selectedUser ? goHome : undefined}
        >
          Media Thing
        </h1>
      </header>

      {!selectedUser ? (
        <div className="landing">
          <div className="user-grid">
            {userCards.map(({ user, preview }) => (
              <div key={user} className="user-card" onClick={() => selectUser(user)}>
                {preview && (
                  <img className="user-card-img" src={getMediaUrl(preview.filename)} alt={user} />
                )}
                <div className="user-card-name">{user}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="app-body">
          <nav className="sidebar">
            <div className="sidebar-heading">Galleries</div>
            <div className="sidebar-list">
              {Object.entries(galleries).map(([title, files]) => {
                const expanded = expandedGalleries.has(title)
                return (
                  <div key={title}>
                    {files.length === 1 ? (
                      <div
                        className={`gallery-header${selectedFile?.id === files[0].id ? " selected" : ""}`}
                        onClick={() => setSelectedFile(files[0])}
                      >
                        {title}
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                )
              })}
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
      )}
    </div>
  )
}
