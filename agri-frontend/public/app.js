const AUTH_URL = '/api/auth';
const IRRIGATION_URL = '/api/irrigation';
const NOTIFICATIONS_URL = '/api/notifications/notifications';

const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('token');

function showMessage(text, isError = false) {
  const el = $('message');
  el.textContent = text;
  el.className = isError ? 'error' : 'success';
}

function render() {
  const connected = Boolean(token);
  $('auth-section').hidden = connected;
  $('app-section').hidden = !connected;
  $('logout').hidden = !connected;
  if (connected) refresh();
}

function logout(text = 'Vous êtes déconnecté.') {
  token = null;
  sessionStorage.removeItem('token');
  render();
  showMessage(text);
}

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    logout('Session expirée, reconnectez-vous.');
  }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data;
}

const get = (url) => api(url);
const post = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body) });
const patch = (url, body) => api(url, { method: 'PATCH', body: JSON.stringify(body) });
const del = (url) => api(url, { method: 'DELETE' });

// Date lisible : « dimanche 22 novembre 2026 »
function formatDate(value) {
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function emptyRow(columns, text) {
  const tr = document.createElement('tr');
  const td = cell(text);
  td.colSpan = columns;
  td.className = 'empty';
  tr.append(td);
  return tr;
}

function renderParcelles(parcelles) {
  const body = $('parcelles-body');
  body.replaceChildren();
  if (parcelles.length === 0) {
    body.append(emptyRow(5, 'Aucune parcelle pour le moment.'));
  }
  parcelles.forEach((p) => {
    const tr = document.createElement('tr');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'small danger';
    deleteButton.textContent = 'Supprimer';
    deleteButton.addEventListener('click', () => deleteParcelle(p));
    const actionCell = document.createElement('td');
    actionCell.append(deleteButton);

    tr.append(cell(p.id), cell(p.nom), cell(p.surface_ha), cell(p.culture), actionCell);
    body.append(tr);
  });

  const select = $('a-parcelle');
  select.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choisir une parcelle';
  select.append(placeholder);
  parcelles.forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.dataset.nom = p.nom;
    option.textContent = `${p.nom} (n° ${p.id})`;
    select.append(option);
  });
}

function renderArrosages(arrosages) {
  const body = $('arrosages-body');
  body.replaceChildren();
  if (arrosages.length === 0) {
    body.append(emptyRow(6, 'Aucun arrosage planifié.'));
  }
  arrosages.forEach((a) => {
    const tr = document.createElement('tr');

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.value = a.volume_reel_l ?? '';
    input.setAttribute('aria-label', `Consommation réelle de l'arrosage ${a.id}`);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'small';
    button.textContent = 'Enregistrer';
    button.addEventListener('click', () => saveReal(a, input.value));

    const box = document.createElement('div');
    box.className = 'reel-box';
    box.append(input, button);
    const reelCell = document.createElement('td');
    reelCell.append(box);

    const ecart =
      a.volume_reel_l === null
        ? '—'
        : (Number(a.volume_reel_l) - Number(a.volume_l)).toFixed(2);

    tr.append(
      cell(a.date_arrosage),
      cell(a.parcelle_nom),
      cell(a.duree_min),
      cell(a.volume_l),
      reelCell,
      cell(ecart)
    );
    body.append(tr);
  });
}

const NOTIF_LABELS = { succes: 'Succès', alerte: 'Alerte', info: 'Info' };

