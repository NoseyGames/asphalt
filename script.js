const BLOCKLIST = {
    ids: [],
    names: ["Soundboard", "[!] COMMENTS", "[!] SUGGEST GAMES .gg/D4c9VFYWyU"]
};

const CDN_SOURCES = [{
    name: "gn-math",
    zones: "https://cdn.jsdelivr.net/gh/freebuisness/assets@main/zones.json",
    covers: "https://cdn.jsdelivr.net/gh/freebuisness/covers@main",
    html: "https://cdn.jsdelivr.net/gh/freebuisness/html@main"
}];

let zoneSourceMap = new Map();
let primaryZones = [];

let config = {
    panicKey: localStorage.getItem('panicKey') || '1',
    panicUrl: localStorage.getItem('panicUrl') || 'https://launchpad.classlink.com/login',
    cloakTitle: localStorage.getItem('cloakTitle') || 'Google Classroom',
    cloakIcon: localStorage.getItem('cloakIcon') || 'https://www.google.com/favicon.ico'
};

function applyCloak() {
    document.title = config.cloakTitle;
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = config.cloakIcon;
    document.head.appendChild(link);
}

async function listZones() {
    console.log("fetching zones from freebuisness...");
    try {
        const response = await fetch(CDN_SOURCES[0].zones + "?t=" + Date.now());
        if (!response.ok) throw new Error("fetch failed: " + response.status);
       
        const data = await response.json();
        console.log("raw zones received:", data.length);

        const mapped = data.map(zone => ({
            zone: zone,
            source: CDN_SOURCES[0]
        }));

        primaryZones = deduplicateZones(mapped).filter(zone => !isBlocked(zone));
       
        console.log("final zones after dedupe + blocklist:", primaryZones.length);
       
        renderContent(primaryZones);

        const countEl = document.getElementById('zoneCount');
        if (countEl) countEl.textContent = `${primaryZones.length} zones loaded.`;
    } catch (error) {
        console.error("fetch error:", error);
        const container = document.getElementById('container');
        if (container) {
            container.innerHTML = `<div class="loading"><h3>failed to load zones<br>check console (f12)</h3></div>`;
        }
    }
}

function deduplicateZones(zoneList) {
    const seen = new Set();
    const unique = [];
    zoneList.forEach(item => {
        const z = item.zone;
        if (!seen.has(z.id)) {
            seen.add(z.id);
            zoneSourceMap.set(z.id, item.source);
            unique.push(z);
        }
    });
    return unique;
}

function renderContent(zoneList) {
    const container = document.getElementById('container');
    if (!container) return;
    container.innerHTML = "";

    const headerDiv = document.createElement("div");
    headerDiv.style = "width:100%; text-align:center; padding: 30px 0 20px; grid-column: 1/-1; margin-bottom: 20px;";
    headerDiv.innerHTML = `<h1 style="font-weight: 900; font-size: 42px; color: white; margin: 0; text-shadow: 0 0 20px #00ff9d;">welcome to asphalt</h1>
                           <p style="color: #ffffff; font-size: 18px; margin: 8px 0 0;">made by nikegtag - https://nikehub.org - discord.gg/Y4uMau4dGy</p>`;
    container.appendChild(headerDiv);

    if (zoneList.length === 0) {
        container.innerHTML += `<div class="loading"><h3>no zones found</h3></div>`;
        return;
    }

    zoneList.forEach(file => {
        const zoneItem = document.createElement("div");
        zoneItem.className = "zone-item" + (file.featured ? " featured" : "");
        zoneItem.onclick = () => openZone(file);

        const img = document.createElement("img");
        img.loading = "lazy";
        const source = zoneSourceMap.get(file.id) || CDN_SOURCES[0];
       
        let coverUrl = file.cover;
        if (coverUrl && coverUrl.includes("{COVER_URL}")) {
            coverUrl = coverUrl.replace("{COVER_URL}", source.covers);
        }
        img.src = coverUrl || '/favicon.png';
        img.onerror = () => { img.src = '/favicon.png'; };

        zoneItem.innerHTML = `<div class="zone-info"><div class="zone-name">${file.name || "Unnamed"}</div></div>`;
        zoneItem.prepend(img);
        container.appendChild(zoneItem);
    });
}

function openZone(file) {
    console.log("opening zone:", file.name, "id:", file.id);

    const viewer = document.getElementById('zoneViewer');
    let oldFrame = document.getElementById('zoneFrame');
    const newFrame = document.createElement('iframe');
   
    newFrame.id = 'zoneFrame';
    newFrame.allowFullscreen = true;
    newFrame.setAttribute('allowfullscreen', 'true');
   
    oldFrame.parentNode.replaceChild(newFrame, oldFrame);

    const source = zoneSourceMap.get(file.id) || CDN_SOURCES[0];
   
    let fetchUrl = "";
    if (file.url) {
        fetchUrl = file.url.replace("{HTML_URL}", source.html);
    } else if (file.id) {
        fetchUrl = `${source.html}/${file.id}.html`;
    } else {
        fetchUrl = `${source.html}/1.html`;
    }

    console.log("loading game from:", fetchUrl);

    fetch(fetchUrl + "?t=" + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("game fetch failed");
            return res.text();
        })
        .then(html => {
            const blob = new Blob([html], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            newFrame.src = blobUrl;
            newFrame.onload = () => URL.revokeObjectURL(blobUrl);
        })
        .catch(err => {
            console.error("game load error:", err);
            newFrame.src = fetchUrl;
        });

    document.getElementById('zoneName').textContent = file.name || "Game";
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
        if ((z.name || "").toLowerCase().includes(n.toLowerCase())) return true;
    }
    return false;
}

document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === config.panicKey.toLowerCase()) window.location.replace(config.panicUrl);
    if (e.key === 'Escape') closeZone();
});

const searchBar = document.getElementById('searchBar');
if (searchBar) {
    searchBar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = term === "" ? primaryZones : primaryZones.filter(z =>
            (z.name || "").toLowerCase().includes(term)
        );
        renderContent(filtered);
    });
}

applyCloak();
listZones();
