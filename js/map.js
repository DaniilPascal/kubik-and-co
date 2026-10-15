/**
 * ПР №2 — API карты магазина (Leaflet + OpenStreetMap)
 * Координаты: учебная точка у ст. м. Василеостровская, СПб
 */
(function () {
  "use strict";

  const STORE = {
    lat: 59.9425,
    lng: 30.2781,
    title: "Кубик & Ко",
    address: "ул. Игровая, д. 28",
  };

  function initMap() {
    const el = document.getElementById("store-map");
    if (!el || typeof L === "undefined") return;

    const map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([STORE.lat, STORE.lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

    setTimeout(() => map.invalidateSize(), 200);
  }

  /** Доп. API: погода у магазина (Open-Meteo, без ключа) */
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
        "<strong>Сейчас у магазина:</strong> " +
        (t != null ? Math.round(t) + " °C" : "—") +
        ". " +
        hint;
      box.hidden = false;
    } catch (err) {
      box.textContent = "Не удалось загрузить погоду (API Open-Meteo).";
      box.hidden = false;
      console.warn(err);
    }
  }

  function weatherHint(code) {
    if (code == null) return "Отличный повод для партии в настолки.";
    if (code === 0) return "Ясно — идеально дойти до игротеки пешком.";
    if (code <= 3) return "Переменная облачность — самое время занять стол.";
    if (code >= 51 && code <= 67) return "Дождик снаружи — тёплые миплы внутри.";
    if (code >= 71) return "Снег? Берите какао и «Каркассон».";
    return "Хороший вечер для настольной игры.";
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadWeather();
  });
})();
