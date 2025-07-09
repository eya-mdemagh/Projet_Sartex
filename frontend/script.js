function updateDashboardTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const el = document.getElementById('dashboardTimeText');
  if (el) el.textContent = `${h}:${m}:${s}`;
}

async function chargerDonnees() {
  const response = await fetch('data.json');
  const data = await response.json();
  // --- BADGES D'ÉTAT DES BASSINS ---
  const bassins = [
    { key: 'Bassin_Osmose', id: 'status-osmose', nom: 'En ligne' },
    { key: 'Bassin_Teinture', id: 'status-teinture', nom: 'En ligne' },
    { key: 'Bassin_Chardiniaire', id: 'status-chardiniaire', nom: 'En ligne' },
    { key: 'Bassin_Lavage', id: 'status-lavage', nom: 'En ligne' }
  ];
  bassins.forEach(bassin => {
    const b = data[bassin.key];
    const el = document.getElementById(bassin.id);
    if (!el || !b) return;
    // Détection alarme
    const alarmes = [
      b.Alarm_Low_Level, b.Alarm_High_Level, b.Alarm_Thermal_P1, b.Alarm_Thermal_P2
    ];
    const hasAlarme = alarmes.some(x => x === true);
    if (hasAlarme || b.Systeme_Normal === false) {
      el.className = 'badge-status alarm';
      el.innerHTML = '<span class="dot"></span> Alarme';
    } else if (b.Systeme_Normal === true) {
      el.className = 'badge-status';
      el.innerHTML = '<span class="dot"></span> En ligne';
    } else {
      el.className = 'badge-status offline';
      el.innerHTML = '<span class="dot"></span> Hors ligne';
    }
    // Affichage du pourcentage de niveau d'eau
    if (b.Water_Level_Sim != null && b.water_level_max != null) {
      const percent = Math.round(100 * b.Water_Level_Sim / b.water_level_max);
      // Cherche un élément d'affichage du pourcentage, sinon l'ajoute après le badge
      let percentEl = document.getElementById('percent-' + bassin.key);
      if (!percentEl) {
        percentEl = document.createElement('span');
        percentEl.id = 'percent-' + bassin.key;
        percentEl.style.marginLeft = '10px';
        percentEl.style.fontWeight = 'bold';
        percentEl.style.color = '#17407b';
        el.parentNode.insertBefore(percentEl, el.nextSibling);
      }
      percentEl.textContent = ` | Niveau: ${percent} %`;
    }
  });
  // Niveau d'eau (pour la jauge principale)
  const bassinKey = 'Bassin_Osmose'; // À adapter si plusieurs bassins affichés
  const b = data[bassinKey];
  let percent = 0;
  if (b && b.Water_Level_Sim != null && b.water_level_max != null) {
    percent = Math.round(100 * b.Water_Level_Sim / b.water_level_max);
  }
  if (document.getElementById("waterValue"))
    document.getElementById("waterValue").textContent = percent + " %";
  // Cercle SVG
  const minLevel = 0;
  const maxLevel = 100;
  const percentNorm = Math.min(Math.max((percent - minLevel) / (maxLevel - minLevel), 0), 1);
  const circle = document.getElementById("waterCircle");
  if (circle) {
    const dashoffset = 251.2 * (1 - percentNorm);
    circle.setAttribute("stroke-dashoffset", dashoffset);
  }
  // Pompes
  if (document.getElementById("pump1Status")) {
    document.getElementById("pump1Status").textContent = data["Pump1"] ? "ON" : "OFF";
    document.getElementById("pump1Status").className = "pump-status " + (data["Pump1"] ? "on" : "off");
  }
  if (document.getElementById("pump2Status")) {
    document.getElementById("pump2Status").textContent = data["Pump2"] ? "ON" : "OFF";
    document.getElementById("pump2Status").className = "pump-status " + (data["Pump2"] ? "on" : "off");
  }
  // Alarmes
  if (document.getElementById("alarmBox")) {
    let alarmText = "Aucune alarme";
    if (data["Alarm_High_Level"]) alarmText = "<span class='alarm-active'>Alarme Active</span><br>Niveau très haut";
    else if (data["Alarm_Low_Level"]) alarmText = "<span class='alarm-active'>Alarme Active</span><br>Niveau très bas";
    document.getElementById("alarmBox").innerHTML = alarmText;
  }
  // Pression et Débit
  if (document.getElementById("pressureValue"))
    document.getElementById("pressureValue").textContent = (data["pression"] || 0).toFixed(2) + " bar";
  if (document.getElementById("flowValue"))
    document.getElementById("flowValue").textContent = (data["Debit"] || 0).toFixed(2) + " m³/h";
  // Affichage du niveau d'eau en % dans chaque carte de bassin
  const cardIds = [
    { key: 'Bassin_Osmose', valueId: 'waterValue' },
    { key: 'Bassin_Teinture', valueId: 'teintureValue' },
    { key: 'Bassin_Chardiniaire', valueId: 'chardiniaireValue' },
    { key: 'Bassin_Lavage', valueId: 'lavageValue' }
  ];
  cardIds.forEach(card => {
    const bassinData = data[card.key];
    if (bassinData && bassinData.Water_Level_Sim != null && bassinData.water_level_max != null) {
      const percent = Math.round(100 * bassinData.Water_Level_Sim / bassinData.water_level_max);
      const el = document.getElementById(card.valueId);
      if (el) el.textContent = percent + ' %';
    }
  });
  updateDashboardTime();
}
setInterval(chargerDonnees, 3000);
chargerDonnees();
// Navigation entre dashboard et alarmes
if (document.querySelectorAll('.nav-link').length) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      if (this.textContent.trim().includes('Alarmes')) {
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('alarmsPage').style.display = '';
      } else {
        document.getElementById('dashboard').style.display = '';
        document.getElementById('alarmsPage').style.display = 'none';
      }
    });
  });
}
// (Optionnel) Gestion du filtre et du bouton effacer
if (document.getElementById('clearFilters')) {
  document.getElementById('clearFilters').onclick = function () {
    document.getElementById('alarmTypeFilter').value = 'all';
    // ... logiques de filtre à compléter selon vos besoins ...
  };
}

