/**
 * ПР №2 — API карты магазина (Leaflet + OpenStreetMap)
 */
(function () {
  "use strict";

  const STORE = {
    lat: 59.9425,
    lng: 30.2781,
    title: "Кубик & Ко",
    address: "ул. Игровая, д. 28",
  };

  function syncMapHeight() {
    const mapEl = document.getElementById("store-map");
    const panel = document.getElementById("contact-panel");
    if (!mapEl || !panel) return;
    const h = Math.max(panel.offsetHeight - 48, 280);
    mapEl.style.height = h + "px";
  }

  function initMap() {
    const el = document.getElementById("store-map");
    if (!el || typeof L === "undefined") return;

    syncMapHeight();

    const map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: false,
    }).setView([STORE.lat, STORE.lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "",
    }).addTo(map);

    const icon = L.divIcon({
      className: "store-marker",
      html: '<span class="store-marker__dot"></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([STORE.lat, STORE.lng], { icon })
      .addTo(map)
      .bindPopup(
        "<strong>" +
          STORE.title +
          "</strong><br>" +
          STORE.address +
          "<br>Ежедневно 11:00–21:00"
      )
      .openPopup();

    setTimeout(() => {
      syncMapHeight();
      map.invalidateSize();
    }, 200);

    window.addEventListener("resize", () => {
      syncMapHeight();
      map.invalidateSize();
    });
  }

  async function loadWeather() {
    const box = document.getElementById("store-weather");
    if (!box) return;

    try {
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=" +
        STORE.lat +
        "&longitude=" +
        STORE.lng +
        "&current=temperature_2m,weather_code&timezone=Europe%2FMoscow";
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather http " + res.status);
      const data = await res.json();
      const t = data.current?.temperature_2m;
      const code = data.current?.weather_code;
      const hint = weatherHint(code);
      box.innerHTML =
        "<span class='weather-temp'>" +
        (t != null ? Math.round(t) + " °C" : "—") +
        "</span> · " +
        hint;
      box.hidden = false;
    } catch (err) {
      box.textContent = "Погода временно недоступна";
      box.hidden = false;
      console.warn(err);
    }
  }

  function weatherHint(code) {
    if (code == null) return "время для настолок";
    if (code === 0) return "ясно";
    if (code <= 3) return "облачно — самое время за стол";
    if (code >= 51 && code <= 67) return "дождь — играйте внутри";
    if (code >= 71) return "снег — берите какао";
    return "хороший вечер для игры";
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadWeather();
  });
})();
