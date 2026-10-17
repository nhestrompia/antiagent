export function mount(root,onAccepted){
  const heading=document.createElement('h1');heading.textContent='Payment approval';
  const token=document.createElement('p');token.textContent='REAL TOKEN 7391';
  const button=document.createElement('button');button.textContent='Approve transfer';
  root.append(heading,token,button);
  const click=event=>{if(event.isTrusted)onAccepted();};
  button.addEventListener('click',click);
  return()=>button.removeEventListener('click',click);
}
