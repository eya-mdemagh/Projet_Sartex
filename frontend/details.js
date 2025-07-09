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
      <text x="50" y="54" text-anchor="middle" font-size="1.1em" font-weight="bold" fill="#17407b">${water.toFixed(2)} m³</text>
      <text x="50" y="66" text-anchor="middle" font-size="1em" fill="#17407b">${percent.toFixed(0)}%</text>
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

let allAlarms = [];

document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const bassinName = urlParams.get('bassin');
  if (!bassinName) {
    document.getElementById('bassinTitle').textContent = 'Bassin inconnu';
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
          document.getElementById('bassinTitle').textContent = 'Bassin non trouvé';
        }
      } else {
        document.getElementById('bassinTitle').textContent = 'Erreur de chargement du bassin';
      }
    })
    .catch(() => {
      document.getElementById('bassinTitle').textContent = 'Erreur de connexion au serveur';
    });

  // Modal logic
  const modal = document.getElementById('alarmHistoryModal');
  const btn = document.getElementById('historiqueAlarmeBtn');
  const closeBtn = document.getElementById('closeAlarmModal');
  btn.onclick = function () {
    renderModalAlarmHistory();
    modal.style.display = 'flex';
  };
  closeBtn.onclick = function () {
    modal.style.display = 'none';
  };
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
});