document.addEventListener('DOMContentLoaded', function () {
  fetch('/api/bassins')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        renderBassinList(data.bassins);
      } else {
        document.getElementById('bassin-list').innerHTML = '<div class="error">Erreur de chargement des bassins</div>';
      }
    })
    .catch(() => {
      document.getElementById('bassin-list').innerHTML = '<div class="error">Erreur de connexion au serveur</div>';
    });
});

function renderBassinList(bassins) {
  const container = document.getElementById('bassin-list');
  container.innerHTML = '';
  if (!bassins.length) {
    container.innerHTML = '<div>Aucun bassin trouvé.</div>';
    return;
  }
  let html = '<div class="dashboard-row">';
  bassins.forEach((bassin, idx) => {
    if (idx > 0 && idx % 2 === 0) {
      html += '</div><div class="dashboard-row">';
    }
    html += renderBassinCard(bassin);
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderBassinCard(bassin) {
  // Map bassin name to display name and color/icon
  const config = {
    'Bassin_Osmose': {
      display: 'Bassin Eau Osmosé', color: '#204080', icon: `<svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 5C19 5 8 18.5 8 25.5C8 31.0228 13.4772 33 19 33C24.5228 33 30 31.0228 30 25.5C30 18.5 19 5 19 5Z" fill="#fff" /><path d="M19 28.5C16.2386 28.5 14 26.2614 14 23.5" stroke="#204080" stroke-width="2" stroke-linecap="round" /></svg>`
    },
    'Bassin_Teinture': {
      display: 'Bassin Teinture', color: '#a31963', icon: '<i class="fas fa-flask-vial" style="color:#fff;font-size:38px;"></i>'
    },
    'Bassin_Chardiniaire': {
      display: 'Bassin Chaudière', color: '#ff9800', icon: '<i class="fas fa-industry" style="color:#fff;font-size:38px;"></i>'
    },
    'Bassin_Lavage': {
      display: 'Bassin Lavage', color: '#00bcd4', icon: '<i class="fas fa-soap" style="color:#fff;font-size:38px;"></i>'
    }
  };
  const c = config[bassin.name] || { display: bassin.name, color: '#888', icon: '' };
  // Example: extract water level, alarms, etc. from status
  const status = bassin.status || {};
  const waterLevel = status.Water_Level !== undefined ? status.Water_Level + ' %' : 'N/A';
  const alarmCount = Object.keys(status).filter(k => k.startsWith('Alarm_') && status[k]).length;
  // Example: automate id (if available)
  const automate = status.Automate_ID || 'N/A';
  // Card HTML
  return `
    <div class="card">
      <div class="card-title">
        <span class="bassin-icon" style="background:${c.color};display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;box-shadow:0 4px 16px ${c.color}22;">
          ${c.icon}
        </span>
        ${c.display}
      </div>
      <div class="card-content">
        <div class="circle-container">
          <svg viewBox="0 0 120 120" class="circle-svg">
            <circle cx="60" cy="60" r="53" fill="none" stroke="#888" stroke-width="2" opacity="0.18" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="#888" stroke-width="2" opacity="0.28" />
            <circle cx="60" cy="60" r="40" fill="#fff" />
            <circle cx="60" cy="60" r="40" fill="none" stroke="${c.color}" stroke-width="10" stroke-dasharray="251.2" stroke-dashoffset="0" />
          </svg>
          <div class="water-value">${waterLevel}</div>
        </div>
        <div class="bassin-infos-table">
          <div class="bassin-info-row"><span class="bassin-info-label">Alarmes:</span> <span class="bassin-info-value" style="color:${c.color};font-weight:bold;">${alarmCount}</span></div>
          <div class="bassin-info-separator"></div>
          <div class="bassin-info-row"><span class="bassin-info-label">Automate:</span> <span class="bassin-info-value"><a href="#" style="color:#1976d2;font-weight:bold;text-decoration:none;">${automate}</a></span></div>
        </div>
      </div>
      <hr class="bassin-separator">
      <div class="bassin-details" onclick="window.location.href='details.html?bassin=${encodeURIComponent(bassin.name)}'" style="cursor:pointer;">
        <span class="bassin-details-arrow">→</span> Cliquez pour plus de détails
      </div>
    </div>
  `;
}
