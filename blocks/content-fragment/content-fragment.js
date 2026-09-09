import { APP_CONFIG } from '../../scripts/config.js';

function flattenObject(obj, prefix = '') {
  const flattened = {};

  Object.keys(obj || {}).forEach((key) => {
    const value = obj[key];

    const newKey = prefix
      ? `${prefix}.${key}`
      : key;

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      Object.assign(
        flattened,
        flattenObject(value, newKey)
      );
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
}

function buildTable(data) {
  const table = document.createElement('table');

  table.className =
    'contentfragment-table';

  const thead =
    document.createElement('thead');

  thead.innerHTML = `
    <tr>
      <th>Property</th>
      <th>Value</th>
    </tr>
  `;

  table.appendChild(thead);

  const tbody =
    document.createElement('tbody');

  Object.entries(data).forEach(
    ([key, value]) => {

      const row =
        document.createElement('tr');

      row.innerHTML = `
        <td>${key}</td>
        <td>${value ?? ''}</td>
      `;

      tbody.appendChild(row);
    },
  );

  table.appendChild(tbody);

  return table;
}

export default async function decorate(block) {
  try {
    const fragmentPath =
      block.textContent.trim();

    if (!fragmentPath) {
      block.innerHTML =
        '<p>No Content Fragment path configured.</p>';
      return;
    }

    const fragmentUrl = `${APP_CONFIG.contentFragmentHost}/api/assets${fragmentPath.replace('/content/dam', '')}.json`;

    const response =
      await fetch(fragmentUrl);
	  // Uncomment below line for testing with a dummy json and comment above line
	  // await fetch('https://dummyjson.com/todos');

    if (!response.ok) {
      throw new Error(
        `CF request failed: ${response.status}`
      );
    }

    const json =
      await response.json();

    const flattened =
      flattenObject(json);

    block.innerHTML = '';

    block.appendChild(
      buildTable(flattened)
    );
  } catch (error) {
    console.error(error);

    block.innerHTML = `
      <div class="contentfragment-error">
        Unable to load Content Fragment.
  `
  }
}