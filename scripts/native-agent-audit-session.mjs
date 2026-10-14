import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
const profile=await mkdtemp(join(tmpdir(),'antiagent-native-audit-'));
const args=[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','http://127.0.0.1:5173/bot-signal.html'];
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args,{stdio:'ignore'});
await writeFile('docs/native-agent-launch.json',JSON.stringify({executable:'Google Chrome',arguments:args.map(value=>value.startsWith('--user-data-dir=')?'--user-data-dir=<fresh temporary profile>':value),debuggingTransportRequested:false,interaction:'Native input planned; window selection must be verified separately'},null,2));
console.log('Native audit browser started without remote debugging. Send close to end this isolated session.');
const input=createInterface({input:process.stdin});
try {
  for await (const line of input) if(line.trim()==='close')break;
} finally {
  input.close();
  const exited=new Promise(resolve=>chrome.once('exit',resolve));
  if(chrome.exitCode===null&&chrome.signalCode===null) {chrome.kill('SIGTERM');await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,2000))]);}
  if(chrome.exitCode!==null||chrome.signalCode!==null)await rm(profile,{recursive:true,force:true});
}
