import React, { useEffect, useRef } from "react";
import videojs, { type VideoJsPlayer, type VideoJsPlayerOptions } from "video.js";
import "video.js/dist/video-js.css";

interface VideoPlayerProps {
  src: string;
  fileType: string;
  options?: VideoJsPlayerOptions;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  fileType,
  options,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const player = (playerRef.current = videojs(
        videoRef.current,
        options,
        () => {
          console.log("player is ready");
        }
      ));
      player.src({ src, type: fileType });
    }

    // Dispose the player on unmount
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [options, src, fileType]);

  return (
    <div data-vjs-player>
      <video ref={videoRef} className="video-js vjs-big-play-centered" />
    </div>
  );
};
