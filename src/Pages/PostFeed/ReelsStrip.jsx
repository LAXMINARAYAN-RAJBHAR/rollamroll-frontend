import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

const HOVER_PREVIEW_DELAY = 350; // ms

// ── One reel card in the strip. Desktop hovers-to-preview (muted, looping
// clip in place of the thumbnail); mobile just shows the static thumbnail
// (or the video's own first frame if no thumbnail_url exists) and relies
// on the tap to open the reel. Clicking/tapping navigates into the full
// Reels swipe player, passing the reel object as `clickedReel` state so
// it opens instantly there instead of waiting on a fresh fetch — same
// pattern Homepage's ShortCard uses today. ──
const ReelStripCard = ({ reel, navigate }) => {
  const [previewing, setPreviewing] = useState(false);
  const videoRef = useRef(null);
  const timeoutRef = useRef(null);

  const onEnter = () => {
    if (!reel.src) return;
    timeoutRef.current = setTimeout(() => {
      setPreviewing(true);
      videoRef.current?.play().catch(() => {});
    }, HOVER_PREVIEW_DELAY);
  };

  const onLeave = () => {
    clearTimeout(timeoutRef.current);
    setPreviewing(false);
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch (_) {}
    }
  };

  const goToReel = () => {
    navigate(`/reels/${reel.id}`, { state: { clickedReel: reel } });
  };

  return (
    <div
      className="pf-reel-card"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={goToReel}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToReel();
        }
      }}
    >
      <div className="pf-reel-thumb-wrap">
        {reel.thumbnail ? (
          <>
            <img
              src={reel.thumbnail}
              alt={reel.title}
              className="pf-reel-thumb"
              style={{ opacity: previewing ? 0 : 1 }}
              loading="lazy"
            />
            {previewing && reel.src && (
              <video
                ref={videoRef}
                src={reel.src}
                muted
                loop
                playsInline
                preload="metadata"
                className="pf-reel-thumb pf-reel-thumb-video"
              />
            )}
          </>
        ) : reel.src ? (
          <video
            ref={videoRef}
            src={reel.src}
            muted
            loop
            playsInline
            preload="metadata"
            className="pf-reel-thumb"
          />
        ) : (
          <div className="pf-reel-thumb pf-reel-thumb-placeholder">🎬</div>
        )}
        <span className="pf-reel-play-badge">▶</span>
        {reel.duration && reel.duration !== "00:00" && (
          <span className="pf-reel-duration">{reel.duration}</span>
        )}
      </div>
      <div className="pf-reel-title">{reel.title}</div>
      <Link
        to={`/user/${reel.username}`}
        className="pf-reel-user"
        onClick={(e) => e.stopPropagation()}
      >
        @{reel.user}
      </Link>
    </div>
  );
};

// ── The strip itself. Renders nothing while there are no reels yet, so
// it never leaves an empty header sitting above the composer. ──
const ReelsStrip = ({ reels }) => {
  const navigate = useNavigate();

  if (!reels || reels.length === 0) return null;

  return (
    <div className="pf-reels-strip">
      <div className="pf-reels-strip-header">
        <span className="pf-reels-strip-zbadge">Z</span>
        <span className="pf-reels-strip-title">Reels</span>
        <Link to="/reels" className="pf-reels-strip-viewall">
          See all
        </Link>
      </div>
      <div className="pf-reels-strip-track">
        {reels.map((r) => (
          <ReelStripCard key={r.id} reel={r} navigate={navigate} />
        ))}
      </div>
    </div>
  );
};

export default ReelsStrip;