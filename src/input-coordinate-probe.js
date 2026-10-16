const samples=[];
let ready=false;
for(const type of ['pointermove','mousemove','pointerdown','click']) {
  document.addEventListener(type,event=>{
    if(!ready)return;
    samples.push({type,isTrusted:event.isTrusted,clientX:event.clientX,clientY:event.clientY,
      pageX:event.pageX,pageY:event.pageY,screenX:event.screenX,screenY:event.screenY,
      movementX:event.movementX,movementY:event.movementY,pointerType:event.pointerType,
      equality:event.pageX===event.screenX&&event.pageY===event.screenY});
    if(samples.length>4)samples.shift();
    document.title=JSON.stringify({window:{screenX:window.screenX,screenY:window.screenY,
      scrollX,scrollY,innerWidth,innerHeight},samples});
  },true);
}
setTimeout(()=>{
  scrollTo(0,new URLSearchParams(location.search).has('scroll')?200:0);
  requestAnimationFrame(()=>{ready=true;document.title='Input probe ready';});
},250);
