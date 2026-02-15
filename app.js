const NL_BOUNDS = {
  minLat: 50.7,
  maxLat: 53.7,
  minLon: 3.1,
  maxLon: 7.3,
};
const APP_VERSION = "1.16";

const els = {
  statusCard: document.getElementById("statusCard"),
  statusText: document.getElementById("statusText"),
  durationText: document.getElementById("durationText"),
  refreshBtn: document.getElementById("refreshBtn"),
  notifyBtn: document.getElementById("notifyBtn"),
  metaText: document.getElementById("metaText"),
  driverGrid: document.getElementById("driverGrid"),
  nextChangeText: document.getElementById("nextChangeText"),
  hourlyList: document.getElementById("hourlyList"),
};

let lastState = null;
let lastData = null;
let notifyEnabled = localStorage.getItem("notifyEnabled") === "1";

function inNetherlands(lat, lon) {
  return (
    lat >= NL_BOUNDS.minLat &&
    lat <= NL_BOUNDS.maxLat &&
    lon >= NL_BOUNDS.minLon &&
    lon <= NL_BOUNDS.maxLon
  );
}

function getAdvice(hour) {
  const wind = hour.wind_speed_10m ?? 0;
  const pm25 = hour.pm2_5 ?? 0;
  const euIndex = hour.european_aqi ?? 0;
  const bft = windMsToBeaufort(wind);
  const lki = pm25ToLki(pm25);

  const windLevel = bft <= 2 ? "red" : "green";
  const lkiLevel = lki >= 7 ? "red" : lki >= 4 ? "orange" : "green";
  const euLevel = euIndex > 60 ? "red" : euIndex > 40 ? "orange" : "green";

  const allGreen = windLevel === "green" && lkiLevel === "green" && euLevel === "green";

  return {
    state: allGreen ? "green" : "red",
    wind,
    bft,
    lki,
    euIndex,
    indicators: [
      {
        key: "wind",
        title: "Bft",
        level: windLevel,
        value: `${bft} Bft`,
        note: `${wind.toFixed(1)} m/s`,
      },
      {
        key: "lki",
        title: "LKI",
        level: lkiLevel,
        value: `${lki}`,
        note: `PM2.5: ${pm25.toFixed(0)} ug/m3`,
      },
      {
        key: "eu",
        title: "EU Index",
        level: euLevel,
        value: `${euIndex.toFixed(0)}`,
        note: "Europese AQI",
      },
    ],
  };
}

function windMsToBeaufort(windMs) {
  if (windMs < 0.3) return 0;
  if (windMs <= 1.5) return 1;
  if (windMs <= 3.3) return 2;
  if (windMs <= 5.4) return 3;
  if (windMs <= 7.9) return 4;
  if (windMs <= 10.7) return 5;
  if (windMs <= 13.8) return 6;
  if (windMs <= 17.1) return 7;
  if (windMs <= 20.7) return 8;
  if (windMs <= 24.4) return 9;
  if (windMs <= 28.4) return 10;
  if (windMs <= 32.6) return 11;
  return 12;
}

function hoursUntilStateChange(startIndex, states) {
  const current = states[startIndex];
  let count = 0;
  for (let i = startIndex; i < states.length; i += 1) {
    if (states[i] !== current) break;
    count += 1;
  }
  return count;
}

function pm25ToLki(pm25) {
  if (pm25 <= 5) return 1;
  if (pm25 <= 10) return 2;
  if (pm25 <= 20) return 3;
  if (pm25 <= 30) return 4;
  if (pm25 <= 40) return 5;
  if (pm25 <= 50) return 6;
  if (pm25 <= 60) return 7;
  if (pm25 <= 70) return 8;
  if (pm25 <= 80) return 9;
  if (pm25 <= 90) return 10;
  return 11;
}

function setStatus(state, durationHours, untilLabel, nextGreenLabel) {
  els.statusCard.classList.remove("status-loading", "status-green", "status-red");
  els.statusCard.classList.add(state === "green" ? "status-green" : "status-red");
  document.body.classList.remove("bg-green", "bg-red");
  document.body.classList.add(state === "green" ? "bg-green" : "bg-red");
  els.statusText.textContent = state === "green" ? "Stoken toegestaan" : "Liever niet stoken";
  els.durationText.textContent =
    state === "green"
      ? `Verwacht nog ${durationHours} uur gunstig (${untilLabel}).`
      : `Verwacht nog ${durationHours} uur ongunstig (${untilLabel}).`;
  if (state === "red" && nextGreenLabel) {
    els.durationText.textContent += ` Mogelijk groen vanaf ${nextGreenLabel}.`;
  }
}

