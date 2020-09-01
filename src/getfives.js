import popupHTML from './templates/popup.html';
import itemHTML from './templates/list-item.html';

let Settings = {};
const HOUR_IN_MILISECONDS = 60 * 60 * 1000;
const GETFIVES_CREATE_LINK = 'https://invoices.getfives.co/items/create';

/**
 * @param {string} endpoint
 * @param {{}} settings
 * @return {Promise<object>}
 */
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

/**
 * @param {string|number} key
 * @param {{}} settings
 * @return {Promise<object>}
 */
function saveSettings(key, settings) {
  return new Promise((resolve) => {
    const data = {};
    data[key] = settings;
    chrome.storage.local.set(data, function(settings) {
      resolve(settings);
    });
  });
}

/**
 * @param {string} key
 * @return {Promise<object>}
 */
function getSettings(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, function(settings) {
      resolve(settings[key]);
    });
  });
}

/**
 * @param {string} content
 * @return {string}
 */
function escapeAttribute(content) {
  return content.toString()
      .replace(/"/g, '&amp;')
      .replace(/'/g, '&apos;')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
}

/**
 * @param {{}} data
 * @return {string}
 */
function parseEntry(data) {
  const keys = Object.keys(data);
  let template = itemHTML;

  keys.forEach((key) => {
    if (data[key] !== undefined) {
      template = template.replace(`{${key}}`, data[key]);
    }
  });

  template = template.replace(/{[a-z]+}/ig, '');

  return template;
}

/**
 * @param {any} container
 * @param {{}} data
 */
function addEntry(container, data) {
  const escapeKeys = ['name', 'cost', 'hours'];
  const parsedData = {...data};

  escapeKeys.forEach((key) => {
    if (parsedData[key] !== undefined) {
      parsedData[key] = escapeAttribute(parsedData[key]);
    }
  });

  const html = parseEntry({...Settings, ...parsedData});

  container.insertAdjacentHTML('afterbegin', html);
}

/**
 * @return {int}
 */
async function getWorkspace() {
  if (!Settings.workspace) {
    await getTogglResponse('api/v8/workspaces').then((data) => {
      data.forEach((workspace) => {
        if (workspace.name.toLowerCase().indexOf('xfive') > -1) {
          Settings.workspace = workspace.id;
          saveSettings('settings', Settings);
        }
      });
    });
  }

  return Settings.workspace;
}

/**
 * @return {int}
 */
async function getUserId() {
  if (!Settings.userId) {
    await getTogglResponse('api/v8/me').then((data) => {
      Settings.userId = data.data.id;
      saveSettings('settings', Settings);
    });
  }

  return Settings.userId;
}

/**
 * @param {number} entry
 * @return {number}
 */
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

    if (date.getDate() < 2) {
      const currentMonth = date.getMonth();
      if (currentMonth < 1) {
        date.setFullYear(date.getFullYear() - 1);
        date.setMonth(11);
      } else {
        date.setMonth(date.getMonth() - 1);
      }
    }

    const month = parseInt((date.getMonth() + 1).toString()
        .padStart(2, '0'), 10);
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
            if (data.title.project.toLowerCase().indexOf('internal:') > -1) {
              data.items.forEach((item) => {
                entries.push({
                  name: 'Estimation: ' + item.title.time_entry,
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

if (location.href === 'https://invoices.getfives.co/') {
  const entryPoint = document.querySelector('[href="/items/create"]');

  if (entryPoint !== null) {
    init(entryPoint);
  }
}

if (location.href.match(/https:\/\/invoices\.getfives\.co\/[0-9]+\/?/)) {
  const pdfButton = document.querySelector('[href$="pdf"]');

  if (pdfButton !== null) {
    pdfButton.parentNode.insertAdjacentHTML('beforebegin',
        '<li class="level-item">' +
        '<button class="toggl-copy button is-primary" type="button">' +
        'Copy Current Entries for IFIRMA' +
        '</button>' +
        '</li>',
    );

    const copyBtn = pdfButton.parentNode.parentElement
        .querySelector('.toggl-copy');

    copyBtn.addEventListener('click', (event) => {
      event.preventDefault();

      const rows = document.querySelectorAll('table tbody tr');
      const entries = [];

      [].forEach.call(rows, (row) => {
        entries.push({
          // eslint-disable-next-line max-len
          name: `${row.children[0].textContent.trim()} (${row.children[5].textContent.trim()})`,
          cost: row.children[3].textContent.replace('USD', '').trim()
              .replace(',', ''),
        });
      });

      saveSettings('currentEntries', entries);

      const text = copyBtn.textContent;

      copyBtn.textContent = 'Copied!';

      setTimeout(() => {
        copyBtn.textContent = text;
      }, 1000);
    });
  }
}
