/* PT Prajurit Translation — main.js
   - Navbar: hamburger, global search + suggestions
   - Index: latest update, manga grid, filter (translator/genre/series), tiles
   - Translator/Genre/Series pages: list + detail views (?id=)
*/

(function () {
  "use strict";

  const DATA_URL = "data/manga.json";
  const MAX_SUGGEST = 8;
  const MANGA_PER_PAGE = 20;
  let currentMangaLimit = MANGA_PER_PAGE;

  const Storage = {
    getHistory: () => JSON.parse(localStorage.getItem("ptpt_history") || "[]"),
    saveHistory: (mangaId, chapter) => {
      let h = Storage.getHistory();
      h = h.filter((x) => x.id !== String(mangaId));
      h.unshift({
        id: String(mangaId),
        chapter: Number(chapter),
        time: Date.now(),
      });
      localStorage.setItem("ptpt_history", JSON.stringify(h.slice(0, 20))); // Keep last 20
    },
    getFavorites: () =>
      JSON.parse(
        localStorage.getItem("ptpt_favorites") ||
          '{"manga":[],"translator":[]}',
      ),
    toggleFavorite: (type, id) => {
      let f = Storage.getFavorites();
      if (!f[type]) f[type] = [];
      const idx = f[type].indexOf(String(id));
      if (idx > -1) f[type].splice(idx, 1);
      else f[type].push(String(id));
      localStorage.setItem("ptpt_favorites", JSON.stringify(f));
      return idx === -1;
    },
    isFavorite: (type, id) => {
      let f = Storage.getFavorites();
      return f[type] && f[type].includes(String(id));
    },
  };

  window.PTPT_Storage = Storage;

  function renderBookmarkBtn(type, id, onToggle) {
    const isFav = Storage.isFavorite(type, id);
    const btn = el("button", {
      class: `btn-bookmark ${isFav ? "is-active" : ""}`,
      type: "button",
      "aria-label": "Bookmark",
      title: "Tambah ke Favorit",
      text: isFav ? "♥" : "♡",
    });
    btn.dataset.id = id;
    btn.dataset.type = type;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const added = Storage.toggleFavorite(type, id);
      btn.classList.toggle("is-active", added);
      btn.textContent = added ? "♥" : "♡";
      if (typeof onToggle === "function") onToggle();
    });
    return btn;
  }

  function renderSkeletonGrid(target, count = 10) {
    if (!target) return;
    target.innerHTML = "";
    for (let i = 0; i < count; i++) {
      target.appendChild(
        el("article", { class: "manga-card" }, [
          el("div", { class: "skeleton" }),
          el("div", { class: "manga-card__body" }, [
            el("div", { class: "skeleton-text", style: "width: 100%" }),
            el("div", { class: "skeleton-text", style: "width: 60%" }),
          ]),
        ]),
      );
    }
  }

  let dataPromise = null;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      if (key === "class") node.className = String(value);
      else if (key === "text") node.textContent = String(value);
      else if (key === "html") node.innerHTML = String(value);
      else if (key === "value") node.value = String(value);
      else if (key === "disabled") node.disabled = Boolean(value);
      else node.setAttribute(key, String(value));
    }

    for (const child of Array.isArray(children) ? children : [children]) {
      if (child === null || child === undefined) continue;
      if (typeof child === "string")
        node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }

    return node;
  }

  function getParams() {
    return new URLSearchParams(window.location.search);
  }

  function setParams(nextParams) {
    const url = new URL(window.location.href);
    url.search = nextParams.toString();
    window.history.replaceState({}, "", url);
  }

  function normalize(str) {
    return String(str ?? "")
      .toLowerCase()
      .trim();
  }

  function getStatus(manga) {
    if ("status" in manga) return manga.status;
    if ("ongoing" in manga) return "ongoing"; // fallback lama
    return "completed";
  }

  function clampText(input, max = 110) {
    const s = String(input ?? "").trim();
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1).trim()}…`;
  }

  function readerHref(id, ch) {
    return `reader.html?id=${encodeURIComponent(id)}&ch=${encodeURIComponent(String(ch))}`;
  }

  function mangaHref(id) {
    return `detail.html?id=${encodeURIComponent(id)}`;
  }

  function translatorHref(id) {
    return `translator.html?id=${encodeURIComponent(id)}`;
  }

  function genreHref(id) {
    return `genre.html?id=${encodeURIComponent(id)}`;
  }

  function seriesHref(id) {
    return `series.html?id=${encodeURIComponent(id)}`;
  }

  function readerHref(id, ch) {
    return `reader.html?id=${encodeURIComponent(id)}&ch=${encodeURIComponent(String(ch))}`;
  }

  function getMaxChapter(manga) {
    const chapters = Array.isArray(manga?.chapters) ? manga.chapters : [];
    return chapters.reduce((acc, ch) => {
      const n = Number(ch?.number);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
  }

  async function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL).then((r) => {
        if (!r.ok) throw new Error(`Gagal memuat data (${r.status})`);
        return r.json();
      });
    }
    return dataPromise;
  }

  function indexById(list) {
    const map = new Map();
    for (const item of Array.isArray(list) ? list : []) {
      if (item?.id) map.set(String(item.id), item);
    }
    return map;
  }

  function countBy(list, key) {
    const acc = new Map();
    for (const item of Array.isArray(list) ? list : []) {
      const v = item?.[key];
      if (v === null || v === undefined || v === "") continue;
      acc.set(v, (acc.get(v) || 0) + 1);
    }
    return acc;
  }

  function getGenrePreviewImage(catalog, genreId) {
    const mangaList = Array.isArray(catalog.manga) ? catalog.manga : [];

    const related = mangaList.filter(
      (m) =>
        Array.isArray(m.genre) && m.genre.map(String).includes(String(genreId)),
    );

    if (related.length > 0) {
      const pick = related[Math.floor(Math.random() * related.length)];
      return pick.banner || pick.cover;
    }

    return null;
  }

  function countByArray(list, key) {
    const acc = new Map();
    for (const item of Array.isArray(list) ? list : []) {
      const arr = item?.[key];
      if (!Array.isArray(arr)) continue;
      for (const v of arr) {
        if (!v) continue;
        acc.set(v, (acc.get(v) || 0) + 1);
      }
    }
    return acc;
  }

  function initYear() {
    const year = String(new Date().getFullYear());
    for (const node of qsa("#year")) node.textContent = year;
  }

  function initNav() {
    const toggle = qs("[data-nav-toggle]");
    const menu = qs("[data-nav-menu]");
    if (!toggle || !menu) return;

    function setOpen(next) {
      document.body.classList.toggle("is-nav-open", next);
      toggle.setAttribute("aria-expanded", next ? "true" : "false");
    }

    toggle.addEventListener("click", () => {
      setOpen(!document.body.classList.contains("is-nav-open"));
    });

    document.addEventListener("click", (e) => {
      const isOpen = document.body.classList.contains("is-nav-open");
      if (!isOpen) return;
      if (toggle.contains(e.target) || menu.contains(e.target)) return;
      setOpen(false);
    });

    for (const a of qsa(".nav__link", menu)) {
      a.addEventListener("click", () => setOpen(false));
    }
  }

  function initGlobalSearch(catalog, onQuery) {
    const input = qs("[data-global-search]");
    const suggestBox = qs("#search-suggest");
    if (!input || !suggestBox) return;

    const translators = indexById(catalog.translators);
    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];

    function closeSuggest() {
      suggestBox.classList.remove("is-open");
      suggestBox.innerHTML = "";
    }

    function openSuggest(items) {
      suggestBox.innerHTML = "";
      if (!items.length) {
        closeSuggest();
        return;
      }

      for (const m of items) {
        const tr = translators.get(String(m.translator));
        const meta = tr?.name ? tr.name : "Translator";
        const row = el(
          "a",
          { class: "suggest__item", href: mangaHref(m.id), role: "option" },
          [
            el("img", { class: "suggest__thumb", src: m.cover, alt: "" }),
            el("div", {}, [
              el("div", { class: "suggest__title" }, [
                m.title,
                m.language
                  ? el("span", {
                      class: "lang-badge",
                      style: "font-size:0.55rem;",
                      text: `[${m.language}]`,
                    })
                  : null,
              ]),
            ]),
            el("div", { class: "suggest__meta", text: meta }),
          ],
        );
        suggestBox.appendChild(row);
      }
      suggestBox.classList.add("is-open");
    }

    function filterSuggest(q) {
      const query = normalize(q);
      if (!query) return [];
      return manga
        .filter((m) => normalize(m?.title).includes(query))
        .slice(0, MAX_SUGGEST);
    }

    input.addEventListener("input", () => {
      const q = input.value;
      openSuggest(filterSuggest(q));
      if (typeof onQuery === "function") onQuery(q);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const page = document.body?.dataset?.page || "";
      if (page !== "index") {
        const params = new URLSearchParams();
        const q = input.value.trim();
        if (q) params.set("q", q);
        window.location.href = params.toString()
          ? `index.html?${params}#manga`
          : "index.html#manga";
      } else {
        const mangaSec = document.getElementById("manga");
        if (mangaSec) mangaSec.scrollIntoView({ behavior: "smooth" });
      }
    });

    document.addEventListener("click", (e) => {
      if (suggestBox.contains(e.target) || input.contains(e.target)) return;
      closeSuggest();
    });

    input.addEventListener("blur", () => window.setTimeout(closeSuggest, 120));
  }

  function renderLatest(track, catalog) {
    if (!track) return;
    track.innerHTML = "";

    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];
    const translators = indexById(catalog.translators);

    const sorted = [...manga].sort(
      (a, b) => getMaxChapter(b) - getMaxChapter(a),
    );
    const picks = sorted.slice(0, 10);

    for (const m of picks) {
      const tr = translators.get(String(m.translator));
      const meta = tr?.name
        ? `${tr.name} • Ch ${getMaxChapter(m) || 1}`
        : `Ch ${getMaxChapter(m) || 1}`;
      track.appendChild(
        el("a", { class: "latest", href: mangaHref(m.id) }, [
          el("div", { class: "latest__inner" }, [
            el("img", { class: "latest__cover", src: m.cover, alt: "" }),
            el("div", {}, [
              el("h3", { class: "latest__title" }, [
                m.title,
                m.language
                  ? el("span", {
                      class: "lang-badge",
                      style: "font-size:0.55rem;",
                      text: `[${m.language}]`,
                    })
                  : null,
              ]),
              el("p", { class: "latest__meta", text: meta }),
            ]),
          ]),
        ]),
      );
    }
  }

  function renderMangaGrid(grid, items, catalog, append = false) {
    if (!append) grid.innerHTML = "";
    const translators = indexById(catalog.translators);
    const genres = indexById(catalog.genres);
    const series = indexById(catalog.series);

    let toRender = items.slice(0, currentMangaLimit);
    if (append) {
      toRender = items.slice(
        currentMangaLimit - MANGA_PER_PAGE,
        currentMangaLimit,
      );
      if (toRender.length === 0) return;
    }

    for (const m of toRender) {
      const tr = translators.get(String(m.translator));
      const g = Array.isArray(m.genre)
        ? m.genre.map((id) => genres.get(String(id))?.name).filter(Boolean)
        : [];
      const s = series.get(String(m.series))?.name;
      const metaParts = [tr?.name, s, g[0]].filter(Boolean).slice(0, 3);

      const status = getStatus(m);

      const bookmarkBtn = renderBookmarkBtn("manga", m.id, () => {
        const favFilter = document.getElementById("filter-favorite");
        if (favFilter && favFilter.checked) {
          const reloadEvent = new Event("change");
          favFilter.dispatchEvent(reloadEvent);
        }
      });

      grid.appendChild(
        el("article", { class: "manga-card" }, [
          bookmarkBtn,
          el("a", { href: mangaHref(m.id), style: "display:block;" }, [
            el("img", {
              class: "manga-card__cover",
              src: m.cover,
              alt: "",
              loading: "lazy",
            }),
          ]),
          el("div", { class: "manga-card__body" }, [
            el("a", { href: mangaHref(m.id) }, [
              el("h3", { class: "manga-card__title" }, [
                m.title,
                el("span", {
                  class: `status-badge status-${status}`,
                  text: status === "ongoing" ? "Ongoing" : "Completed",
                }),
                m.language
                  ? el("span", {
                      class: "lang-badge",
                      style: "font-size:0.55rem;",
                      text: `[${m.language}]`,
                    })
                  : null,
              ]),
            ]),
            el("p", { class: "manga-card__meta", text: metaParts.join(" • ") }),
          ]),
        ]),
      );
    }
  }

  function setCount(node, visible, total) {
    if (!node) return;
    node.textContent =
      visible === total ? `${total} judul` : `${visible} dari ${total} judul`;
  }

  function initIndexPage(catalog) {
    const latestTrack = qs("#latest-track");
    const grid = qs("#manga-grid");
    const empty = qs("#manga-empty");
    const count = qs("#manga-count");

    const translatorSelect = qs("#filter-translator");
    const genreSelect = qs("#filter-genre");
    const seriesSelect = qs("#filter-series");
    const languageSelect = qs("#filter-language");
    const favSelect = qs("#filter-favorite");
    const clearBtn = qs("[data-clear-filters]");
    const searchInput = qs("[data-global-search]");

    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];
    const translators = Array.isArray(catalog.translators)
      ? catalog.translators
      : [];
    const genres = Array.isArray(catalog.genres) ? catalog.genres : [];
    const series = Array.isArray(catalog.series) ? catalog.series : [];

    const statManga = qs("#stat-manga");
    const statTranslators = qs("#stat-translators");
    const statGenres = qs("#stat-genres");
    const statSeries = qs("#stat-series");

    const adPopup = qs("#ad-popup");
    const adLink = qs("#ad-popup-link");
    const adImg = qs("#ad-popup-img");
    if (adPopup) {
      document.addEventListener("click", (e) => {
        if (e.target.closest("[data-ad-close]")) {
          adPopup.classList.remove("is-open");
        }
      });
    }

    if (adPopup && catalog.ads && catalog.ads.active && catalog.ads.imageUrl) {
      if (adLink) adLink.href = catalog.ads.linkUrl || "#";
      if (adImg) adImg.src = catalog.ads.imageUrl;
      setTimeout(() => {
        adPopup.classList.add("is-open");
      }, 500);
    }

    if (statManga) statManga.textContent = String(manga.length);
    if (statTranslators)
      statTranslators.textContent = String(translators.length);
    if (statGenres) statGenres.textContent = String(genres.length);
    if (statSeries) statSeries.textContent = String(series.length);

    function fillSelect(node, items, placeholder) {
      if (!node) return;
      const current = node.value;
      node.innerHTML = "";
      node.appendChild(el("option", { value: "", text: placeholder }));
      for (const it of items)
        node.appendChild(el("option", { value: it.id, text: it.name }));
      if (current) node.value = current;
    }

    fillSelect(translatorSelect, translators, "Semua translator");
    fillSelect(genreSelect, genres, "Semua genre");
    fillSelect(seriesSelect, series, "Semua series");

    // Auto-generate language list from manga data
    const langsArray = Array.from(
      new Set(manga.map((m) => m.language).filter(Boolean)),
    );
    const languages = langsArray.map((l) => ({ id: l, name: l.toUpperCase() }));
    fillSelect(languageSelect, languages, "Semua bahasa");

    function applyFromUrl() {
      const params = getParams();
      const q = params.get("q") || "";
      const t = params.get("translator") || "";
      const g = params.get("genre") || "";
      const s = params.get("series") || "";
      const l = params.get("language") || "";
      const f = params.get("fav") || "";
      if (searchInput) searchInput.value = q;
      if (translatorSelect) translatorSelect.value = t;
      if (genreSelect) genreSelect.value = g;
      if (seriesSelect) seriesSelect.value = s;
      if (languageSelect) languageSelect.value = l;
      if (favSelect) favSelect.checked = f === "1";
    }

    function syncToUrl() {
      const params = getParams();
      const q = searchInput?.value?.trim() || "";
      const t = translatorSelect?.value || "";
      const g = genreSelect?.value || "";
      const s = seriesSelect?.value || "";
      const l = languageSelect?.value || "";

      if (q) params.set("q", q);
      else params.delete("q");

      if (t) params.set("translator", t);
      else params.delete("translator");

      if (g) params.set("genre", g);
      else params.delete("genre");

      if (s) params.set("series", s);
      else params.delete("series");

      if (l) params.set("language", l);
      else params.delete("language");

      if (favSelect?.checked) params.set("fav", "1");
      else params.delete("fav");

      setParams(params);
    }

    function filterManga() {
      const q = normalize(searchInput?.value || "");
      const t = translatorSelect?.value || "";
      const g = genreSelect?.value || "";
      const s = seriesSelect?.value || "";
      const l = languageSelect?.value || "";
      const isFav = favSelect?.checked || false;

      return manga.filter((m) => {
        if (q && !normalize(m?.title).includes(q)) return false;
        if (t && String(m?.translator) !== String(t)) return false;
        if (s && String(m?.series) !== String(s)) return false;
        if (l && String(m?.language) !== String(l)) return false;
        if (g) {
          const arr = Array.isArray(m?.genre) ? m.genre : [];
          if (!arr.map(String).includes(String(g))) return false;
        }
        if (isFav && !Storage.isFavorite("manga", m.id)) return false;
        return true;
      });
    }

    function render(append = false) {
      if (!append) currentMangaLimit = MANGA_PER_PAGE;
      if (!grid) return;
      const filtered = filterManga();
      renderMangaGrid(grid, filtered, catalog, append);
      let visible = Math.min(currentMangaLimit, filtered.length);
      setCount(count, visible, filtered.length);
      if (statManga) statManga.textContent = String(filtered.length);
      if (empty) empty.hidden = filtered.length > 0;
      if (!append) syncToUrl();
    }

    function renderHistory() {
      const historySec = qs("#history");
      const historyTrack = qs("#history-track");
      if (!historySec || !historyTrack) return;

      const history = Storage.getHistory();
      if (!history.length) {
        historySec.style.display = "none";
        return;
      }

      let foundManga = [];
      for (const h of history) {
        const m = manga.find((x) => String(x.id) === h.id);
        if (m) foundManga.push({ ...m, resumeChapter: h.chapter });
      }

      if (!foundManga.length) {
        historySec.style.display = "none";
        return;
      }

      historySec.style.display = "block";
      historyTrack.innerHTML = "";

      for (const m of foundManga.slice(0, 8)) {
        historyTrack.appendChild(
          el(
            "a",
            { class: "history-card", href: readerHref(m.id, m.resumeChapter) },
            [
              el("img", {
                class: "history-card__cover",
                src: m.cover,
                alt: "",
                loading: "lazy",
              }),
              el("div", { class: "history-card__body" }, [
                el("h3", { class: "history-card__title", text: m.title }),
                el("p", {
                  class: "history-card__meta",
                  text: `Chapter ${m.resumeChapter}`,
                }),
              ]),
            ],
          ),
        );
      }
    }

    renderHistory();
    renderLatest(latestTrack, catalog);
    applyFromUrl();
    render();

    const sentinel = qs("#manga-sentinel");
    if (sentinel && window.IntersectionObserver) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            const filtered = filterManga();
            if (currentMangaLimit < filtered.length) {
              currentMangaLimit += MANGA_PER_PAGE;
              render(true);
            }
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(sentinel);
    }

    const onAnyChange = () => render();
    translatorSelect?.addEventListener("change", onAnyChange);
    genreSelect?.addEventListener("change", onAnyChange);
    seriesSelect?.addEventListener("change", onAnyChange);
    languageSelect?.addEventListener("change", onAnyChange);
    favSelect?.addEventListener("change", onAnyChange);
    clearBtn?.addEventListener("click", () => {
      if (translatorSelect) translatorSelect.value = "";
      if (genreSelect) genreSelect.value = "";
      if (seriesSelect) seriesSelect.value = "";
      if (languageSelect) languageSelect.value = "";
      if (favSelect) favSelect.checked = false;
      if (searchInput) searchInput.value = "";
      render();
    });

    let searchTimeout;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          render();
        }, 300);
      });
    }

    // Home tiles
    const translatorTiles = qs("#translator-tiles");

    const mangaByTranslator = countBy(manga, "translator");

    function renderTiles(target, items, getHref, getDesc, getCount) {
      if (!target) return;
      target.innerHTML = "";
      for (const it of items.slice(0, 8)) {
        target.appendChild(
          el(
            "a",
            { class: "entity-card entity-card--mini", href: getHref(it.id) },
            [
              el("img", {
                class: "entity-card__avatar",
                src:
                  it.avatar || "https://picsum.photos/seed/ptpt-avatar/200/200",
                alt: "",
                loading: "lazy",
              }),
              el("div", { class: "entity-card__body" }, [
                el("div", { class: "entity-card__title", text: it.name }),
                el("div", { class: "entity-card__desc", text: getDesc(it) }),
              ]),
              el("div", {
                class: "entity-card__count",
                text: `${getCount(it.id) || 0} karya`,
              }),
            ],
          ),
        );
      }
    }

    renderTiles(
      translatorTiles,
      translators,
      translatorHref,
      (t) => clampText(t.bio, 56),
      (id) => mangaByTranslator.get(id),
    );
  }

  function ensureModal() {
    let modal = qs("#tag-modal");
    if (modal) return modal;

    modal = el(
      "div",
      { class: "modal", id: "tag-modal", role: "dialog", "aria-modal": "true" },
      [
        el("div", {
          class: "modal__backdrop",
          "data-modal-close": "true",
          "aria-hidden": "true",
        }),
        el("div", { class: "modal__panel" }, [
          el("div", { class: "modal__banner", "aria-hidden": "true" }, [
            el("img", {
              class: "modal__banner-img",
              id: "tag-modal-banner",
              src: "https://picsum.photos/seed/ptpt-banner/1200/360",
              alt: "",
            }),
            el("div", { class: "modal__banner-overlay" }),
          ]),
          el("div", { class: "modal__head" }, [
            el("div", {}, [
              el("h3", {
                class: "modal__title",
                id: "tag-modal-title",
                text: "Info",
              }),
              el("p", { class: "modal__sub", id: "tag-modal-sub", text: "" }),
            ]),
            el("button", {
              class: "modal__close",
              type: "button",
              "data-modal-close": "true",
              "aria-label": "Tutup",
              text: "×",
            }),
          ]),
          el("div", { class: "modal__body" }, [
            el("div", { class: "modal__stats", id: "tag-modal-stats" }),
            el("div", {
              class: "modal__thumbs",
              id: "tag-modal-thumbs",
              "aria-label": "Preview judul terkait",
            }),
            el("div", { class: "modal__actions", id: "tag-modal-actions" }),
          ]),
        ]),
      ],
    );

    document.body.appendChild(modal);
    return modal;
  }

  function openModal(type, title, sub, bannerSrc, stats, thumbs, actions) {
    const modal = ensureModal();
    modal.classList.remove(
      "modal--translator",
      "modal--genre",
      "modal--series",
    );
    modal.classList.add("is-open", `modal--${type}`);

    const banner = qs("#tag-modal-banner", modal);
    const titleEl = qs("#tag-modal-title", modal);
    const subEl = qs("#tag-modal-sub", modal);
    const statsEl = qs("#tag-modal-stats", modal);
    const thumbsEl = qs("#tag-modal-thumbs", modal);
    const actionsEl = qs("#tag-modal-actions", modal);

    if (banner && bannerSrc) banner.setAttribute("src", bannerSrc);
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub || "";

    if (statsEl) {
      statsEl.innerHTML = "";
      for (const s of stats) {
        statsEl.appendChild(
          el("div", { class: "modal__stat" }, [
            el("p", { class: "modal__stat-label", text: s.label }),
            el("p", { class: "modal__stat-value", text: s.value }),
          ]),
        );
      }
    }

    if (thumbsEl) {
      thumbsEl.innerHTML = "";
      const items = Array.isArray(thumbs) ? thumbs : [];
      if (items.length) {
        for (const t of items.slice(0, 6)) {
          thumbsEl.appendChild(
            el("a", { class: "thumb", href: mangaHref(t.id), title: t.title }, [
              el("img", { class: "thumb__img", src: t.cover, alt: "" }),
              el("div", { class: "thumb__cap" }, [
                el("div", { class: "thumb__title", text: t.title }),
              ]),
            ]),
          );
        }
      } else {
        thumbsEl.appendChild(
          el("div", { class: "empty", style: "margin:0;" }, [
            "Tidak ada preview judul.",
          ]),
        );
      }
    }

    if (actionsEl) {
      actionsEl.innerHTML = "";
      for (const a of actions) {
        actionsEl.appendChild(
          el("a", {
            class: a.primary ? "btn btn--primary" : "btn btn--ghost",
            href: a.href,
            text: a.label,
          }),
        );
      }
      actionsEl.appendChild(
        el("button", {
          class: "btn btn--chip",
          type: "button",
          "data-modal-close": "true",
          text: "Tutup",
        }),
      );
    }
  }

  function closeModal() {
    const modal = qs("#tag-modal");
    if (!modal) return;
    modal.classList.remove(
      "is-open",
      "modal--translator",
      "modal--genre",
      "modal--series",
    );
  }

  function initModalEvents() {
    document.addEventListener("click", (e) => {
      const close = e.target?.closest?.("[data-modal-close]");
      if (close) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  function makeTagInfoOpener(catalog) {
    const translators = indexById(catalog.translators);
    const genres = indexById(catalog.genres);
    const series = indexById(catalog.series);
    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];

    const mangaByTranslator = countBy(manga, "translator");
    const mangaBySeries = countBy(manga, "series");
    const mangaByGenre = countByArray(manga, "genre");

    return function openTagInfo(type, id) {
      if (!type || !id) return;

      const homeAction = {
        label: "Home",
        href: "index.html#home",
        primary: false,
      };

      if (type === "translator") {
        const t = translators.get(String(id));
        if (!t) return;
        const works = manga.filter(
          (m) => String(m.translator) === String(t.id),
        );
        openModal(
          "translator",
          t.name,
          t.bio || "",
          `https://picsum.photos/seed/ptpt-tr-${encodeURIComponent(t.id)}/1200/360`,
          [
            { label: "Karya", value: String(works.length) },
            { label: "Jenis", value: "Translator" },
            { label: "Aksi", value: "Lihat profil" },
          ],
          works,
          [
            {
              label: "Buka halaman",
              href: translatorHref(t.id),
              primary: true,
            },
            {
              label: "Lihat katalog",
              href: `index.html?translator=${encodeURIComponent(t.id)}#manga`,
              primary: false,
            },
            ...(t.facebook
              ? [{ label: "Facebook", href: t.facebook, primary: false }]
              : []),
            homeAction,
          ],
        );
        return;
      }

      if (type === "series") {
        const s = series.get(String(id));
        if (!s) return;
        const picks = manga.filter((m) => String(m.series) === String(s.id));
        openModal(
          "series",
          s.name,
          s.desc || "Koleksi judul dalam satu universe/seri.",
          `https://picsum.photos/seed/ptpt-se-${encodeURIComponent(s.id)}/1200/360`,
          [
            { label: "Judul", value: String(picks.length) },
            { label: "Jenis", value: "Series" },
            { label: "Aksi", value: "Lihat judul" },
          ],
          picks,
          [
            { label: "Buka halaman", href: seriesHref(s.id), primary: true },
            {
              label: "Filter katalog",
              href: `index.html?series=${encodeURIComponent(s.id)}#manga`,
              primary: false,
            },
            homeAction,
          ],
        );
        return;
      }

      if (type === "genre") {
        const g = genres.get(String(id));
        if (!g) return;
        const picks = manga.filter((m) =>
          Array.isArray(m.genre)
            ? m.genre.map(String).includes(String(g.id))
            : false,
        );
        openModal(
          "genre",
          g.name,
          g.desc || "",
          `https://picsum.photos/seed/ptpt-ge-${encodeURIComponent(g.id)}/1200/360`,
          [
            { label: "Judul", value: String(picks.length) },
            { label: "Jenis", value: "Genre" },
            { label: "Aksi", value: "Telusuri" },
          ],
          picks,
          [
            { label: "Buka halaman", href: genreHref(g.id), primary: true },
            {
              label: "Filter katalog",
              href: `index.html?genre=${encodeURIComponent(g.id)}#manga`,
              primary: false,
            },
            homeAction,
          ],
        );
      }
    };
  }

  function renderEntityHeader(title, desc, backHref) {
    const actions = el(
      "div",
      { style: "display:flex;gap:10px;flex-wrap:wrap;" },
      [
        backHref
          ? el("a", { class: "back", href: backHref, text: "← Kembali" })
          : null,
        el("a", { class: "back", href: "index.html#home", text: "Home" }),
      ].filter(Boolean),
    );

    return el("div", { class: "card", style: "padding:16px;" }, [
      el(
        "div",
        {
          style:
            "display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;",
        },
        [
          el("div", {}, [
            el("h2", {
              style: "margin:0;font-weight:900;letter-spacing:-0.02em;",
              text: title,
            }),
            el("p", {
              style: "margin:8px 0 0;color:var(--muted);",
              text: desc,
            }),
          ]),
          actions,
        ],
      ),
    ]);
  }

  function renderProfileHeader({ title, desc, backHref, avatar, image, meta }) {
    const actions = el(
      "div",
      { class: "profile-hero__actions" },
      [
        backHref
          ? el("a", { class: "back", href: backHref, text: "â† Kembali" })
          : null,
      ].filter(Boolean),
    );

    const back = actions.querySelector(".back");
    if (back) back.textContent = "Kembali";

    return el("section", { class: "profile-hero" }, [
      el("div", { class: "profile-hero__banner", "aria-hidden": "true" }, [
        image
          ? el("img", {
              class: "profile-hero__banner-img",
              src: image,
              alt: "",
            })
          : null,
        el("div", { class: "profile-hero__banner-overlay" }),
      ]),
      el("div", { class: "profile-hero__inner" }, [
        avatar
          ? el("img", { class: "profile-hero__avatar", src: avatar, alt: "" })
          : null,
        el(
          "div",
          { class: "profile-hero__copy" },
          [
            el("h2", { class: "profile-hero__title", text: title }),
            el("p", { class: "profile-hero__desc", text: desc }),
            meta
              ? el("div", { class: "profile-hero__meta", text: meta })
              : null,
          ].filter(Boolean),
        ),
        actions,
      ]),
    ]);
  }

  function renderTranslatorList(root, translators, countMap) {
    root.innerHTML = "";
    const grid = el("div", { class: "grid grid--entities" });

    for (const t of Array.isArray(translators) ? translators : []) {
      const count = countMap.get(t.id) || 0;
      grid.appendChild(
        el("a", { class: "entity-card", href: translatorHref(t.id) }, [
          el("img", {
            class: "entity-card__avatar",
            src: t.avatar || "https://picsum.photos/seed/ptpt-avatar/200/200",
            alt: "",
            loading: "lazy",
          }),
          el("div", { class: "entity-card__body" }, [
            el("div", { class: "entity-card__title", text: t.name }),
            el("div", {
              class: "entity-card__desc",
              text: clampText(t.bio, 86),
            }),
          ]),
          el("div", { class: "entity-card__count", text: `${count} karya` }),
        ]),
      );
    }

    root.appendChild(grid);
  }

  function renderVisualEntityList(
    root,
    items,
    getHref,
    countMap,
    kindLabel,
    catalog,
  ) {
    root.innerHTML = "";
    const grid = el("div", { class: "grid grid--visual" });

    for (const it of Array.isArray(items) ? items : []) {
      const count = countMap.get(it.id) || 0;

      let imageSrc;
      if (kindLabel === "Genre" && catalog) {
        imageSrc =
          getGenrePreviewImage(catalog, it.id) ||
          it.image ||
          `https://picsum.photos/seed/ptpt-${encodeURIComponent(it.id)}/900/620`;
      } else {
        imageSrc =
          it.image ||
          `https://picsum.photos/seed/ptpt-${encodeURIComponent(it.id)}/900/620`;
      }
      grid.appendChild(
        el("a", { class: "visual-card", href: getHref(it.id) }, [
          el("img", {
            class: "visual-card__img",
            src: imageSrc,
            alt: "",
            loading: "lazy",
          }),
          el("div", { class: "visual-card__overlay" }),
          el("div", { class: "visual-card__body" }, [
            el("div", { class: "visual-card__kicker", text: kindLabel }),
            el("div", { class: "visual-card__title", text: it.name }),
            el("div", {
              class: "visual-card__desc",
              text: clampText(it.desc || "", 76),
            }),
            el("div", { class: "visual-card__meta" }, [
              el("span", {
                class: "visual-card__count",
                text: `${count} judul`,
              }),
            ]),
          ]),
        ]),
      );
    }

    root.appendChild(grid);
  }

  function renderSocialLinks(tr) {
    const socials = [
      { key: "facebook", label: "Facebook" },
      { key: "facebook2", label: "Facebook (2)" },
      { key: "SaluranFB", label: "Saluran Facebook" },
      { key: "twitter", label: "X / Twitter" },
      { key: "instagram", label: "Instagram" },
      { key: "website", label: "Website" },
      { key: "tiktok", label: "TikTok" },
      { key: "Official Website", label: "Official Website" },
      { key: "trakteer", label: "Trakteer" },
      { key: "saweria", label: "Saweria" },
      { key: "karyakarsa", label: "KaryaKarsa" },
      { key: "Patreon", label: "Patreon" },
      { key: "Bluesky", label: "Bluesky" },
      { key: "ChannelWA", label: "Channel Whatsapp" },
    ];

    return socials
      .filter((s) => tr[s.key]) // hanya yang ada
      .map((s) =>
        el("a", {
          class: "btn btn--ghost",
          href: tr[s.key],
          target: "_blank",
          rel: "noreferrer",
          text: s.label,
        }),
      );
  }

  function initTranslatorPage(catalog) {
    const root = qs("#page-root");
    if (!root) return;

    const params = getParams();
    const id = params.get("id") || "";

    const translators = Array.isArray(catalog.translators)
      ? catalog.translators
      : [];
    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];
    const byId = indexById(translators);
    const mangaByTranslator = countBy(manga, "translator");

    if (!id) {
      root.appendChild(
        renderEntityHeader(
          "Semua Translator",
          "Klik untuk melihat profil dan karya.",
          null,
        ),
      );
      const list = el("div", { style: "margin-top:14px;" });
      root.appendChild(list);
      renderTranslatorList(list, translators, mangaByTranslator);
      return;
    }

    const tr = byId.get(String(id));
    if (!tr) {
      root.appendChild(
        renderEntityHeader(
          "Translator tidak ditemukan",
          "ID tidak valid.",
          "translator.html",
        ),
      );
      return;
    }

    const works = manga.filter((m) => String(m.translator) === String(id));
    root.appendChild(
      renderProfileHeader({
        title: tr.name,
        desc: tr.bio || "—",
        backHref: "translator.html",
        avatar: tr.avatar,
        image: tr.banner || tr.avatar,
        meta: `${works.length} karya`,
      }),
    );

    // root.appendChild(
    //   el(
    //     "div",
    //     { class: "modal__actions", style: "margin-top:12px;" },
    //     [
    //       el("a", {
    //         class: "btn btn--primary",
    //         href: `index.html?translator=${encodeURIComponent(tr.id)}#manga`,
    //         text: "Lihat di Katalog",
    //       }),
    //       tr.facebook
    //         ? el("a", {
    //             class: "btn btn--ghost",
    //             href: tr.facebook,
    //             target: "_blank",
    //             rel: "noreferrer",
    //             text: "Facebook",
    //           })
    //         : null,
    //     ].filter(Boolean),
    //   ),
    // );
    root.appendChild(
      el("div", { class: "modal__actions", style: "margin-top:12px;" }, [
        el("a", {
          class: "btn btn--primary",
          href: `index.html?translator=${encodeURIComponent(tr.id)}#manga`,
          text: "Lihat di Katalog",
        }),

        // 🔥 AUTO SOCIAL LINKS
        ...renderSocialLinks(tr),
      ]),
    );

    root.appendChild(
      el(
        "div",
        {
          style:
            "margin-top:14px;display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;",
        },
        [
          el("h3", {
            style: "margin:0;font-weight:900;letter-spacing:-0.02em;",
            text: "Karya",
          }),
          el("p", {
            style: "margin:0;color:var(--muted);",
            text: `${works.length} judul`,
          }),
        ],
      ),
    );

    const grid = el("div", {
      class: "grid grid--manga",
      style: "margin-top:12px;",
    });
    renderMangaGrid(grid, works, catalog);
    root.appendChild(grid);
  }

  function initGenrePage(catalog) {
    const root = qs("#page-root");
    if (!root) return;

    const params = getParams();
    const id = params.get("id") || "";

    const genres = Array.isArray(catalog.genres) ? catalog.genres : [];
    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];
    const byId = indexById(genres);
    const mangaByGenre = countByArray(manga, "genre");

    if (!id) {
      root.appendChild(
        renderEntityHeader(
          "Semua Genre",
          "Klik genre untuk melihat manga terkait.",
          null,
        ),
      );
      const list = el("div", { style: "margin-top:14px;" });
      root.appendChild(list);
      renderVisualEntityList(
        list,
        genres,
        genreHref,
        mangaByGenre,
        "Genre",
        catalog,
      );
      return;
    }

    const g = byId.get(String(id));
    if (!g) {
      root.appendChild(
        renderEntityHeader(
          "Genre tidak ditemukan",
          "ID tidak valid.",
          "genre.html",
        ),
      );
      return;
    }

    const picks = manga.filter((m) =>
      Array.isArray(m.genre) ? m.genre.map(String).includes(String(id)) : false,
    );
    root.appendChild(
      renderProfileHeader({
        title: g.name,
        desc: g.desc || "—",
        backHref: "genre.html",
        image:
          g.image ||
          `https://picsum.photos/seed/ptpt-ge-${encodeURIComponent(g.id)}/1200/360`,
        meta: `${picks.length} judul`,
      }),
    );

    root.appendChild(
      el(
        "div",
        {
          style:
            "margin-top:14px;display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;",
        },
        [
          el("h3", {
            style: "margin:0;font-weight:900;letter-spacing:-0.02em;",
            text: "Manga",
          }),
          el("p", {
            style: "margin:0;color:var(--muted);",
            text: `${picks.length} judul`,
          }),
        ],
      ),
    );

    const grid = el("div", {
      class: "grid grid--manga",
      style: "margin-top:12px;",
    });
    renderMangaGrid(grid, picks, catalog);
    root.appendChild(grid);
  }

  function initSeriesPage(catalog) {
    const root = qs("#page-root");
    if (!root) return;

    const params = getParams();
    const id = params.get("id") || "";

    const series = Array.isArray(catalog.series) ? catalog.series : [];
    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];
    const byId = indexById(series);
    const mangaBySeries = countBy(manga, "series");

    if (!id) {
      root.appendChild(
        renderEntityHeader(
          "Semua Series",
          "Klik series untuk melihat manga terkait.",
          null,
        ),
      );
      const list = el("div", { style: "margin-top:14px;" });
      root.appendChild(list);
      renderVisualEntityList(
        list,
        series,
        seriesHref,
        mangaBySeries,
        "Series",
        catalog,
      );
      return;
    }

    const s = byId.get(String(id));
    if (!s) {
      root.appendChild(
        renderEntityHeader(
          "Series tidak ditemukan",
          "ID tidak valid.",
          "series.html",
        ),
      );
      return;
    }

    const picks = manga.filter((m) => String(m.series) === String(id));
    root.appendChild(
      renderProfileHeader({
        title: s.name,
        desc: s.desc || "Daftar manga dalam series ini.",
        backHref: "series.html",
        image:
          s.image ||
          `https://picsum.photos/seed/ptpt-se-${encodeURIComponent(s.id)}/1200/360`,
        meta: `${picks.length} judul`,
      }),
    );

    root.appendChild(
      el(
        "div",
        {
          style:
            "margin-top:14px;display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;",
        },
        [
          el("h3", {
            style: "margin:0;font-weight:900;letter-spacing:-0.02em;",
            text: "Manga",
          }),
          el("p", {
            style: "margin:0;color:var(--muted);",
            text: `${picks.length} judul`,
          }),
        ],
      ),
    );

    const grid = el("div", {
      class: "grid grid--manga",
      style: "margin-top:12px;",
    });
    renderMangaGrid(grid, picks, catalog);
    root.appendChild(grid);
  }

  async function init() {
    initYear();
    initNav();

    let catalog;
    const page = document.body?.dataset?.page || "";

    if (page === "index") {
      const grid = qs("#manga-grid");
      if (grid && !catalog) {
        // If catalog isn't loaded yet
        renderSkeletonGrid(grid, 20);
      }
    }

    try {
      catalog = await loadData();
    } catch (err) {
      console.error(err);
      return;
    }
    initModalEvents();
    const openTagInfo = makeTagInfoOpener(catalog);

    document.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-tag][data-id]");
      if (!btn) return;
      e.preventDefault();
      openTagInfo(btn.getAttribute("data-tag"), btn.getAttribute("data-id"));
    });

    initGlobalSearch(catalog, page === "index" ? () => {} : null);

    if (page === "index") initIndexPage(catalog);
    if (page === "translator") initTranslatorPage(catalog);
    if (page === "genre") initGenrePage(catalog);
    if (page === "series") initSeriesPage(catalog);

    window.PTPT = window.PTPT || {};
    window.PTPT.openTagInfo = openTagInfo;
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
