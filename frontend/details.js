// Récupère le nom du bassin depuis l'URL
function getBassinKey() {
  const params = new URLSearchParams(window.location.search);
  const val = params.get('bassin');
  if (!val) return null;
  if (val === 'osmosé' || val === 'osmose') return 'Bassin_Osmose';
  if (val === 'teinture') return 'Bassin_Teinture';
  if (val === 'chaudiere' || val === 'chaudière') return 'Bassin_Chardiniaire';
  if (val === 'lavage') return 'Bassin_Lavage';
  return null;
}

function getBassinDisplayName(key) {
  if (key === 'Bassin_Osmose') return 'Bassin Eau Osmosé';
  if (key === 'Bassin_Teinture') return 'Bassin Teinture';
  if (key === 'Bassin_Chardiniaire') return 'Bassin Chaudière';
  if (key === 'Bassin_Lavage') return 'Bassin Lavage';
  return 'Bassin';
}

function getBassinIcon(key) {
  if (key === 'Bassin_Osmose') return '<i class="fas fa-tint" style="color:#8ca0b3;"></i>';
  if (key === 'Bassin_Teinture') return '<i class="fas fa-flask-vial" style="color:#8ca0b3;"></i>';
  if (key === 'Bassin_Chardiniaire') return '<i class="fas fa-industry" style="color:#8ca0b3;"></i>';
  if (key === 'Bassin_Lavage') return '<i class="fas fa-soap" style="color:#8ca0b3;"></i>';
  return '<i class="fas fa-tint" style="color:#8ca0b3;"></i>';
}

