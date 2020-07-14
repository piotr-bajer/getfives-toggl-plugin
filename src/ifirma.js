const rootTable = document.querySelector('#pozycjeTabId');

/**
 * @param {object} entries
 * @return {boolean}
 */
function prepareElements(entries) {
  const footer = document.querySelector('#pozycjeTabId tfoot td');

  if (footer === null) {
    return false;
  }

  const getfivesButton = document.querySelector('#getfives-import');

  if (getfivesButton !== null) {
    return false;
  }

  const addRowButton = footer.firstElementChild;

  if (addRowButton === null ||
    addRowButton.textContent.toLowerCase().indexOf('dodaj pozycję') < 0) {
    return false;
  }

  footer.insertAdjacentHTML('beforeend',
      '<button class="btn btn-secondary" type="button" id="getfives-import">' +
    '<i class="fa fa-plus"></i> ' +
    'dodaj wpisy z Getfives (' + entries.length + ')' +
    '</button>');

  footer.lastChild.addEventListener('click', (event) => {
    event.preventDefault();

    for (let i = 0; i < entries.length; i++) {
      addRowButton.click();
    }

    setTimeout(() => {
      let tableBody = document.querySelector('#pozycjeTabId tbody');
      const startIndex = tableBody.children.length - entries.length * 2;

      for (let i = 0; i < entries.length; i++) {
        const polishRow = tableBody.children[startIndex + i * 2];
        const foreignRow = tableBody.children[startIndex + i * 2 + 1];
        const entry = entries[i];

        const namePl = polishRow.querySelector('._ac_nazwa');
        const nameForeign = foreignRow.querySelector('._ac_nazwaObca');

        namePl.value = entry.name;
        nameForeign.value = entry.name;
        polishRow.querySelector('._jednostka').value = 'usł.';
        foreignRow.querySelector('._jednostkaObca').value = 'serv.';
        polishRow.querySelector('._ilosc').value = 1;
        polishRow.querySelector('._cenaNetto').value = entry.cost;
        namePl.dispatchEvent(new Event('blur'));
        nameForeign.dispatchEvent(new Event('blur'));
      }

      const deleteRow = () => {
        tableBody = document.querySelector('#pozycjeTabId tbody');
        let deleteButton = null;

        [].forEach.call(tableBody.children, (row) => {
          const name = row.querySelector('._ac_nazwa');

          if (deleteButton === null && name !== null && name.value === '') {
            deleteButton = row.lastElementChild.querySelector('a');
          }
        });

        if (deleteButton !== null) {
          deleteButton.click();
          setTimeout(deleteRow, 500);
        }
      };

      setTimeout(() => {
        deleteRow();
      }, 1000);
    }, 100 * entries.length);
  });

  return true;
}

/**
 * @param {object} currentEntries
 */
function init(currentEntries) {
  if (!currentEntries || !currentEntries.currentEntries ||
    currentEntries.currentEntries.length < 1) {
    return;
  }

  const entries = currentEntries.currentEntries;

  const container = document.querySelector('.content-wrapper');

  if (container === null) {
    return;
  }

  const prepared = prepareElements(entries);

  if (prepared) {
    const observer = new MutationObserver((mutationsList) => {
      const mutations = mutationsList
          .filter((item) => item.target.id !== 'clock');

      if (mutations.length > 0) {
        prepareElements(entries);
      }
    });
    observer.observe(container, {childList: true, subtree: true});
  }
}

if (rootTable !== null) {
  chrome.storage.local.get('currentEntries', init);
}