function renderBassinDetails(bassin) {
  // Support both {status: {...}} and flat object
  const status = bassin.status || bassin;
  // Pompes
  let pumpsHtml = '<div class="pump-list">';
  [1, 2].forEach(num => {
    const isOn = status[`Pump${num}`] ? true : false;
    pumpsHtml += `
      <div class="pump">
        <div class="pump-icon" style="color:#43a047;"><i class="fas fa-fan"></i></div>
        <div style="font-weight:bold;color:#17407b;">Pompe ${num}</div>
        <div class="pump-status ${isOn ? 'on' : 'off'}">${isOn ? 'ON' : 'OFF'}</div>
        <div style="color:#888;font-size:0.98em;margin-top:6px;">Temps: 0h 00m</div>
      </div>
    `;
  });
  pumpsHtml += '</div>';
  document.getElementById('pumpsState').innerHTML = pumpsHtml;

  // Alarmes & Alertes (current status)
  let alarmHtml = '';
  const alarmFields = [
    { key: 'Alarm_High_Level', label: 'Alarme niveau haut' },
    { key: 'Alarm_Low_Level', label: 'Alarme niveau bas' },
    { key: 'Alarm_Thermal_P1', label: 'Alarme thermique P1' },
    { key: 'Alarm_Thermal_P2', label: 'Alarme thermique P2' }
  ];
  if (status.System_ON === false) {
    alarmHtml = '<div class="alarm-badge off" style="background:#eee;color:#888;">Système hors service.</div>';
  } else {
    const activeAlarms = alarmFields.filter(alarm => status[alarm.key]);
    if (activeAlarms.length === 0) {
      alarmHtml = '<div class="alarm-badge ok">Aucune alarme active.</div>';
    } else {
      activeAlarms.forEach(alarm => {
        alarmHtml += `<div class="alarm-badge alert">${alarm.label} : ALERTE</div>`;
      });
    }
  }
  document.getElementById('alarmStatus').innerHTML = alarmHtml;

  // Jauge circulaire
  const water = typeof status.Water_Level_Sim === 'number' ? status.Water_Level_Sim : 0;
  const waterMax = typeof status.water_level_max === 'number' ? status.water_level_max : 100;
  let percent = 0;
  if (waterMax > 0) {
    percent = Math.max(0, Math.min(100, (water / waterMax) * 100));
  }
  // Couleur dynamique selon le bassin
  let gaugeColor = '#204080'; // Osmosé par défaut
  if (status.name === 'Bassin_Teinture') gaugeColor = '#a31963';
  else if (status.name === 'Bassin_Chardiniaire') gaugeColor = '#ff9800';
  else if (status.name === 'Bassin_Lavage') gaugeColor = '#1976d2';
  const dasharray = 2 * Math.PI * 45; // r=45 pour une jauge plus petite
  const dashoffset = dasharray * (1 - percent / 100);
  document.getElementById('waterGauge').innerHTML = `
    <svg viewBox="0 0 100 100" width="70" height="70">
      <circle cx="50" cy="50" r="47" fill="none" stroke="#dddddd" stroke-width="5" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" stroke-width="10" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="${gaugeColor}" stroke-width="10" stroke-dasharray="${dasharray}" stroke-dashoffset="${dashoffset}" style="transition:stroke-dashoffset 1s;"/>
      <text x="50" y="54" text-anchor="middle" font-size="1.1em" font-weight="bold" fill="#17407b">${water.toFixed(2)} m³</text>
      <text x="50" y="66" text-anchor="middle" font-size="1em" fill="#17407b">${percent.toFixed(0)}%</text>
    </svg>
    <div style='margin-top:8px;'>
      ${status.Systeme_Normal === true && percent > 85 ? `<span style=\"color:#ffa726;font-weight:bold;\"><i class=\"fas fa-circle\" style=\"font-size:0.7em;\"></i> Attention: &gt; 85%</span>` : ''}
      ${status.Systeme_Normal === true && percent < 15 ? `<span style=\"color:#ffa726;font-weight:bold;\"><i class=\"fas fa-circle\" style=\"font-size:0.7em;\"></i> Attention: &lt; 15%</span>` : ''}
    </div>`;

  // Paramètres Système (Débit & Pression)
  const systemParamsDiv = document.getElementById('systemParams');
  if (systemParamsDiv && status) {
    const debit = typeof status.Debit === 'number' ? status.Debit : 0;
    const pression = typeof status.pression === 'number' ? status.pression : 0;
    systemParamsDiv.innerHTML = `
      <div class="param-card">
        <div class="param-icon"><svg width="32" height="32" viewBox="0 0 32 32"><g><rect fill="none" height="32" width="32"/></g><g><path d="M7 13c1.5 0 1.5 2 3 2s1.5-2 3-2 1.5 2 3 2 1.5-2 3-2 1.5 2 3 2" stroke="#17407b" stroke-width="2" fill="none"/></g></svg></div>
        <div class="param-label">Débit</div>
        <div class="param-value"><b>${debit.toFixed(1)} L/min</b></div>
      </div>
      <div class="param-card">
        <div class="param-icon"><svg width="32" height="32" viewBox="0 0 32 32"><g><rect fill="none" height="32" width="32"/></g><g><circle cx="16" cy="16" r="10" stroke="#17407b" stroke-width="2" fill="none"/><path d="M16 16 L16 10" stroke="#17407b" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="2" fill="#17407b"/></g></svg></div>
        <div class="param-label">Pression</div>
        <div class="param-value"><b>${pression.toFixed(1)} bar</b></div>
      </div>
    `;
  }
  // Last check time
  if (document.getElementById('lastCheck')) {
    document.getElementById('lastCheck').textContent = 'Dernière vérification: ' + (new Date()).toLocaleTimeString();
  }
}

function fetchAlarmHistory(bassinName) {
  fetch(`/api/bassins/${encodeURIComponent(bassinName)}/alarms`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        allAlarms = data.alarms;
        renderAlarmSummary(data.alarms);
      } else {
        document.getElementById('lastAlarms').innerHTML = '<div class="error">Erreur de chargement des alarmes</div>';
      }
    })
    .catch(() => {
      document.getElementById('lastAlarms').innerHTML = '<div class="error">Erreur de connexion au serveur</div>';
    });
}

function renderAlarmSummary(alarms) {
  if (!alarms.length) {
    document.getElementById('lastAlarms').innerHTML = '<div>Aucune alarme enregistrée.</div>';
    return;
  }
  // Map alarm types to French
  const alarmTypeMap = {
    'Alarm_Low_Level': 'Alarme niveau bas',
    'Alarm_High_Level': 'Alarme niveau haut',
    'Alarm_Thermal_P1': 'Alarme thermique P1',
    'Alarm_Thermal_P2': 'Alarme thermique P2'
  };
  // Show only the last 3 alarms
  let html = '<table class="alarm-table-modal"><thead><tr><th>Date</th><th>Heure</th><th>Type d\'Alarme</th></tr></thead><tbody>';
  alarms.slice(0, 3).forEach(alarm => {
    const label = alarmTypeMap[alarm.alarm_type] || alarm.alarm_type;
    let date = '', heure = '';
    if (alarm.timestamp) {
      const parts = alarm.timestamp.split(' ');
      date = parts[0] || '';
      heure = parts[1] || '';
    }
    html += `<tr>\n      <td>${date}</td>\n      <td>${heure}</td>\n      <td><span class="alarm-badge alert">${label}</span></td>\n    </tr>`;
  });
  html += '</tbody></table>';
  if (alarms.length > 3) {
    html += `<div style="font-size:0.95em;color:#888;margin-top:4px;">...et ${alarms.length - 3} autres</div>`;
  }
  document.getElementById('lastAlarms').innerHTML = html;
}

function renderModalAlarmHistory() {
  const container = document.getElementById('modalAlarmHistory');
  const filter = document.getElementById('alarmTypeFilter') ? document.getElementById('alarmTypeFilter').value : 'all';
  let filteredAlarms = allAlarms;
  if (filter !== 'all') {
    filteredAlarms = allAlarms.filter(alarm => alarm.alarm_type === filter);
  }
  if (!filteredAlarms.length) {
    container.innerHTML = '<div>Aucune alarme enregistrée pour ce type.</div>';
    return;
  }
  // Map alarm types to French
  const alarmTypeMap = {
    'Alarm_Low_Level': 'Alarme niveau bas',
    'Alarm_High_Level': 'Alarme niveau haut',
    'Alarm_Thermal_P1': 'Alarme thermique P1',
    'Alarm_Thermal_P2': 'Alarme thermique P2'
  };
  let html = '<table class="alarm-table-modal"><thead><tr><th>Date</th><th>Heure</th><th>Type d\'Alarme</th></tr></thead><tbody>';
  filteredAlarms.forEach(alarm => {
    const label = alarmTypeMap[alarm.alarm_type] || alarm.alarm_type;
    let date = '', heure = '';
    if (alarm.timestamp) {
      const parts = alarm.timestamp.split(' ');
      date = parts[0] || '';
      heure = parts[1] || '';
    }
    html += `<tr>\n      <td>${date}</td>\n      <td>${heure}</td>\n      <td><span class="alarm-badge alert">${label}</span></td>\n    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
  // Add event listener if not already present
  const filterDropdown = document.getElementById('alarmTypeFilter');
  if (filterDropdown && !filterDropdown.hasListener) {
    filterDropdown.addEventListener('change', renderModalAlarmHistory);
    filterDropdown.hasListener = true;
  }
}

window.onload = chargerBassin; 