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
  return ext ? ["mp4", "m4v", "mov", "webm", "ogv"].includes(ext) : false
}

const isImage = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase()
  return ext ? ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext) : false
}

const getMediaUrl = (filename: string) => {
  const backendHost = import.meta.env.VITE_GRAPHQL_URI?.split("/graphql")[0] || "http://localhost:4000"
  return `${backendHost}/static/${filename}`
}

const videoMimeType = (filename: string) =>
  filename.endsWith(".mov") ? "video/quicktime" : "video/mp4"

export const App: React.FC = () => {
  const { loading, data } = useQuery<GetFilesResult>(GET_FILES)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expandedGalleries, setExpandedGalleries] = useState<Set<string>>(new Set())
  const [fullscreen, setFullscreen] = useState(false)
  const [fsUiVisible, setFsUiVisible] = useState(false)

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

  // Flat ordered list of all files across galleries for prev/next navigation
  const fileNav = Object.entries(galleries).flatMap(([galleryTitle, files]) =>
    files.map((file, i) => ({
      file,
      galleryTitle,
      isFirstInGallery: i === 0,
      isLastInGallery: i === files.length - 1,
    }))
  )

  const currentNavIndex = fileNav.findIndex(e => e.file.id === selectedFile?.id)
  const currentNav = fileNav[currentNavIndex]
  const prevNav = currentNavIndex > 0 ? fileNav[currentNavIndex - 1] : null
  const nextNav = currentNavIndex < fileNav.length - 1 ? fileNav[currentNavIndex + 1] : null
  const prevIsGalleryJump = currentNav?.isFirstInGallery && prevNav !== null
  const nextIsGalleryJump = currentNav?.isLastInGallery && nextNav !== null

  const navigateToEntry = (entry: typeof fileNav[0]) => {
    setSelectedFile(entry.file)
    setExpandedGalleries(prev => new Set([...prev, entry.galleryTitle]))
  }

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
    setFullscreen(false)
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
                      <source src={getMediaUrl(selectedFile.filename)} type={videoMimeType(selectedFile.filename)} />
                    </video>
                  ) : isImage(selectedFile.filename) ? (
                    <img
                      src={getMediaUrl(selectedFile.filename)}
                      alt={selectedFile.title}
                      onClick={() => { setFullscreen(true); setFsUiVisible(false) }}
                    />
                  ) : null}
                </div>
                <div className="main-nav">
                  <button
                    className={`main-nav-btn${prevIsGalleryJump ? " gallery-jump" : ""}`}
                    disabled={!prevNav}
                    onClick={() => prevNav && navigateToEntry(prevNav)}
                  >
                    {prevIsGalleryJump ? "«" : "‹"}
                  </button>
                  <button
                    className={`main-nav-btn${nextIsGalleryJump ? " gallery-jump" : ""}`}
                    disabled={!nextNav}
                    onClick={() => nextNav && navigateToEntry(nextNav)}
                  >
                    {nextIsGalleryJump ? "»" : "›"}
                  </button>
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

      {fullscreen && selectedFile && (
        <div className="fs-overlay" onClick={() => setFullscreen(false)}>
          {isImage(selectedFile.filename) ? (
            <img
              className="fs-image"
              src={getMediaUrl(selectedFile.filename)}
              alt={selectedFile.title}
              onClick={e => { e.stopPropagation(); setFsUiVisible(v => !v) }}
            />
          ) : isVideo(selectedFile.filename) ? (
            <video
              key={selectedFile.id}
              className="fs-video"
              controls
              autoPlay
              playsInline
              onClick={e => e.stopPropagation()}
            >
              <source src={getMediaUrl(selectedFile.filename)} type={videoMimeType(selectedFile.filename)} />
            </video>
          ) : null}

          {/* UI chrome: always visible for video, tap-to-show for images */}
          {(fsUiVisible || isVideo(selectedFile.filename)) && (
            <>
              {prevNav && (
                <button
                  className={`fs-btn fs-prev${prevIsGalleryJump ? " gallery-jump" : ""}`}
                  onClick={e => { e.stopPropagation(); navigateToEntry(prevNav) }}
                >
                  {prevIsGalleryJump ? "«" : "‹"}
                </button>
              )}
              {nextNav && (
                <button
                  className={`fs-btn fs-next${nextIsGalleryJump ? " gallery-jump" : ""}`}
                  onClick={e => { e.stopPropagation(); navigateToEntry(nextNav) }}
                >
                  {nextIsGalleryJump ? "»" : "›"}
                </button>
              )}
              <button className="fs-close" onClick={() => setFullscreen(false)}>×</button>
              <div className="fs-info" onClick={e => e.stopPropagation()}>
                <div className="fs-info-gallery">{selectedFile.title}</div>
                <div className="fs-info-file">{selectedFile.filename.split("/").pop()}</div>
                <div className="fs-info-user">{selectedFile.user}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
