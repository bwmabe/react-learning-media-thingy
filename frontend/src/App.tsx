import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { File, GetFilesResult, GetUsersResult } from "./Interfaces"
import "./App.css"

const GET_USERS = gql`
  query GetUsers {
    users
  }
`

const GET_FILES = gql`
  query GetFiles($user: String!) {
    files(user: $user) {
      id
      title
      user
      filename
      published
    }
  }
`

const GET_USER_PREVIEW = gql`
  query GetUserPreview($user: String!) {
    userPreview(user: $user)
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

const BACKEND_HOST = import.meta.env.VITE_GRAPHQL_URI?.split("/graphql")[0] ?? "http://localhost:4000"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

type SidebarItem =
  | { kind: "year"; label: string }
  | { kind: "month"; key: string; label: string }
  | { kind: "gallery"; title: string; files: File[] }

const encodePath = (filename: string) =>
  filename.split("/").map(encodeURIComponent).join("/")

const getMediaUrl = (filename: string) =>
  `${BACKEND_HOST}/static/${encodePath(filename)}`

const getThumbUrl = (filename: string) =>
  `${BACKEND_HOST}/thumb/${encodePath(filename)}`

const videoMimeType = (filename: string) =>
  filename.endsWith(".mov") ? "video/quicktime" : "video/mp4"

const fileTitle = (file: File) => file.title || file.filename.split("/").pop() || file.filename


const FsSlideImage: React.FC<{
  src: string
  className: string
  alt: string
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void
}> = ({ src, className, alt, onClick }) => {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = ref.current   // captured at mount — valid DOM element
    return () => { if (img) img.src = "" }  // img still valid after ref.current → null
  }, [])
  return <img ref={ref} src={src} className={className} alt={alt} onClick={onClick} />
}

export const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<AppContent />} />
    <Route path="/:user" element={<AppContent />} />
    <Route path="/:user/:gallery" element={<AppContent />} />
    <Route path="/:user/:gallery/:fileId" element={<AppContent />} />
  </Routes>
)

const UserCard: React.FC<{ user: string; onClick: () => void }> = ({ user, onClick }) => {
  const { data, loading } = useQuery<{ userPreview: string | null }>(GET_USER_PREVIEW, {
    variables: { user },
  })
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const preview = data?.userPreview
  const showSpinner = loading || (!!preview && !imgLoaded && !imgError)

  return (
    <div className="user-card" onClick={onClick}>
      {showSpinner && (
        <div className="user-card-loading">
          <div className="throbber throbber--sm" />
        </div>
      )}
      {preview && !imgError && (
        <img
          className={`user-card-img${imgLoaded ? "" : " user-card-img--hidden"}`}
          src={getThumbUrl(preview)}
          alt={user}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}
      <div className="user-card-name">{user}</div>
    </div>
  )
}

const AppContent: React.FC = () => {
  const { user: selectedUser, gallery: galleryParam, fileId: fileIdParam } = useParams<{
    user?: string; gallery?: string; fileId?: string
  }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { loading: usersLoading, data: usersData, error } = useQuery<GetUsersResult>(GET_USERS)
  const { loading: filesLoading, data } = useQuery<GetFilesResult>(GET_FILES, {
    variables: { user: selectedUser },
    skip: !selectedUser,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expandedGalleries, setExpandedGalleries] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [fsUiVisible, setFsUiVisible] = useState(false)
  const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null)
  const fsTrackRef = useRef<HTMLDivElement>(null)
  const fsDragStartX = useRef<number | null>(null)
  const fsDragged = useRef(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current?.(e)
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Reset carousel track to centre position before each paint so there's no flash
  useLayoutEffect(() => {
    if (!fsTrackRef.current) return
    fsTrackRef.current.style.transition = "none"
    fsTrackRef.current.style.transform = "translateX(-100vw)"
  }, [selectedFile])

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

  const users = useMemo(() => usersData?.users ?? [], [usersData])

  const userFiles = useMemo(() =>
    (data?.files ?? []).filter(f => f.user === selectedUser)
  , [data, selectedUser])

  const galleries = useMemo((): [string, File[]][] => {
    const raw = userFiles.reduce<Record<string, File[]>>((acc, file) => {
      const key = fileTitle(file)
      if (!acc[key]) acc[key] = []
      acc[key].push(file)
      return acc
    }, {})
    return Object.entries(raw)
      .map(([title, files]): [string, File[]] => [
        title,
        [...files].sort((a, b) => {
          const cmp = sortBy === "date" ? a.published.localeCompare(b.published) : a.filename.localeCompare(b.filename)
          return sortDir === "asc" ? cmp : -cmp
        }),
      ])
      .sort(([aTitle, aFiles], [bTitle, bFiles]) => {
        const cmp = sortBy === "date"
          ? aFiles[0].published.localeCompare(bFiles[0].published)
          : aTitle.localeCompare(bTitle)
        return sortDir === "asc" ? cmp : -cmp
      })
  }, [userFiles, sortBy, sortDir])

  const sidebarItems = useMemo((): SidebarItem[] => {
    const items: SidebarItem[] = []
    if (sortBy === "date") {
      let lastYear = "", lastMonth = ""
      for (const [title, files] of galleries) {
        const pub = files[0].published
        const year = pub.slice(0, 4)
        const month = pub.slice(0, 7)
        if (year !== lastYear) {
          items.push({ kind: "year", label: year })
          lastYear = year
          lastMonth = ""
        }
        if (month !== lastMonth) {
          items.push({ kind: "month", key: month, label: MONTHS[parseInt(pub.slice(5, 7), 10) - 1] })
          lastMonth = month
        }
        items.push({ kind: "gallery", title, files })
      }
    } else {
      for (const [title, files] of galleries) {
        items.push({ kind: "gallery", title, files })
      }
    }
    return items
  }, [galleries, sortBy])

  const fileNav = useMemo(() =>
    galleries.flatMap(([galleryTitle, files]) =>
      files.map((file, i) => ({
        file,
        galleryTitle,
        isFirstInGallery: i === 0,
        isLastInGallery: i === files.length - 1,
      }))
    )
  , [galleries])

  const fileNavMap = useMemo(() =>
    new Map(fileNav.map((entry, i) => [entry.file.id, i]))
  , [fileNav])

  if (usersLoading) return <div className="app"><div className="empty-state"><div className="throbber" /></div></div>
  if (error) return <div className="app"><div className="empty-state">Error: {error.message}</div></div>

  const currentNavIndex = selectedFile ? (fileNavMap.get(selectedFile.id) ?? -1) : -1
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
    const next = new Set(expandedGalleries)
    if (next.has(title)) {
      next.delete(title)
      navigate(`/${encodeURIComponent(selectedUser!)}${sortSearch}`)
    } else {
      next.add(title)
      navigate(`/${encodeURIComponent(selectedUser!)}/${encodeURIComponent(title)}${sortSearch}`)
    }
    setExpandedGalleries(next)
  }

  const selectUser = (user: string) => {
    navigate(`/${encodeURIComponent(user)}`)
  }

  const goHome = () => {
    navigate("/")
  }

  // --- Fullscreen carousel ---

  const handleFsTouchStart = (e: React.TouchEvent) => {
    fsDragStartX.current = e.touches[0].clientX
    fsDragged.current = false
    if (fsTrackRef.current) {
      fsTrackRef.current.style.willChange = "transform"
      fsTrackRef.current.style.transition = "none"
    }
  }

  const handleFsTouchMove = (e: React.TouchEvent) => {
    if (fsDragStartX.current === null || !fsTrackRef.current) return
    const delta = e.touches[0].clientX - fsDragStartX.current
    if (Math.abs(delta) > 5) fsDragged.current = true
    // Rubber-band at boundaries
    const d = (!prevNav && delta > 0) || (!nextNav && delta < 0) ? delta * 0.25 : delta
    fsTrackRef.current.style.transform = `translateX(calc(-100vw + ${d}px))`
  }

  const handleFsTouchEnd = (e: React.TouchEvent) => {
    if (fsDragStartX.current === null || !fsTrackRef.current) return
    const delta = e.changedTouches[0].clientX - fsDragStartX.current
    fsDragStartX.current = null
    const track = fsTrackRef.current
    const threshold = window.innerWidth / 8

    const release = () => { track.style.willChange = "" }

    if (delta < -threshold && nextNav) {
      track.style.transition = "transform 0.25s ease"
      track.style.transform = "translateX(-200vw)"
      track.addEventListener("transitionend", () => { release(); navigateToEntry(nextNav) }, { once: true })
    } else if (delta > threshold && prevNav) {
      track.style.transition = "transform 0.25s ease"
      track.style.transform = "translateX(0vw)"
      track.addEventListener("transitionend", () => { release(); navigateToEntry(prevNav) }, { once: true })
    } else {
      track.style.transition = "transform 0.25s ease"
      track.style.transform = "translateX(-100vw)"
      track.addEventListener("transitionend", release, { once: true })
    }
  }

  const renderFsSlide = (file: File, isCurrent: boolean) => {
    if (isVideo(file.filename)) {
      if (isCurrent) {
        return (
          <video key={file.id} className="fs-video" controls autoPlay playsInline preload="metadata"
            onClick={e => e.stopPropagation()}>
            <source src={getMediaUrl(file.filename)} type={videoMimeType(file.filename)} />
          </video>
        )
      }
      return (
        <div className="fs-video-preview">
          <span className="fs-video-preview-icon">▶</span>
        </div>
      )
    }
    if (isImage(file.filename)) {
      return (
        <FsSlideImage
          src={getMediaUrl(file.filename)}
          className={isCurrent ? "fs-image" : "fs-adjacent-image"}
          alt={file.title}
          onClick={isCurrent ? (e => { e.stopPropagation(); setFsUiVisible(v => !v) }) : undefined}
        />
      )
    }
    return null
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
            {users.map(user => (
              <UserCard key={user} user={user} onClick={() => selectUser(user)} />
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
            <div className={`sidebar-list${sort.by === "date" ? " sidebar-list--date" : ""}`}>
              {sidebarItems.map(item => {
                if (item.kind === "year") return <div key={`year-${item.label}`} className="sidebar-date-year">{item.label}</div>
                if (item.kind === "month") return <div key={`month-${item.key}`} className="sidebar-date-month">{item.label}</div>
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
                        <div className={`gallery-header${expanded ? " gallery-header--sticky" : ""}`} onClick={() => toggleGallery(title)}>
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
            {filesLoading ? (
              <div className="empty-state"><div className="throbber" /></div>
            ) : selectedFile ? (
              <>
                <h2 className="media-title">{fileTitle(selectedFile)}</h2>
                <div className="media-player">
                  {isVideo(selectedFile.filename) ? (
                    <video key={selectedFile.id} controls playsInline preload="metadata">
                      <source src={getMediaUrl(selectedFile.filename)} type={videoMimeType(selectedFile.filename)} />
                    </video>
                  ) : isImage(selectedFile.filename) ? (
                    <img
                      src={getMediaUrl(selectedFile.filename)}
                      alt={selectedFile.title}
                      decoding="async"
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
          onClick={() => { if (!fsDragged.current) setFullscreen(false) }}
          onTouchStart={handleFsTouchStart}
          onTouchMove={handleFsTouchMove}
          onTouchEnd={handleFsTouchEnd}
        >
          <div className="fs-track" ref={fsTrackRef}>
            <div className="fs-slide" onClick={e => { e.stopPropagation(); if (prevNav) navigateToEntry(prevNav) }}>
              {prevNav && renderFsSlide(prevNav.file, false)}
            </div>
            <div className="fs-slide">
              {renderFsSlide(selectedFile, true)}
            </div>
            <div className="fs-slide" onClick={e => { e.stopPropagation(); if (nextNav) navigateToEntry(nextNav) }}>
              {nextNav && renderFsSlide(nextNav.file, false)}
            </div>
          </div>

          {/* Close is always visible; nav + info show on tap (or always for video) */}
          <button className="fs-close" onClick={e => { e.stopPropagation(); setFullscreen(false) }}>×</button>
          {(fsUiVisible || isVideo(selectedFile.filename)) && (
            <>
              <div className="fs-btn-group fs-btn-group--left">
                <button
                  className={`fs-btn${nextIsGalleryJump ? " gallery-jump" : ""}`}
                  disabled={!nextNav}
                  onClick={e => { e.stopPropagation(); nextNav && navigateToEntry(nextNav) }}
                >
                  {nextIsGalleryJump ? "»" : "›"}
                </button>
                <button
                  className={`fs-btn${prevIsGalleryJump ? " gallery-jump" : ""}`}
                  disabled={!prevNav}
                  onClick={e => { e.stopPropagation(); prevNav && navigateToEntry(prevNav) }}
                >
                  {prevIsGalleryJump ? "«" : "‹"}
                </button>
              </div>
              <div className="fs-btn-group fs-btn-group--right">
                <button
                  className={`fs-btn${prevIsGalleryJump ? " gallery-jump" : ""}`}
                  disabled={!prevNav}
                  onClick={e => { e.stopPropagation(); prevNav && navigateToEntry(prevNav) }}
                >
                  {prevIsGalleryJump ? "«" : "‹"}
                </button>
                <button
                  className={`fs-btn${nextIsGalleryJump ? " gallery-jump" : ""}`}
                  disabled={!nextNav}
                  onClick={e => { e.stopPropagation(); nextNav && navigateToEntry(nextNav) }}
                >
                  {nextIsGalleryJump ? "»" : "›"}
                </button>
              </div>
              <div className="fs-info" onClick={e => e.stopPropagation()}>
                <div className="fs-info-gallery">{fileTitle(selectedFile)}</div>
                <div className="fs-info-file">{selectedFile.filename.split("/").pop()}</div>
                <div className="fs-info-user">{selectedFile.user}</div>
                <div className="fs-info-user">{selectedFile.published}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
