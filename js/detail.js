/* PT Prajurit Translation — detail.js
   - detail.html: info manga + link translator/genre/series + chapter list + read buttons
   - reader.html: vertical scroll reader (dummy images via picsum)
*/

(function () {
  "use strict";

  const DATA_URL = "data/manga.json";

  let dataPromise = null;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      if (key === "class") node.className = String(value);
      else if (key === "text") node.textContent = String(value);
      else if (key === "href" || key === "src" || key === "alt")
        node.setAttribute(key, String(value));
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

  function getMaxChapter(manga) {
    const chapters = Array.isArray(manga?.chapters) ? manga.chapters : [];
    return chapters.reduce((acc, ch) => {
      const n = Number(ch?.number);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
  }

  function readerHref(id, ch) {
    return `reader.html?id=${encodeURIComponent(id)}&ch=${encodeURIComponent(String(ch))}`;
  }

  function initDetailPage(catalog) {
    const root = qs("#detail-root");
    if (!root) return;

    const id = getParams().get("id") || "";
    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];
    const translators = indexById(catalog.translators);
    const genres = indexById(catalog.genres);
    const series = indexById(catalog.series);

    const found = manga.find((m) => String(m.id) === String(id));
    if (!id || !found) {
      root.innerHTML = "";
      root.appendChild(
        el("div", { class: "empty" }, [
          el("p", { style: "margin:0;", text: "Manga tidak ditemukan." }),
          el("p", { style: "margin:10px 0 0;" }, [
            el("a", {
              class: "link link--accent",
              href: "index.html#manga",
              text: "Kembali ke katalog",
            }),
          ]),
        ]),
      );
      return;
    }

    document.title = `${found.title} — PT Prajurit Translation`;

    const tr = translators.get(String(found.translator));
    const sr = series.get(String(found.series));
    const g = Array.isArray(found.genre)
      ? found.genre.map((id2) => genres.get(String(id2))).filter(Boolean)
      : [];

    const maxCh = getMaxChapter(found) || 1;
    const chapters = Array.isArray(found.chapters)
      ? found.chapters
          .slice()
          .sort((a, b) => Number(a.number) - Number(b.number))
      : [];

    root.innerHTML = "";

    root.appendChild(
      el("div", { class: "detail" }, [
        el("div", { class: "detail__cover" }, [
          el("img", { src: found.cover, alt: "" }),
        ]),
        el("div", { class: "detail__body" }, [
          el("h2", { class: "detail__title" }, [
            found.title,
            found.language ? el("span", { class: "lang-badge", text: `[${found.language}]` }) : null
          ]),
          el(
            "div",
            { class: "detail__meta" },
            [
              tr
                ? el(
                    "button",
                    {
                      class: "chip chip--accent",
                      type: "button",
                      "data-tag": "translator",
                      "data-id": tr.id,
                    },
                    [`Translator: ${tr.name}`],
                  )
                : null,
              sr
                ? el(
                    "button",
                    {
                      class: "chip",
                      type: "button",
                      "data-tag": "series",
                      "data-id": sr.id,
                    },
                    [`Series: ${sr.name}`],
                  )
                : null,
              ...g.map((gi) =>
                el(
                  "button",
                  {
                    class: "chip",
                    type: "button",
                    "data-tag": "genre",
                    "data-id": gi.id,
                  },
                  [gi.name],
                ),
              ),
            ].filter(Boolean),
          ),
          el("p", {
            class: "detail__desc",
            text: found.description || "Tidak ada deskripsi.",
          }),
          el("div", { class: "detail__actions", style: "display: flex; gap: 10px; align-items: center;" }, [
            el("a", {
              class: "btn btn--primary",
              href: readerHref(found.id, 1),
              text: "Baca Chapter 1",
            }),
            el("a", {
              class: "btn btn--ghost",
              href: readerHref(found.id, maxCh),
              text: "Baca Terbaru",
            }),
            (function() {
              if (window.renderBookmarkBtn) {
                 const bb = window.renderBookmarkBtn("manga", found.id);
                 bb.style.position = 'relative';
                 bb.style.top = '0';
                 bb.style.right = '0';
                 bb.style.width = '44px';
                 bb.style.height = '44px';
                 return bb;
              }
              return null;
            })()
          ]),
        ]),
      ]),
    );

    root.appendChild(
      el("section", { class: "chapters", "aria-label": "Daftar chapter" }, [
        el("div", { class: "chapters__head" }, [
          el("h3", { class: "chapters__title", text: "Chapter" }),
          el("p", {
            class: "chapters__meta",
            text: `${chapters.length} chapter`,
          }),
        ]),
        el(
          "div",
          { class: "chapters__list" },
          chapters.map((ch) => {
            const number = Number(ch?.number) || 1;
            const pageCount = typeof ch?.pages === "number" ? ch.pages : (Array.isArray(ch?.pages) ? ch.pages.length : 0);
            return el(
              "a",
              { class: "chapter", href: readerHref(found.id, number) },
              [
                el("div", { class: "chapter__left" }, [
                  el("p", {
                    class: "chapter__title",
                    text: `Chapter ${number}`,
                  }),
                  el("p", {
                    class: "chapter__meta",
                    text: `${pageCount} halaman`,
                  }),
                ]),
                el("span", { class: "chip chip--accent", text: "Baca" }),
              ],
            );
          }),
        ),
      ]),
    );
  }

  function picsumPageSrc(mangaId, chapterNumber, pageIndex) {
    const seed = encodeURIComponent(
      `ptpt-${mangaId}-ch${chapterNumber}-p${pageIndex}`,
    );
    return `https://picsum.photos/seed/${seed}/900/1300`;
  }

  function initReaderPage(catalog) {
    const pagesRoot = qs("#reader-pages");
    const title = qs("#reader-title");
    const meta = qs("#reader-meta");
    const back = qs("#reader-back");
    const select = qs("#bar-chapter");
    const barBack = qs("#bar-back");
    const barCounter = qs("#bar-counter");

    if (!pagesRoot || !title || !meta || !select || !barCounter)
      return;

    const params = getParams();
    const id = params.get("id") || "";
    const raw = Number(params.get("ch") || "1");
    const requestedCh = Number.isFinite(raw) && raw > 0 ? raw : 1;

    const manga = Array.isArray(catalog.manga) ? catalog.manga : [];
    const translators = indexById(catalog.translators);
    const found = manga.find((m) => String(m.id) === String(id));

    if (!id || !found) {
      pagesRoot.innerHTML = "";
      pagesRoot.appendChild(
        el("div", { class: "empty" }, [
          el("p", { style: "margin:0;", text: "Manga tidak ditemukan." }),
        ]),
      );
      return;
    }

    const chapters = Array.isArray(found.chapters)
      ? found.chapters
          .slice()
          .sort((a, b) => Number(a.number) - Number(b.number))
      : [];
    const chapter =
      chapters.find((c) => Number(c.number) === Number(requestedCh)) ||
      chapters[0];
    const currentCh = Number(chapter?.number) || 1;

    if (window.PTPT_Storage) {
      window.PTPT_Storage.saveHistory(id, currentCh);
    }

    function applyReaderSettings() {
      const settings = JSON.parse(localStorage.getItem("ptpt_reader_settings") || '{"direction":"vertical","fit":"width"}');
      pagesRoot.className = "container reader__pages";
      if (settings.direction === "horizontal") {
          pagesRoot.classList.add("reader-mode--horizontal");
      }
      if (settings.fit === "width") {
          pagesRoot.classList.add("reader-fit--width");
      } else if (settings.fit === "height") {
          pagesRoot.classList.add("reader-fit--height");
      }
      
      const selectDir = document.getElementById("setting-direction");
      const selectFit = document.getElementById("setting-fit");
      if (selectDir) selectDir.value = settings.direction;
      if (selectFit) selectFit.value = settings.fit;
    }

    applyReaderSettings();
    window.addEventListener("storage", applyReaderSettings); // listen to changes from modal
    
    // Add logic for Settings Modal
    const btnSettings = document.getElementById("btn-reader-settings");
    const modalSettings = document.getElementById("reader-settings-modal");
    if (btnSettings && modalSettings) {
        btnSettings.addEventListener("click", () => {
             modalSettings.classList.toggle("is-open");
        });
        document.addEventListener("click", (e) => {
             if (!e.target.closest("#btn-reader-settings") && !e.target.closest("#reader-settings-modal")) {
                 modalSettings.classList.remove("is-open");
             }
        });
        
        const saveSettings = () => {
            const selectDir = document.getElementById("setting-direction");
            const selectFit = document.getElementById("setting-fit");
            const settings = {
                direction: selectDir.value,
                fit: selectFit.value
            };
            localStorage.setItem("ptpt_reader_settings", JSON.stringify(settings));
            applyReaderSettings();
        };

        const selectDir = document.getElementById("setting-direction");
        const selectFit = document.getElementById("setting-fit");
        if (selectDir) selectDir.addEventListener("change", saveSettings);
        if (selectFit) selectFit.addEventListener("change", saveSettings);
    }
    
    const maxCh = getMaxChapter(found) || 1;
    let pagesPaths = [];
    if (typeof chapter?.pages === "number" && chapter.folder) {
      const ext = chapter.extension || ".jpg";
      const start = chapter.startFrom !== undefined ? chapter.startFrom : 1;
      const end = start + chapter.pages - 1;
      for (let i = start; i <= end; i++) {
        pagesPaths.push(`${chapter.folder}${i}${ext}`);
      }
    } else if (Array.isArray(chapter?.pages)) {
      pagesPaths = chapter.pages;
    }

    document.title = `Reader — ${found.title}`;
    title.textContent = found.title;

    const tr = translators.get(String(found.translator));
    meta.textContent = `${tr?.name || "Translator"} • Chapter ${currentCh} • ${pagesPaths.length} halaman`;

    const detailHref = `detail.html?id=${encodeURIComponent(found.id)}`;
    if (back) back.href = detailHref;
    if (barBack) barBack.href = detailHref;

    select.innerHTML = "";
    for (const c of chapters) {
      const n = Number(c?.number) || 1;
      select.appendChild(
        el("option", { value: String(n), text: `Chapter ${n}` }),
      );
    }
    select.value = String(currentCh);

    function goToChapter(n) {
      window.location.href = readerHref(found.id, n);
    }

    select.addEventListener("change", () =>
      goToChapter(Number(select.value) || 1),
    );

    pagesRoot.innerHTML = "";
    barCounter.textContent = `1 / ${pagesPaths.length || 1}`;

    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = entry.target.getAttribute("data-index");
          barCounter.textContent = `${Number(index) + 1} / ${pagesPaths.length}`;
        }
      });
    }, {
      root: null,
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0
    });

    for (let i = 0; i < pagesPaths.length; i++) {
      const img = el("img", {
        class: "reader__page",
        src: pagesPaths[i],
        alt: `Halaman ${i + 1}`,
        loading: "lazy",
        "data-index": String(i)
      });
      pagesRoot.appendChild(img);
      observer.observe(img);
    }

    if (currentCh < maxCh) {
      const nextBtnWrapper = el("div", {
        style: "display:flex; justify-content:center; padding: 40px 20px 80px;"
      }, [
        el("a", {
          class: "btn btn--primary",
          style: "padding: 0 40px; height: 50px; font-size: 1.1rem;",
          href: readerHref(found.id, currentCh + 1),
          text: "Berikutnya: Chapter " + (currentCh + 1) + " ➔"
        })
      ]);
      pagesRoot.appendChild(nextBtnWrapper);
    }
  }

  async function init() {
    let catalog;
    try {
      catalog = await loadData();
    } catch (err) {
      console.error(err);
      return;
    }

    const page = document.body?.dataset?.page || "";
    if (page === "detail") initDetailPage(catalog);
    if (page === "reader") initReaderPage(catalog);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
