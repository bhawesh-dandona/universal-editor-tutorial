export default function decorate(block) {

  const rows = [...block.querySelectorAll('tr')];

  rows.forEach((row) => {

    const cols = row.querySelectorAll('td');

    if (cols.length !== 2) {
      return;
    }

    const name = cols[0].textContent.trim();
    const value = cols[1].textContent.trim();

    const meta = document.createElement('meta');

    meta.name = name;
    meta.content = value;

    document.head.appendChild(meta);
  });
}