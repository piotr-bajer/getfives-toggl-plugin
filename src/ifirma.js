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

  const getTableBody = () => {
    return document.querySelector('#pozycjeTabId tbody');
  };

  footer.insertAdjacentHTML('beforeend',
      '<button class="btn btn-secondary" type="button" id="getfives-import">' +
    '<i class="fa fa-plus"></i> ' +
    'dodaj wpisy z Getfives (' + entries.length + ')' +
    '</button>');

  footer.lastChild.addEventListener('click', (event) => {
    event.preventDefault();

    let tableBody = getTableBody();
    const destinationRows = Math.max(entries.length,
        tableBody.children.length / 2);
    const rowsToCreate = entries.length - tableBody.children.length / 2 + 1;

    for (let i = 0; i < rowsToCreate; i++) {
      addRowButton.click();
    }

    const deleteRows = () => {
      const deleteRow = () => {
        tableBody = getTableBody();
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
    };

    const setValue = (input, value, afterChange = null) => {
      input.value = value;
      if (afterChange !== null) {
        afterChange();
      }
    };

    const addEntries = () => {
      let index = 0;

      const fillData = () => {
        tableBody = getTableBody();

        const polishRow = tableBody.children[index * 2];
        const foreignRow = tableBody.children[index * 2 + 1];
        const entry = entries[index];
        const namePl = polishRow.querySelector('._ac_nazwa');
        const nameForeign = foreignRow.querySelector('._ac_nazwaObca');
        const unitPl = polishRow.querySelector('._jednostka');
        const unitForeign = foreignRow.querySelector('._jednostkaObca');
        const quantity = polishRow.querySelector('._ilosc');
        const priceNetto = polishRow.querySelector('._cenaNetto');

        setValue(namePl, entry.name);
        namePl.dispatchEvent(new Event('blur'));
        setValue(nameForeign, entry.name);
        nameForeign.dispatchEvent(new Event('blur'));
        setValue(unitPl, 'usł.');
        setValue(unitForeign, 'serv.');
        setValue(quantity, 1);
        setValue(priceNetto, entry.cost.toString().replace('.', ','));
        priceNetto.dispatchEvent(new Event('change'));
      };

      const nextRow = () => {
        fillData(index);
        index += 1;

        if (index < entries.length) {
          return setTimeout(nextRow, 200);
        }

        tableBody = getTableBody();
        const limit = tableBody.children.length / 2 - entries.length;

        for (let i = 0; i < limit; i++) {
          const row = tableBody.children[entries.length * 2 + i * 2];
          const name = row.querySelector('._ac_nazwa');

          if (name !== null) {
            name.value = '';
          }

          setTimeout(deleteRows, 1000);
        }
      };

      nextRow();
    };

    const checkRows = () => {
      tableBody = getTableBody();

      if (tableBody.children.length / 2 >= destinationRows) {
        addEntries();
      } else {
        setTimeout(checkRows, 200);
      }
    };

    setTimeout(checkRows, 500 + 500 * Math.min(rowsToCreate, 1));
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
