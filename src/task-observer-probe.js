const parameters=new URLSearchParams(location.search);
const start=Number(parameters.get('start'));
const period=750, count=8, samples=Array.from({length:count},()=>[]);
const load=parameters.has('load');
const consoleMode=parameters.has('console');
const channel=new MessageChannel();
let remaining=0, resolveTasks, checksum=0;
channel.port1.onmessage=()=>{
  if(--remaining===0)resolveTasks();
  else channel.port2.postMessage(0);
};
function tasks(count=1000){return new Promise(resolve=>{remaining=count;resolveTasks=resolve;channel.port2.postMessage(0);});}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function summary(values) {
  values.sort((a,b)=>a-b);
  return {count:values.length,median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],minimum:values[0],maximum:values.at(-1)};
}
document.title='Task observer ready';
await sleep(Math.max(0,start-Date.now()));
while(Date.now()<start+count*period) {
  if(consoleMode){const offset=(Date.now()-start)%period;if(offset<100||offset>=period-100){await sleep(10);continue;}}
  if(load){const until=performance.now()+3;while(performance.now()<until){}}
  const at=Date.now(), phase=Math.floor((at-start)/period);
  const begin=performance.now();
  if(consoleMode){for(let i=0;i<1000;i++)console.log(0);console.clear();}
  else await tasks();
  const taskMs=performance.now()-begin;
  const loopBegin=performance.now();for(let i=0;i<100000;i++)checksum=(checksum+i)|0;
  const loopMs=performance.now()-loopBegin;
  const offset=at-start-phase*period;
  if(phase>=0&&phase<count&&offset>=100&&Date.now()-start-phase*period<=period-100) {
    samples[phase].push({taskMs,loopMs,hidden:document.hidden,focused:document.hasFocus()});
  }
  if(consoleMode)await tasks(1);else await sleep(8);
}
channel.port1.close();channel.port2.close();
const result={load,consoleMode,start,period,checksum,phases:samples.map((values,index)=>({index,
  hiddenSamples:values.filter(value=>value.hidden).length,unfocusedSamples:values.filter(value=>!value.focused).length,
  tasks:summary(values.map(value=>value.taskMs)),loop:summary(values.map(value=>value.loopMs))}))};
document.title=JSON.stringify(result);
