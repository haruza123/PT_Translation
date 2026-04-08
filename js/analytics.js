(function () {
  "use strict";

  var MEASUREMENT_ID = "G-DSNYJP1640";

  if (!MEASUREMENT_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };

  var gtag = window.gtag;

  function loadGtagScript() {
    var exists = document.querySelector(
      'script[src^="https://www.googletagmanager.com/gtag/js?id="]',
    );
    if (exists) return;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    document.head.appendChild(s);
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function getVirtualPath() {
    var page = (document.body && document.body.dataset && document.body.dataset.page) || "web";
    var id = getParam("id");
    var ch = getParam("ch");

    if (page === "translator") return id ? "/translator/" + id : "/translator";
    if (page === "genre") return id ? "/genre/" + id : "/genre";
    if (page === "series") return id ? "/series/" + id : "/series";
    if (page === "detail") return id ? "/manga/" + id : "/manga";
    if (page === "reader") {
      if (id && ch) return "/reader/" + id + "/chapter/" + ch;
      if (id) return "/reader/" + id;
      return "/reader";
    }
    if (page === "index") return "/home";
    return "/" + page;
  }

  function track(eventName, params) {
    gtag("event", eventName, params || {});
  }

  function trackPageView() {
    var pageType = (document.body && document.body.dataset && document.body.dataset.page) || "web";
    var pagePath = getVirtualPath();

    track("page_view", {
      page_title: document.title,
      page_path: pagePath,
      page_type: pageType,
    });
  }

  function bindClickTracking() {
    document.addEventListener("click", function (e) {
      var tagBtn = e.target && e.target.closest && e.target.closest("[data-tag][data-id]");
      if (tagBtn) {
        track("open_tag_info", {
          tag_type: tagBtn.getAttribute("data-tag") || "",
          tag_id: tagBtn.getAttribute("data-id") || "",
        });
        return;
      }

      var link = e.target && e.target.closest && e.target.closest("a[href]");
      if (!link) return;

      var href = link.getAttribute("href") || "";
      if (!href) return;

      if (href.indexOf("detail.html?id=") > -1) {
        track("select_manga", { link_url: href });
      } else if (href.indexOf("reader.html?id=") > -1) {
        track("open_reader", { link_url: href });
      } else if (href.indexOf("translator.html?id=") > -1) {
        track("view_translator_profile", { link_url: href });
      } else if (href.indexOf("genre.html?id=") > -1) {
        track("view_genre", { link_url: href });
      } else if (href.indexOf("series.html?id=") > -1) {
        track("view_series", { link_url: href });
      }
    });
  }

  loadGtagScript();
  gtag("js", new Date());
gtag("config", MEASUREMENT_ID);

  window.PTPTAnalytics = {
    track: track,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      trackPageView();
      bindClickTracking();
    });
  } else {
    trackPageView();
    bindClickTracking();
  }
})();