async function chargerBassin() {
  const key = getBassinKey();
  if (!key) return;
  // Définir les IPs des bassins
  const bassinIPs = {
    'Bassin_Osmose': '172.16.23.253',
    'Bassin_Teinture': '172.16.23.251',
    'Bassin_Chardiniaire': '172.16.23.255',
    'Bassin_Lavage': '172.16.23.256'
  };
  // Afficher l'IP sous le header dans le conteneur dédié
  const ipHeader = document.getElementById('ip-header-details');
  if (ipHeader) {
    ipHeader.innerHTML = '';
    if (bassinIPs[key]) {
      const badge = document.createElement('span');
      badge.textContent = 'En ligne - IP: ' + bassinIPs[key];
      badge.style.background = '#f4f8f6';
      badge.style.color = '#43a047';
      badge.style.fontWeight = 'bold';
      badge.style.padding = '8px 28px';
      badge.style.borderRadius = '24px';
      badge.style.boxShadow = '0 2px 8px #17407b22';
      badge.style.fontSize = '1.15em';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#43a047;margin-right:10px;box-shadow:0 0 4px #43a04755;"></span>' + badge.textContent;
      ipHeader.appendChild(badge);
    }
  }
  const response = await fetch('data.json');
  const data = await response.json();
  const bassin = data[key];
  // Titre et icône
  document.getElementById('bassinIcon').innerHTML = getBassinIcon(key);
  document.getElementById('bassinTitle').textContent = getBassinDisplayName(key) + (bassin && bassin.Automate ? ' - ' + bassin.Automate : '');
  // Statut
  const statusEl = document.getElementById('bassinStatus');
  if (bassin) {
    const alarmes = [bassin.Alarm_Low_Level, bassin.Alarm_High_Level, bassin.Alarm_Thermal_P1, bassin.Alarm_Thermal_P2];
    const hasAlarme = alarmes.some(x => x === true);
    if (hasAlarme || bassin.Systeme_Normal === false) {
      statusEl.className = 'badge-status alarm';
      statusEl.innerHTML = '<span class="dot"></span> Alarme';
    } else if (bassin.Systeme_Normal === true) {
      statusEl.className = 'badge-status';
      statusEl.innerHTML = '<span class="dot"></span> En ligne';
    } else {
      statusEl.className = 'badge-status offline';
      statusEl.innerHTML = '<span class="dot"></span> Hors ligne';
    }
  }
  // Jauge circulaire
  const water = bassin && typeof bassin.Water_Level_Sim === 'number' ? bassin.Water_Level_Sim : 0;
  const waterMax = bassin && typeof bassin.water_level_max === 'number' ? bassin.water_level_max : 100;
  let percent = 0;
  if (waterMax > 0) {
    percent = Math.max(0, Math.min(100, (water / waterMax) * 100));
  }
  // Couleur dynamique selon le bassin
  let gaugeColor = '#204080'; // Osmosé par défaut
  if (key === 'Bassin_Teinture') gaugeColor = '#a31963';
  else if (key === 'Bassin_Chardiniaire') gaugeColor = '#ff9800';
  else if (key === 'Bassin_Lavage') gaugeColor = '#1976d2';
  const dasharray = 2 * Math.PI * 45; // r=45 pour une jauge plus petite
  const dashoffset = dasharray * (1 - percent / 100);
  document.getElementById('waterGauge').innerHTML = `
    <svg viewBox="0 0 100 100" width="70" height="70">
      <circle cx="50" cy="50" r="47" fill="none" stroke="#dddddd" stroke-width="5" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" stroke-width="10" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="${gaugeColor}" stroke-width="10" stroke-dasharray="${dasharray}" stroke-dashoffset="${dashoffset}" style="transition:stroke-dashoffset 1s;"/>
      <text x="50" y="54" text-anchor="middle" font-size="1em" font-weight="bold" fill="#17407b">${water.toFixed(2)} m³</text>
      <text x="50" y="66" text-anchor="middle" font-size="0.8em" fill="#17407b">${percent.toFixed(0)}%</text>
    </svg>
    <div style='margin-top:8px;'>
      ${bassin && bassin.Systeme_Normal === true && percent > 85 ? `<span style=\"color:#ffa726;font-weight:bold;\"><i class=\"fas fa-circle\" style=\"font-size:0.7em;\"></i> Attention: &gt; 85%</span>` : ''}
      ${bassin && bassin.Systeme_Normal === true && percent < 15 ? `<span style=\"color:#ffa726;font-weight:bold;\"><i class=\"fas fa-circle\" style=\"font-size:0.7em;\"></i> Attention: &lt; 15%</span>` : ''}
    </div>`;
  // Pompes
  const pumps = [];
  if (bassin) {
    for (let i = 1; i <= 2; i++) {
      const on = bassin['Pump' + i] === true;
      const time = bassin['Pump' + i + '_Time'] || '';
      pumps.push(`
        <div style="background:#e0e4ea;border-radius:18px;padding:24px 32px;min-width:140px;display:flex;flex-direction:column;align-items:center;">
          <i class='fas fa-fan' style='color:#43a047;font-size:2em;margin-bottom:8px;'></i>
          Pompe ${i}<br>
          <span style="display:inline-block;margin:10px 0;"><span style="background:${on ? '#43a047' : '#bbb'};color:#fff;padding:4px 18px;border-radius:12px;font-weight:bold;">${on ? 'ON' : 'OFF'}</span></span><br>
          <span style="color:#888;font-size:0.95em;">Temps: ${time || '0h 00m'}</span>
        </div>
      `);
    }
  }
  document.getElementById('pumpsState').innerHTML = pumps.join('');
  // Alarmes & Alertes dynamiques
  let alarmHtml = '';
  if (bassin && bassin.System_ON === false) {
    alarmHtml = '<span style="color:#888;"><i class="fas fa-power-off" style="color:#bbb;font-size:1.3em;margin-right:8px;"></i> Système hors ligne</span>';
  } else if (bassin && bassin.System_ON === true) {
    const alarmes = [
      { actif: bassin.Alarm_High_Level, label: 'Niveau très haut' },
      { actif: bassin.Alarm_Low_Level, label: 'Niveau très bas' },
      { actif: bassin.Alarm_Thermal_P1, label: 'Défaut thermique pompe 1' },
      { actif: bassin.Alarm_Thermal_P2, label: 'Défaut thermique pompe 2' }
    ];
    const alarmesActives = alarmes.filter(a => a.actif);
    if (alarmesActives.length > 0) {
      alarmHtml = `<span style="color:#e65100;"><i class="fas fa-exclamation-triangle" style="color:#e65100;font-size:1.3em;margin-right:8px;"></i> Attention : alarme déclenchée<br><span style='font-size:0.95em;'>${alarmesActives.map(a => a.label).join('<br>')}</span></span>`;
    } else {
      alarmHtml = '<span style="color:#43a047;"><i class="fas fa-check-circle" style="color:#43a047;font-size:1.3em;margin-right:8px;"></i> Aucune alarme</span>';
    }
  } else {
    alarmHtml = '<span style="color:#888;"><i class="fas fa-power-off" style="color:#bbb;font-size:1.3em;margin-right:8px;"></i> Système hors ligne</span>';
  }
  document.getElementById('alarmStatus').innerHTML = alarmHtml;
  // Dernières alarmes (exemple)
  let lastAlarms = [];
  if (bassin) {
    if (bassin.Alarm_High_Level) lastAlarms.push('Niveau très haut');
    if (bassin.Alarm_Low_Level) lastAlarms.push('Niveau très bas');
    if (bassin.Alarm_Thermal_P1) lastAlarms.push('Défaut thermique pompe 1');
    if (bassin.Alarm_Thermal_P2) lastAlarms.push('Défaut thermique pompe 2');
  }
  document.getElementById('lastAlarms').innerHTML = lastAlarms.length ? lastAlarms.join('<br>') : '';
  document.getElementById('lastCheck').textContent = 'Dernière vérification: ' + (new Date()).toLocaleTimeString();
}

document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const bassinName = urlParams.get('bassin');
  if (!bassinName) {
    document.getElementById('bassin-details').innerHTML = '<div class="error">Aucun bassin sélectionné.</div>';
    return;
  }
  // Fetch bassin status
  fetch('/api/bassins')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const bassin = data.bassins.find(b => b.name === bassinName);
        if (bassin) {
          renderBassinDetails(bassin);
          fetchAlarmHistory(bassinName);
        } else {
          document.getElementById('bassin-details').innerHTML = '<div class="error">Bassin non trouvé.</div>';
        }
      } else {
        document.getElementById('bassin-details').innerHTML = '<div class="error">Erreur de chargement du bassin</div>';
      }
    })
    .catch(() => {
      document.getElementById('bassin-details').innerHTML = '<div class="error">Erreur de connexion au serveur</div>';
    });
});

function renderBassinDetails(bassin) {
  const status = bassin.status || {};
  // Define which fields to show and their labels
  const fieldLabels = {
    Water_Level: "Niveau d'eau (%)",
    Pump1: "Pompe 1",
    Pump2: "Pompe 2",
    System_ON: "Système ON",
    Alarm_High_Level: "Alarme Haut Niveau",
    Alarm_Low_Level: "Alarme Bas Niveau",
    Alarm_Thermal_P1: "Alarme Thermique P1",
    Alarm_Thermal_P2: "Alarme Thermique P2"
    // Add more as needed
  };

  let html = `<h2>Détails pour ${bassin.name}</h2>`;
  html += '<ul>';
  let hasData = false;
  for (const [key, label] of Object.entries(fieldLabels)) {
    if (status[key] !== null && status[key] !== undefined) {
      html += `<li><b>${label}:</b> ${status[key]}</li>`;
      hasData = true;
    }
  }
  if (!hasData) {
    html += '<li>Aucune donnée disponible.</li>';
  }
  html += '</ul>';
  html += '<h3>Historique des alarmes</h3>';
  html += '<div id="alarm-history"></div>';
  document.getElementById('bassin-details').innerHTML = html;
}

function fetchAlarmHistory(bassinName) {
  fetch(`/api/bassins/${encodeURIComponent(bassinName)}/alarms`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        renderAlarmHistory(data.alarms);
      } else {
        document.getElementById('alarm-history').innerHTML = '<div class="error">Erreur de chargement des alarmes</div>';
      }
    })
    .catch(() => {
      document.getElementById('alarm-history').innerHTML = '<div class="error">Erreur de connexion au serveur</div>';
    });
}

function renderAlarmHistory(alarms) {
  if (!alarms.length) {
    document.getElementById('alarm-history').innerHTML = '<div>Aucune alarme enregistrée.</div>';
    return;
  }
  let html = '<table class="alarm-table"><thead><tr><th>Type</th><th>Date/Heure</th></tr></thead><tbody>';
  alarms.forEach(alarm => {
    html += `<tr><td>${alarm.alarm_type}</td><td>${alarm.timestamp}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('alarm-history').innerHTML = html;
}

window.onload = chargerBassin; 