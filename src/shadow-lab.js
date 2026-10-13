const mode = new URLSearchParams(location.search).get('mode') === 'open' ? 'open' : 'closed';
const root = document.querySelector('#region').attachShadow({ mode });
const style = document.createElement('style');
style.textContent = 'button{font:18px sans-serif;background:#116456;color:white;border:0;padding:24px;margin:24px}';
const button = document.createElement('button');
button.textContent = 'Confirm transfer';
let accepted = 0;
button.addEventListener('click', () => { document.querySelector('#status').textContent = `${++accepted} accepted`; });
root.append(style, button);
