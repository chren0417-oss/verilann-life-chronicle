import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache=new Map();
function moduleURL(filename){filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename);const source=fs.readFileSync(filename,'utf8');let js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;js=js.replace(/from ['"](\.\.?\/[^'"]+)['"]/g,(_,ref)=>`from '${moduleURL(path.resolve(path.dirname(filename),ref+'.ts'))}'`);const url='data:text/javascript;base64,'+Buffer.from(js).toString('base64');cache.set(filename,url);return url;}
export function importTS(filename){return import(moduleURL(filename))}
