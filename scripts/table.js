(async () => {
  const { savedLink } = await chrome.storage.local.get('savedLink');
  if (!savedLink) return;

  const table = document.createElement('table');
  table.style.border = '1px solid #000';
  table.style.margin = '1rem';

  const tr = document.createElement('tr');
  ['リンクテキスト', 'URL'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.border = '1px solid #000';
    th.style.padding = '4px';
    tr.append(th);
  });
  table.append(tr);

  const tr2 = document.createElement('tr');
  [savedLink.text, savedLink.href].forEach(val => {
    const td = document.createElement('td');
    td.textContent = val;
    td.style.border = '1px solid #000';
    td.style.padding = '4px';
    tr2.append(td);
  });
  table.append(tr2);

  document.body.prepend(table);
})(); 