function renderNotifications(notifications) {
  const list = $('notifications-list');
  list.replaceChildren();

  const unread = notifications.filter((n) => !n.lu).length;
  const badge = $('notif-count');
  badge.textContent = unread;
  badge.hidden = unread === 0;
  $('notifications-empty').hidden = notifications.length > 0;

  notifications.forEach((n) => {
    const li = document.createElement('li');
    li.className = `notif ${n.type}${n.lu ? ' lue' : ''}`;

    const text = document.createElement('div');
    text.className = 'notif-text';

    const head = document.createElement('strong');
    head.textContent = `${NOTIF_LABELS[n.type] || 'Info'}${n.lu ? '' : ' · nouveau'}`;

    const msg = document.createElement('span');
    msg.textContent = n.message;

    const when = document.createElement('small');
    when.textContent = new Date(n.createdAt).toLocaleString('fr-FR');

    text.append(head, msg, when);

    const actions = document.createElement('div');
    actions.className = 'notif-actions';

    if (!n.lu) {
      const readButton = document.createElement('button');
      readButton.type = 'button';
      readButton.className = 'small';
      readButton.textContent = 'Marquer comme lue';
      readButton.addEventListener('click', () => markRead(n._id));
      actions.append(readButton);
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'small danger';
    deleteButton.textContent = 'Supprimer';
    deleteButton.addEventListener('click', () => deleteNotification(n._id));
    actions.append(deleteButton);

    li.append(text, actions);
    list.append(li);
  });
}

async function loadParcelles() {
  renderParcelles(await get(`${IRRIGATION_URL}/parcelles`));
}

async function loadArrosages() {
  renderArrosages(await get(`${IRRIGATION_URL}/arrosages`));
}

async function loadNotifications() {
  renderNotifications(await get(NOTIFICATIONS_URL));
}

async function refresh() {
  try {
    await Promise.all([loadParcelles(), loadArrosages()]);
  } catch (err) {
    showMessage(err.message, true);
  }
  loadNotifications().catch(() => showMessage('Notifications indisponibles.', true));
}

async function deleteParcelle(parcelle) {
  const question = `Supprimer la parcelle « ${parcelle.nom} » et tous ses arrosages ?`;
  if (!window.confirm(question)) return;
  try {
    await api(`${IRRIGATION_URL}/parcelles/${parcelle.id}`, { method: 'DELETE' });
    showMessage(`Parcelle « ${parcelle.nom} » supprimée.`);
    await Promise.all([loadParcelles(), loadArrosages()]);
  } catch (err) {
    showMessage(err.message, true);
  }
}

// Crée une notification ; un échec ne doit pas bloquer l'action principale.
async function notify(type, message, parcelleId) {
  try {
    await post(NOTIFICATIONS_URL, {
      type,
      message,
      parcelleId: Number.isFinite(parcelleId) ? parcelleId : null,
    });
    await loadNotifications();
  } catch (err) {
    showMessage(`Notification non créée : ${err.message}`, true);
  }
}

async function markRead(id) {
  try {
    await patch(`${NOTIFICATIONS_URL}/${id}/lu`, {});
    await loadNotifications();
  } catch (err) {
    showMessage(err.message, true);
  }
}

async function deleteNotification(id) {
  try {
    await del(`${NOTIFICATIONS_URL}/${id}`);
    await loadNotifications();
  } catch (err) {
    showMessage(err.message, true);
  }
}

async function saveReal(arrosage, value) {
  if (value === '') {
    showMessage('Saisissez le volume réellement consommé.', true);
    return;
  }
  try {
    await patch(`${IRRIGATION_URL}/arrosages/${arrosage.id}`, { volume_reel_l: Number(value) });
    showMessage('Consommation réelle enregistrée.');
    await loadArrosages();

    const prevu = Number(arrosage.volume_l);
    const reel = Number(value);
    if (prevu > 0 && reel > prevu * 1.1) {
      await notify(
        'alerte',
        `Surconsommation sur la parcelle « ${arrosage.parcelle_nom} » : ${reel} L utilisés ` +
          `au lieu de ${prevu} L prévus (arrosage du ${formatDate(arrosage.date_arrosage)}).`,
        Number(arrosage.parcelle_id)
      );
    }
  } catch (err) {
    showMessage(err.message, true);
  }
}

function credentials() {
  return { email: $('email').value.trim(), password: $('password').value };
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await post(`${AUTH_URL}/login`, credentials());
    token = data.token;
    sessionStorage.setItem('token', token);
    render();
    showMessage('Connexion réussie.');
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('register-btn').addEventListener('click', async () => {
  try {
    await post(`${AUTH_URL}/register`, credentials());
    showMessage('Compte créé. Vous pouvez maintenant vous connecter.');
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('parcelle-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const parcelle = await post(`${IRRIGATION_URL}/parcelles`, {
      nom: $('p-nom').value.trim(),
      surface_ha: Number($('p-surface').value),
      culture: $('p-culture').value.trim(),
    });
    showMessage(`Parcelle « ${parcelle.nom} » créée.`);
    e.target.reset();
    await loadParcelles();
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('arrosage-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const select = $('a-parcelle');
  const parcelleId = Number(select.value);
  const parcelleNom = select.selectedOptions[0]?.dataset.nom || `n° ${parcelleId}`;
  const date = $('a-date').value;
  const duree = Number($('a-duree').value);
  const volume = Number($('a-volume').value);

  try {
    await post(`${IRRIGATION_URL}/arrosages`, {
      parcelle_id: parcelleId,
      date_arrosage: date,
      duree_min: duree,
      volume_l: volume,
    });
    const resume =
      `Parcelle « ${parcelleNom} » : arrosage prévu le ${formatDate(date)}, ` +
      `pendant ${duree} min, pour ${volume} L.`;
    showMessage(`Arrosage planifié. ${resume}`);
    e.target.reset();
    await loadArrosages();
    await notify('succes', `Arrosage planifié. ${resume}`, parcelleId);
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('logout').addEventListener('click', () => logout());

render();