function renderDrivers(indicators) {
  els.driverGrid.innerHTML = "";
  indicators.forEach((item) => {
    const normalizedLevel =
      item.key === "wind" && item.level === "orange" ? "green" : item.level;
    const node = document.createElement("article");
    node.className = `driver driver-${normalizedLevel}`;
    const label =
      normalizedLevel === "green"
        ? "Groen"
        : normalizedLevel === "orange"
          ? "Oranje"
          : "Rood";
    node.innerHTML = `
      <p class="driver-title">${item.title}</p>
      <span class="driver-pill">${label}</span>
      <p class="driver-value">${item.value}</p>
      <p class="driver-note">${item.note}</p>
    `;
    els.driverGrid.appendChild(node);
  });
}

function renderHourlyList(hours, advices, startIndex) {
  els.hourlyList.innerHTML = "";
  for (let i = startIndex; i < Math.min(startIndex + 48, hours.length); i += 1) {
    const dt = new Date(hours[i].time);
    const a = advices[i];
    const stateLabel = a.state === "green" ? "Groen" : "Rood";
    const row = document.createElement("div");
    row.className = `hour-row ${a.state === "green" ? "hour-green" : "hour-red"}`;
    row.innerHTML = `
      <div class="hour-left">
        <div class="hour-dot" aria-hidden="true"></div>
        <div>${dt.getHours().toString().padStart(2, "0")}:00</div>
      </div>
      <div class="hour-metrics">Bft ${a.bft} | LKI ${a.lki} | EU ${a.euIndex.toFixed(0)}</div>
      <div class="hour-state">${stateLabel}</div>
    `;
    els.hourlyList.appendChild(row);
  }
}

function renderNextChange(states, hours, startIndex) {
  const current = states[startIndex];
  let nextIndex = -1;
  for (let i = startIndex + 1; i < states.length; i += 1) {
    if (states[i] !== current) {
      nextIndex = i;
      break;
    }
  }

  if (nextIndex === -1) {
    els.nextChangeText.textContent = "Geen verandering in de komende periode.";
    return;
  }

  const dt = new Date(hours[nextIndex].time);
  const label = `${dt.getHours().toString().padStart(2, "0")}:00`;
  const nextState = states[nextIndex] === "green" ? "groen" : "rood";
  els.nextChangeText.textContent = `Volgende wijziging om ${label} naar ${nextState}.`;
}

function maybeNotifyTransition(state) {
  if (!notifyEnabled || Notification.permission !== "granted") return;
  if (lastState === "red" && state === "green") {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification("Stookmelding", {
        body: "Het is nu gunstig om te stoken (groen).",
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
      });
    });
  }
}

