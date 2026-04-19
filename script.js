const BLOCKLIST = {
    ids: [],
    names: ["Soundboard", "[!] COMMENTS", "", "[!] SUGGEST GAMES .gg/D4c9VFYWyU"]
};

const CDN_SOURCES = [
    {
        name: "gn-math",
        zones: "https://cdn.jsdelivr.net/gh/freebuisness/assets@main/zones.json",
        covers: "https://cdn.jsdelivr.net/gh/freebuisness/covers@main",
        html: "https://cdn.jsdelivr.net/gh/freebuisness/html@main"
    }
];

let zoneSourceMap = new Map();
let primaryZones = [];
let popularityData = {};

let config = {
    panicKey: localStorage.getItem('panicKey') || '1',
    panicUrl: localStorage.getItem('panicUrl') || 'https://launchpad.classlink.com/login',
    cloakTitle: localStorage.getItem('cloakTitle') || 'Google Classroom',
    cloakIcon: localStorage.getItem('cloakIcon') || 'https://www.google.com/favicon.ico'
};

function updateConfig(k, v) {
    config[k] = v;
    localStorage.setItem(k, v);
    applyCloak();
}

function applyCloak() {
    document.title = config.cloakTitle;
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = config.cloakIcon;
    document.head.appendChild(link);
}

async function listZones() {
    try {
        const cdnResults = await loadFromCDN(CDN_SOURCES[0]);
        primaryZones = deduplicateZones(cdnResults).filter(zone => !isBlocked(zone));

        renderContent(primaryZones);

        const countEl = document.getElementById('zoneCount');
        if (countEl) {
            countEl.textContent = `${primaryZones.length} zones loaded.`;
        }
    } catch (error) {
        if (document.getElementById('container')) {
            document.getElementById('container').innerHTML = `<div class="loading"><h3>offline mode</h3></div>`;
        }
    }
}

function deduplicateZones(zoneList) {
    const seen = new Set();
    const uniqueZones = [];
    zoneList.forEach(item => {
        if (!seen.has(item.zone.id)) {
            seen.add(item.zone.id);
            zoneSourceMap.set(item.zone.id, item.source);
            uniqueZones.push(item.zone);
        }
    });
    return uniqueZones;
}

async function loadFromCDN(cdn) {
    try {
        const response = await fetch(cdn.zones + "?t=" + Date.now());
        const data = await response.json();
        return data.map(zone => ({ zone, source: cdn }));
    } catch (e) {
        return [];
    }
}

function renderContent(zoneList) {
    const container = document.getElementById('container');
    if (!container) return;
    container.innerHTML = "";

    const mainHeader = document.createElement("div");
    mainHeader.style = "width:100%; text-align:center; padding: 20px 0; grid-column: 1/-1;";
    mainHeader.innerHTML = `<h1 style="font-weight: 700; color: white; margin: 0;">nikehub</h1>`;
    container.appendChild(mainHeader);

    displayZoneBatch(zoneList, container);
}

function displayZoneBatch(zoneList, target) {
    zoneList.forEach(file => {
        const zoneItem = document.createElement("div");
        zoneItem.className = "zone-item" + (file.featured ? " featured" : "");
        zoneItem.onclick = () => openZone(file);

        const img = document.createElement("img");
        img.loading = "lazy";
        const sourceCDN = zoneSourceMap.get(file.id) || CDN_SOURCES[0];

        img.src = file.cover.replace("{COVER_URL}", sourceCDN.covers);

        img.onerror = function() {
            this.src = '/favicon.png';
        };

        zoneItem.innerHTML = `<div class="zone-info"><div class="zone-name">${file.name}</div></div>`;
        zoneItem.prepend(img);
        target.appendChild(zoneItem);
    });
}

function openZone(file) {
    const viewer = document.getElementById('zoneViewer');
    let oldFrame = document.getElementById('zoneFrame');
    const newFrame = document.createElement('iframe');
   
    newFrame.id = 'zoneFrame';
    newFrame.allowFullscreen = true;
    newFrame.setAttribute('allowfullscreen', 'true');
   
    oldFrame.parentNode.replaceChild(newFrame, oldFrame);
   
    const sourceCDN = zoneSourceMap.get(file.id) || CDN_SOURCES[0];
    const fetchUrl = file.url.replace("{HTML_URL}", sourceCDN.html);

    fetch(fetchUrl + "?t=" + Date.now())
        .then(res => res.text())
        .then(html => {
            const blob = new Blob([html], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            newFrame.src = blobUrl;
            newFrame.onload = () => URL.revokeObjectURL(blobUrl);
        })
        .catch(() => {
            newFrame.src = fetchUrl;
        });

    document.getElementById('zoneName').textContent = file.name;
    document.getElementById('zoneAuthor').innerHTML = `<i class="fas fa-circle-check"></i> by ${file.author || "freebuisness"}`;

    viewer.style.display = "flex";
    document.body.style.overflow = 'hidden';
}

function closeZone() {
    document.getElementById('zoneViewer').style.display = "none";
    const oldFrame = document.getElementById('zoneFrame');
    const newFrame = document.createElement('iframe');
    newFrame.id = 'zoneFrame';
    oldFrame.parentNode.replaceChild(newFrame, oldFrame);
    document.body.style.overflow = 'auto';
}

function fullscreenZone() {
    const frame = document.getElementById('zoneFrame');
    if (frame.requestFullscreen) frame.requestFullscreen();
    else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    else if (frame.msRequestFullscreen) frame.msRequestFullscreen();
}

function isBlocked(z) {
    if (BLOCKLIST.ids.includes(z.id)) return true;
    for (let n of BLOCKLIST.names) {
        if (z.name.toLowerCase().includes(n.toLowerCase())) return true;
    }
    return false;
}

async function fetchPopularity() {
}

listZones();
