const parameters=new URLSearchParams(location.search);
const start=Number(parameters.get('start'));
const period=750, count=8, samples=Array.from({length:count},()=>[]);
const load=parameters.has('load');
const channel=new MessageChannel();
let remaining=0, resolveTasks, checksum=0;
channel.port1.onmessage=()=>{
  if(--remaining===0)resolveTasks();
  else channel.port2.postMessage(0);
};
function tasks(){return new Promise(resolve=>{remaining=1000;resolveTasks=resolve;channel.port2.postMessage(0);});}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function summary(values) {
  values.sort((a,b)=>a-b);
  return {count:values.length,median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],minimum:values[0],maximum:values.at(-1)};
}
document.title='Task observer ready';
await sleep(Math.max(0,start-Date.now()));
while(Date.now()<start+count*period) {
  if(load){const until=performance.now()+3;while(performance.now()<until){}}
  const at=Date.now(), phase=Math.floor((at-start)/period);
  const begin=performance.now();await tasks();const taskMs=performance.now()-begin;
  const loopBegin=performance.now();for(let i=0;i<100000;i++)checksum=(checksum+i)|0;
  const loopMs=performance.now()-loopBegin;
  const offset=at-start-phase*period;
  if(phase>=0&&phase<count&&offset>=100&&Date.now()-start-phase*period<=period-100) {
    samples[phase].push({taskMs,loopMs});
  }
  await sleep(8);
}
channel.port1.close();channel.port2.close();
const result={load,start,period,checksum,phases:samples.map((values,index)=>({index,
  tasks:summary(values.map(value=>value.taskMs)),loop:summary(values.map(value=>value.loopMs))}))};
document.title=JSON.stringify(result);
