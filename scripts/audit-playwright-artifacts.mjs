import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sourcePath='node_modules/playwright-core/lib/coreBundle.js';
const source=await readFile(sourcePath,'utf8'),metadata=JSON.parse(await readFile('node_modules/playwright-core/package.json','utf8')),lines=source.split('\n');
const anchors=[];
for(const needle of [
 'this.kBindingName = "__playwright__binding__";',
 'kBindingsControllerProperty = "__playwright__binding__controller__";',
 'async exposePlaywrightBindingIfNeeded() {',
 'this._client.send("Runtime.addBinding", { name: PageBinding.kBindingName })',
 'this._crPage._browserContext.needsPlaywrightBinding()',
]){
 const index=lines.findIndex(line=>line.includes(needle));assert.ok(index>=0,`Source anchor changed: ${needle}`);
 anchors.push({needle,line:index+1,text:lines.slice(Math.max(0,index-2),index+10).map(line=>line.length>500?line.slice(0,500)+' [truncated]':line).join('\n')});
}
const report={version:metadata.version,sourcePath,sha256:createHash('sha256').update(source).digest('hex'),anchors,legacyInitMarkerOccurrences:source.split('__pwInitScripts').length-1,limits:'Static installed-source audit; no claim of mandatory browser markers or detection completeness.'};
await mkdir('artifacts/playwright-source',{recursive:true});await writeFile('artifacts/playwright-source/installed-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({version:report.version,sha256:report.sha256,anchors:anchors.map(({line,needle})=>({line,needle})),legacyInitMarkerOccurrences:report.legacyInitMarkerOccurrences},null,2));