async function fetchData(lat, lon) {
  const cacheBust = Date.now();
  const weatherUrl =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&hourly=wind_speed_10m,wind_gusts_10m" +
    "&wind_speed_unit=ms" +
    "&forecast_days=2&timezone=auto" +
    `&cb=${cacheBust}`;

  const airUrl =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${lat}&longitude=${lon}` +
    "&hourly=pm2_5,european_aqi" +
    "&forecast_days=2&timezone=auto" +
    `&cb=${cacheBust}`;

  const [weatherResp, airResp] = await Promise.all([
    fetch(weatherUrl, { cache: "no-store" }),
    fetch(airUrl, { cache: "no-store" }),
  ]);
  if (!weatherResp.ok || !airResp.ok) {
    throw new Error("Kan gegevens niet ophalen.");
  }

  const weather = await weatherResp.json();
  const air = await airResp.json();

  const times = weather.hourly.time;
  const now = new Date();
  const nowMs = now.getTime();

  const hours = times.map((time, i) => ({
    time,
    wind_speed_10m: weather.hourly.wind_speed_10m[i],
    wind_gusts_10m: weather.hourly.wind_gusts_10m[i],
    pm2_5: air.hourly.pm2_5[i],
    european_aqi: air.hourly.european_aqi[i],
  }));

  // Neem het huidige uur (laatste tijdstip <= nu), niet het eerstvolgende uur.
  let startIndex = 0;
  for (let i = 0; i < hours.length; i += 1) {
    const t = new Date(hours[i].time).getTime();
    if (t <= nowMs) startIndex = i;
    else break;
  }
  return {
    hours,
    startIndex,
    timezone: weather.timezone,
  };
}

function updateMeta(lat, lon, timezone) {
  const roundedLat = lat.toFixed(4);
  const roundedLon = lon.toFixed(4);
  els.metaText.textContent = `Locatie: ${roundedLat}, ${roundedLon} | Tijdzone: ${timezone} | App ${APP_VERSION}`;
}

function renderFromData(payload) {
  const { hours, startIndex } = payload;
  const advices = hours.map(getAdvice);
  const states = advices.map((a) => a.state);

  const current = advices[startIndex];
  const duration = hoursUntilStateChange(startIndex, states);
  const untilIndex = Math.min(startIndex + duration, hours.length - 1);
  const untilHour = new Date(hours[untilIndex].time);
  const untilLabel = `tot ${untilHour.getHours().toString().padStart(2, "0")}:00`;
  const nextGreenIndex = states.findIndex((s, i) => i > startIndex && s === "green");
  const nextGreenLabel =
    nextGreenIndex === -1
      ? ""
      : `${new Date(hours[nextGreenIndex].time).getHours().toString().padStart(2, "0")}:00`;
  const activeHour = new Date(hours[startIndex].time);
  const activeHourLabel = `${activeHour.getHours().toString().padStart(2, "0")}:00`;

  setStatus(current.state, duration, untilLabel, nextGreenLabel);
  renderDrivers(current.indicators);
  renderNextChange(states, hours, startIndex);
  renderHourlyList(hours, advices, startIndex);
  els.metaText.textContent += ` | Actief uur: ${activeHourLabel}`;

  maybeNotifyTransition(current.state);
  lastState = current.state;
  lastData = payload;
}

async function requestLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

async function refresh() {
  try {
    els.statusCard.classList.remove("status-green", "status-red");
    els.statusCard.classList.add("status-loading");
    els.statusText.textContent = "Locatie en data ophalen...";
    els.durationText.textContent = "Even geduld.";

    const coords = await requestLocation();
    const lat = coords.latitude;
    const lon = coords.longitude;

    if (!inNetherlands(lat, lon)) {
      throw new Error("Deze versie werkt alleen binnen Nederland.");
    }

    const payload = await fetchData(lat, lon);
    updateMeta(lat, lon, payload.timezone);
    renderFromData(payload);
  } catch (err) {
    els.statusCard.classList.remove("status-green", "status-red");
    els.statusCard.classList.add("status-red");
    document.body.classList.remove("bg-green");
    document.body.classList.add("bg-red");
    els.statusText.textContent = "Kon geen advies maken";
    els.durationText.textContent = err.message || "Onbekende fout.";
    els.driverGrid.innerHTML = "";
    els.nextChangeText.textContent = "";
    els.hourlyList.innerHTML = "";
  }
}

async function toggleNotifications() {
  if (!("Notification" in window)) {
    els.metaText.textContent = "Meldingen worden niet ondersteund door deze browser.";
    return;
  }

  if (Notification.permission === "denied") {
    els.metaText.textContent = "Meldingen staan geblokkeerd in browserinstellingen.";
    return;
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      els.metaText.textContent = "Geen toestemming voor meldingen.";
      return;
    }
  }

  notifyEnabled = !notifyEnabled;
  localStorage.setItem("notifyEnabled", notifyEnabled ? "1" : "0");
  els.notifyBtn.textContent = notifyEnabled ? "Melding uitzetten" : "Melding aanzetten";

  if (notifyEnabled && lastData) {
    const currentState = getAdvice(lastData.hours[lastData.startIndex]).state;
    if (currentState === "green") {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification("Stookmelding", {
          body: "Meldingen zijn actief. Het is op dit moment groen.",
          icon: "icons/icon-192.png",
          badge: "icons/icon-192.png",
        });
      });
    }
  }
}

function setupAutoRefresh() {
  setInterval(() => {
    refresh();
  }, 15 * 60 * 1000);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }
}

function init() {
  els.notifyBtn.textContent = notifyEnabled ? "Melding uitzetten" : "Melding aanzetten";
  els.refreshBtn.addEventListener("click", refresh);
  els.notifyBtn.addEventListener("click", toggleNotifications);
  registerServiceWorker();
  setupAutoRefresh();
  refresh();
}

init();
