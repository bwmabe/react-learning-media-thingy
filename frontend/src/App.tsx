import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { File, GetFilesResult, GetThumbsResult } from "./Interfaces"
import "./App.css"

const GET_FILES = gql`
  query GetFiles($filter: String) {
    files(filter: $filter) {
      id
      title
      user
      filename
      published
    }
  }
`

const GET_THUMBS = gql`
  query GetThumbs {
    thumbs {
      user
      filename
    }
  }
`

const SET_THUMB = gql`
  mutation SetThumb($user: String!, $filename: String!) {
    setThumb(user: $user, filename: $filename) {
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
  const backendHost = import.meta.env.VITE_GRAPHQL_URI?.split("/graphql")[0] ?? "http://localhost:4000"
  const encodedPath = filename.split("/").map(encodeURIComponent).join("/")
  return `${backendHost}/static/${encodedPath}`
}

const videoMimeType = (filename: string) =>
  filename.endsWith(".mov") ? "video/quicktime" : "video/mp4"

const fileTitle = (file: File) => file.title || file.filename.split("/").pop() || file.filename

export const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<AppContent />} />
    <Route path="/:user" element={<AppContent />} />
    <Route path="/:user/:gallery" element={<AppContent />} />
    <Route path="/:user/:gallery/:fileId" element={<AppContent />} />
  </Routes>
)

const AppContent: React.FC = () => {
  const { user: selectedUser, gallery: galleryParam, fileId: fileIdParam } = useParams<{
    user?: string; gallery?: string; fileId?: string
  }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { loading, data, error } = useQuery<GetFilesResult>(GET_FILES)
  const { data: thumbsData } = useQuery<GetThumbsResult>(GET_THUMBS)
  const [setThumb] = useMutation(SET_THUMB, {
    refetchQueries: [{ query: GET_THUMBS }],
  })
  const thumbsDispatched = useRef<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expandedGalleries, setExpandedGalleries] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [fsUiVisible, setFsUiVisible] = useState(false)
  const swipeTouchStartX = useRef<number | null>(null)
  const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current?.(e)
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Derive sort from ?sort=by-dir query param; default is alpha-asc
  const sortParam = searchParams.get("sort") ?? "alpha-asc"
  const [sortBy, sortDir] = sortParam.split("-") as ["alpha" | "date", "asc" | "desc"]
  const sort = { by: sortBy, dir: sortDir }

  // Preserve sort param across path navigations
  const sortSearch = searchParams.toString() ? `?${searchParams.toString()}` : ""

  const setSort = (newSort: { by: "alpha" | "date"; dir: "asc" | "desc" }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (newSort.by === "alpha" && newSort.dir === "asc") {
        next.delete("sort") // default — no param needed
      } else {
        next.set("sort", `${newSort.by}-${newSort.dir}`)
      }
      return next
    })
  }

  // Reset view state when navigating to a different user
  useEffect(() => {
    setSelectedFile(null)
    setExpandedGalleries(new Set())
    setSidebarOpen(true)
    setFullscreen(false)
    // sort resets naturally: selectUser navigates without ?sort
  }, [selectedUser])

  // Auto-expand gallery from URL param
  useEffect(() => {
    if (galleryParam) {
      const title = decodeURIComponent(galleryParam)
      setExpandedGalleries(prev => new Set([...prev, title]))
    }
  }, [galleryParam])

  // Sync selected file from URL
  useEffect(() => {
    if (!fileIdParam || !data) {
      setSelectedFile(null)
      return
    }
    setSelectedFile(data.files.find(f => f.id === decodeURIComponent(fileIdParam)) ?? null)
  }, [fileIdParam, data])

  const thumbsMap = useMemo(() =>
    new Map((thumbsData?.thumbs ?? []).map(t => [t.user, t.filename]))
  , [thumbsData])

  const userCards = useMemo(() => {
    const users = [...new Set(data?.files.map(f => f.user) ?? [])].sort((a, b) => a.localeCompare(b))
    return users.map(user => ({
      user,
      preview: thumbsMap.get(user) ?? null,
    }))
  }, [data, thumbsMap])

  // Store a thumbnail for any user that doesn't have one yet
  useEffect(() => {
    if (!data || !thumbsData) return
    for (const { user } of userCards) {
      if (!thumbsMap.has(user) && !thumbsDispatched.current.has(user)) {
        const images = data.files.filter(f => f.user === user && isImage(f.filename))
        if (images.length > 0) {
          const pick = images[Math.floor(Math.random() * images.length)]
          thumbsDispatched.current.add(user)
          setThumb({ variables: { user, filename: pick.filename } })
        }
      }
    }
  }, [data, thumbsData, thumbsMap, userCards, setThumb])

  if (loading) return <div className="empty-state">Loading...</div>
  if (error) return <div className="empty-state">Error: {error.message}</div>

  const userFiles = (data?.files ?? []).filter(f => f.user === selectedUser)

  const galleriesRaw = userFiles.reduce<Record<string, File[]>>((acc, file) => {
    const key = fileTitle(file)
    if (!acc[key]) acc[key] = []
    acc[key].push(file)
    return acc
  }, {})

  // Sort gallery entries within each gallery, then sort the galleries themselves
  const galleries = Object.fromEntries(
    Object.entries(galleriesRaw)
      .map(([title, files]) => [
        title,
        [...files].sort((a, b) => {
          const cmp = sort.by === "date" ? a.published.localeCompare(b.published) : a.filename.localeCompare(b.filename)
          return sort.dir === "asc" ? cmp : -cmp
        }),
      ])
      .sort(([aTitle, aFiles], [bTitle, bFiles]) => {
        const cmp = sort.by === "date"
          ? aFiles[0].published.localeCompare(bFiles[0].published)
          : aTitle.localeCompare(bTitle)
        return sort.dir === "asc" ? cmp : -cmp
      })
  )

  // Build sidebar items, inserting year/month headers when sorting by date
  type SidebarItem =
    | { kind: "year"; label: string }
    | { kind: "month"; label: string }
    | { kind: "gallery"; title: string; files: File[] }

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

  const sidebarItems: SidebarItem[] = []
  if (sort.by === "date") {
    let lastYear = "", lastMonth = ""
    for (const [title, files] of Object.entries(galleries)) {
      const pub = files[0].published
      const year = pub.slice(0, 4)
      const month = pub.slice(0, 7)
      if (year !== lastYear) {
        sidebarItems.push({ kind: "year", label: year })
        lastYear = year
        lastMonth = ""
      }
      if (month !== lastMonth) {
        sidebarItems.push({ kind: "month", label: MONTHS[parseInt(pub.slice(5, 7), 10) - 1] })
        lastMonth = month
      }
      sidebarItems.push({ kind: "gallery", title, files })
    }
  } else {
    for (const [title, files] of Object.entries(galleries)) {
      sidebarItems.push({ kind: "gallery", title, files })
    }
  }

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

  const navigateToFile = (user: string, galleryTitle: string, fileId: string) => {
    navigate(`/${encodeURIComponent(user)}/${encodeURIComponent(galleryTitle)}/${encodeURIComponent(fileId)}${sortSearch}`)
  }

  const navigateToEntry = (entry: typeof fileNav[0]) => {
    setExpandedGalleries(prev => new Set([...prev, entry.galleryTitle]))
    navigateToFile(selectedUser!, entry.galleryTitle, entry.file.id)
  }

  // Keep keyboard handler up to date with latest nav state
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" && prevNav) navigateToEntry(prevNav)
    if (e.key === "ArrowRight" && nextNav) navigateToEntry(nextNav)
  }

  const toggleGallery = (title: string) => {
    setExpandedGalleries(prev => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
        navigate(`/${encodeURIComponent(selectedUser!)}${sortSearch}`)
      } else {
        next.add(title)
        navigate(`/${encodeURIComponent(selectedUser!)}/${encodeURIComponent(title)}${sortSearch}`)
      }
      return next
    })
  }

  const selectUser = (user: string) => {
    navigate(`/${encodeURIComponent(user)}`)
  }

  const goHome = () => {
    navigate("/")
  }

  return (
    <div className="app">
      <header className="app-header">
        {selectedUser && (
          <button className={`hamburger${sidebarOpen ? " open" : ""}`} aria-label="Show/hide sidebar" title="Show/hide sidebar" onClick={() => setSidebarOpen(v => !v)}>
            <span /><span /><span />
          </button>
        )}
        <h1
          className={selectedUser ? "app-title clickable" : "app-title"}
          aria-label={selectedUser ? "Go to home page" : undefined}
          title={selectedUser ? "Go to home page" : undefined}
          onClick={selectedUser ? goHome : undefined}
        >
          Media Thing{selectedUser && <span className="app-title-user">/{selectedUser}</span>}
        </h1>
      </header>

      {!selectedUser ? (
        <div className="landing">
          <div className="user-grid">
            {userCards.map(({ user, preview }) => (
              <div key={user} className="user-card" onClick={() => selectUser(user)}>
                {preview && (
                  <img className="user-card-img" src={getMediaUrl(preview)} alt={user} />
                )}
                <div className="user-card-name">{user}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="app-body">
          {sidebarOpen && <nav className="sidebar">
            <div className="sidebar-heading">
              Galleries
              <div className="sort-toggle">
                <button
                  className={sort.by === "alpha" ? "active" : ""}
                  onClick={() => setSort(sort.by === "alpha"
                    ? { by: "alpha", dir: sort.dir === "asc" ? "desc" : "asc" }
                    : { by: "alpha", dir: "asc" })}
                >A–Z {sort.by === "alpha" && (sort.dir === "asc" ? "↑" : "↓")}</button>
                <button
                  className={sort.by === "date" ? "active" : ""}
                  onClick={() => setSort(sort.by === "date"
                    ? { by: "date", dir: sort.dir === "asc" ? "desc" : "asc" }
                    : { by: "date", dir: "desc" })}
                >Date {sort.by === "date" && (sort.dir === "asc" ? "↑" : "↓")}</button>
              </div>
            </div>
            <div className="sidebar-list">
              {sidebarItems.map(item => {
                if (item.kind === "year") return <div key={`year-${item.label}`} className="sidebar-date-year">{item.label}</div>
                if (item.kind === "month") return <div key={`month-${item.label}`} className="sidebar-date-month">{item.label}</div>
                const { title, files } = item
                const expanded = expandedGalleries.has(title)
                return (
                  <div key={title}>
                    {files.length === 1 ? (
                      <div
                        className={`gallery-header${selectedFile?.id === files[0].id ? " selected" : ""}`}
                        onClick={() => navigateToFile(selectedUser, title, files[0].id)}
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
                            onClick={() => navigateToFile(selectedUser, title, file.id)}
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
          </nav>}

          <main className="main">
            {selectedFile ? (
              <>
                <h2 className="media-title">{fileTitle(selectedFile)}</h2>
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
                  <div className="media-meta-row"><strong>Date:</strong> {selectedFile.published}</div>
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
        <div
          className="fs-overlay"
          onClick={() => setFullscreen(false)}
          onTouchStart={e => { swipeTouchStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (swipeTouchStartX.current === null) return
            const delta = e.changedTouches[0].clientX - swipeTouchStartX.current
            swipeTouchStartX.current = null
            if (delta > 50 && prevNav) navigateToEntry(prevNav)
            else if (delta < -50 && nextNav) navigateToEntry(nextNav)
          }}
        >
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
                <div className="fs-info-gallery">{fileTitle(selectedFile)}</div>
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
