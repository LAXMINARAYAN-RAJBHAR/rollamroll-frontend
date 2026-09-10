import React, { useState, useEffect, useRef } from "react";
import EMOJI_CATEGORIES from "../Messages/emojiData";
import {
  searchGifs,
  trendingGifs,
  searchStickers,
  trendingStickers,
} from "../../utils/giphyApi";
import "./CommentMediaPicker.css";

const TABS = [
  { id: "emoji", label: "😀", title: "Emoji" },
  { id: "gif", label: "GIF", title: "GIFs" },
  { id: "sticker", label: "🏷️", title: "Stickers" },
];

// Unlike EmojiGifStickerPicker (used in chat, which relies on the parent
// component's existing ref-based outside-click handler), this version
// manages its own outside-click detection and just calls onClose — it
// matches the `<EmojiPicker onSelect={...} onClose={...} />` convention
// already used for comment boxes across Video.jsx / PostCard.jsx /
// Reels.jsx, so it can drop in next to a plain button with no extra
// wiring needed from the caller.
const CommentMediaPicker = ({ onEmojiSelect, onMediaSelect, onClose, anchor = "left" }) => {
  const [activeTab, setActiveTab] = useState("emoji");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [mediaQuery, setMediaQuery] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const [stickerResults, setStickerResults] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const panelRef = useRef();
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (activeTab === "gif" && gifResults.length === 0 && !mediaQuery.trim()) {
      setLoadingMedia(true);
      setMediaError(null);
      trendingGifs()
        .then(setGifResults)
        .catch((e) => setMediaError(e.message))
        .finally(() => setLoadingMedia(false));
    }
    if (
      activeTab === "sticker" &&
      stickerResults.length === 0 &&
      !mediaQuery.trim()
    ) {
      setLoadingMedia(true);
      setMediaError(null);
      trendingStickers()
        .then(setStickerResults)
        .catch((e) => setMediaError(e.message))
        .finally(() => setLoadingMedia(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "gif" && activeTab !== "sticker") return undefined;
    clearTimeout(debounceRef.current);
    if (!mediaQuery.trim()) return undefined;

    debounceRef.current = setTimeout(() => {
      setLoadingMedia(true);
      setMediaError(null);
      const fn = activeTab === "gif" ? searchGifs : searchStickers;
      const setResults = activeTab === "gif" ? setGifResults : setStickerResults;
      fn(mediaQuery)
        .then(setResults)
        .catch((e) => setMediaError(e.message))
        .finally(() => setLoadingMedia(false));
    }, 450);

    return () => clearTimeout(debounceRef.current);
  }, [mediaQuery, activeTab]);

  const filteredEmojiCategories = EMOJI_CATEGORIES.map((cat) => ({
    ...cat,
    emojis: emojiSearch.trim()
      ? cat.emojis.filter((e) =>
          e.name.toLowerCase().includes(emojiSearch.trim().toLowerCase()),
        )
      : cat.emojis,
  })).filter((cat) => cat.emojis.length > 0);

  const results = activeTab === "gif" ? gifResults : stickerResults;

  return (
    <div className={`cmp-panel cmp-anchor-${anchor}`} ref={panelRef}>
      <div className="cmp-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`cmp-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
            title={t.title}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "emoji" ? (
        <>
          <input
            type="text"
            className="cmp-search"
            placeholder="Search emoji…"
            value={emojiSearch}
            onChange={(e) => setEmojiSearch(e.target.value)}
            autoFocus
          />
          <div className="cmp-emoji-scroll">
            {filteredEmojiCategories.length === 0 ? (
              <p className="cmp-empty">No emoji found</p>
            ) : (
              filteredEmojiCategories.map((cat) => (
                <div key={cat.category} className="cmp-emoji-category">
                  <div className="cmp-emoji-category-label">{cat.category}</div>
                  <div className="cmp-emoji-grid">
                    {cat.emojis.map((e) => (
                      <button
                        key={e.name + e.emoji}
                        type="button"
                        className="cmp-emoji-btn"
                        title={e.name}
                        onClick={() => onEmojiSelect(e.emoji)}
                      >
                        {e.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <input
            type="text"
            className="cmp-search"
            placeholder={activeTab === "gif" ? "Search GIFs…" : "Search stickers…"}
            value={mediaQuery}
            onChange={(e) => setMediaQuery(e.target.value)}
            autoFocus
          />
          <div className="cmp-media-scroll">
            {loadingMedia ? (
              <p className="cmp-empty">Loading…</p>
            ) : mediaError ? (
              <p className="cmp-empty cmp-error">{mediaError}</p>
            ) : results.length === 0 ? (
              <p className="cmp-empty">No results</p>
            ) : (
              <div className="cmp-media-grid">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="cmp-media-btn"
                    title={r.title}
                    onClick={() => onMediaSelect({ url: r.sendUrl, type: activeTab })}
                  >
                    <img src={r.previewUrl} alt={r.title} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <div className="cmp-giphy-attribution">Powered by GIPHY</div>
          </div>
        </>
      )}
    </div>
  );
};

export default CommentMediaPicker;