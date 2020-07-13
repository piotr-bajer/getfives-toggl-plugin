import popupHTML from './templates/popup.html';
import itemHTML from './templates/list-item.html';

let Settings = {};
const HOUR_IN_MILISECONDS = 60 * 60 * 1000;
const GETFIVES_CREATE_LINK = 'https://invoices.getfives.co/items/create';

function getTogglResponse(endpoint, settings = {}) {
  const defaultSettings = {
    method: 'GET',
    mode: 'cors',
    accept: 'application/json',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${Settings.togglKey}:api_token`)}`,
    },
  };

  return new Promise((resolve) => chrome.runtime.sendMessage({
    command: 'fetch',
    url: `https://www.toggl.com/` + endpoint,
    settings: {...defaultSettings, ...settings},
  }, resolve)).catch((error) => console.error(error));
}

function saveSettings(key, settings) {
  return new Promise((resolve) => {
    const data = {};
    data[key] = settings;
    chrome.storage.local.set(data, function(settings) {
      resolve(settings);
    });
  });
}

function getSettings(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, function(settings) {
      resolve(settings[key]);
    });
  });
}

function getSessionData() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({command: 'sessionData'}, (response) => {
      resolve(response);
    });
  });
}

function parseEntry(data) {
  const keys = Object.keys(data);
  let template = itemHTML;

  keys.forEach((key) => {
    template = template.replace(`{${key}}`, data[key]);
  });

  template = template.replace(/{[a-z]+}/ig, '');

  return template;
}

function addEntry(container, data) {
  const html = parseEntry({...Settings, ...data});

  container.insertAdjacentHTML('afterbegin', html);
}

async function getWorkspace() {
  // if (!Settings.workspace) {
  await getTogglResponse('api/v8/workspaces').then((data) => {
    data.forEach((workspace) => {
      if (workspace.name.toLowerCase().indexOf('xfive') > -1) {
        Settings.workspace = workspace.id;
        saveSettings('settings', Settings);
      }
    });
  });
  // }

  return Settings.workspace;
}

async function getUserId() {
  // if (!Settings.userId) {
  await getTogglResponse('api/v8/me').then((data) => {
    Settings.userId = data.data.id;
    saveSettings('settings', Settings);
  });
  // }

  return Settings.userId;
}

function parseTimeEntry(entry) {
  return Math.round(entry * 100) * 0.01;
}

/**
 * @param {Element} entryPoint
 */
async function init(entryPoint) {
  entryPoint.insertAdjacentHTML('beforebegin', popupHTML);

  let isClicked = false;
  const toggl = entryPoint.parentNode.querySelector('.toggl');
  const triggerBtn = toggl.querySelector('.toggl-trigger');
  const entriesContainer = toggl.querySelector('.toggl-entries');
  const keyInput = toggl.querySelector('.toggl-popup-input--key');
  const rateInput = toggl.querySelector('.toggl-popup-input--rate');
  const saveSettingsBtn = toggl.querySelector('.toggl-save-settings');
  const saveEntriesBtn = toggl.querySelector('.toggl-save');
  const downloadEntriesBtn = toggl.querySelector('.toggl-download');
  const addEntryBtn = toggl.querySelector('.toggl-add');
  const clearEntriesBtn = toggl.querySelector('.toggl-clear');

  keyInput.addEventListener('input', () => {
    downloadEntriesBtn.disabled = keyInput.value.length < 1;
  });

  triggerBtn.addEventListener('click', (event) => {
    event.preventDefault();

    toggl.classList.toggle('is-active');

    if (!isClicked) {
      isClicked = true;

      getSettings('settings').then((settings) => {
        Settings = settings;
        keyInput.value = settings.togglKey ? settings.togglKey : '';
        rateInput.value = settings.rate ? settings.rate : '';
        keyInput.dispatchEvent(new Event('input'));
      });

      fetch(GETFIVES_CREATE_LINK)
          .then((response) => response.text())
          .then((response) => {
            Settings.token = response
                .match(/item\[_token][^>]*value="([^>]*)"/)[1];
            Settings.producers = response
                .match(/item\[producer][^>]*>(.*?)<\/select>/)[1];
            Settings.types = response
                .match(/item\[type][^>]*>(.*?)<\/select>/)[1];
          });
    }
  });

  saveSettingsBtn.addEventListener('click', (event) => {
    event.preventDefault();

    Settings.togglKey = keyInput.value;
    Settings.rate = rateInput.value;

    saveSettings('settings', Settings);
  });

  addEntryBtn.addEventListener('click', (event) => {
    event.preventDefault();

    addEntry(entriesContainer, {});
  });

  clearEntriesBtn.addEventListener('click', (event) => {
    event.preventDefault();

    entriesContainer.innerHTML = '';
  });

  downloadEntriesBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const day = new Date(year, month, 0).getDate();
    const workspaceId = await getWorkspace();
    const userId = await getUserId();

    const params = new URLSearchParams({
      workspace_id: workspaceId,
      since: `${year}-${month}-01`,
      until: `${year}-${month}-${day}`,
      user_agent: 'Getfives plugin',
      user_ids: userId,
      grouping: 'projects',
      subgrouping: 'time_entries',
    });

    getTogglResponse('reports/api/v2/summary?' + params.toString())
        .then((response) => {
          const entries = [];
          response.data.forEach((data) => {
            if (data.title.project.toLowerCase().indexOf('Internal:') > -1) {
              data.title.project.items.forEach((item) => {
                entries.push({
                  name: item.title.time_entry,
                  hours: parseTimeEntry(item.time / HOUR_IN_MILISECONDS),
                  // eslint-disable-next-line max-len
                  cost: parseTimeEntry(item.time / HOUR_IN_MILISECONDS * Settings.rate),
                });
              });
            } else {
              entries.push({
                name: data.title.project,
                hours: parseTimeEntry(data.time / HOUR_IN_MILISECONDS),
                // eslint-disable-next-line max-len
                cost: parseTimeEntry(data.time / HOUR_IN_MILISECONDS * Settings.rate),
              });
            }
          });

          entries.forEach((item) => addEntry(entriesContainer, item));
        });
  });

  saveEntriesBtn.addEventListener('click', (event) => {
    [].forEach.call(entriesContainer.children, (child) => {
      const data = {};

      let hasError = false;

      [].forEach.call(child.querySelectorAll('[name]'), (input) => {
        data[input.name] = input.value;

        if (!input.value.trim()) {
          input.classList.add('is-error');
          hasError = true;
        } else {
          input.classList.remove('is-error');
        }
      });

      if (!hasError) {
        fetch(GETFIVES_CREATE_LINK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: new URLSearchParams(data).toString(),
        }).then(() => {
          child.remove();
        }).catch((error) => console.error(error));
      }
    });
  });

  const entriesObserver = new MutationObserver((mutationsList, observer) => {
    saveEntriesBtn.disabled = entriesContainer.children.length < 1;
  });
  entriesObserver.observe(entriesContainer, {childList: true});
}

const entryPoint = document.querySelector('[href="/items/create"]');

if (entryPoint !== null) {
  init(entryPoint);
}
