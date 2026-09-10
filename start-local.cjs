const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const root=__dirname;process.chdir(root);
for(const [name,target] of JSON.parse(fs.readFileSync(path.join(root,'dependency-links.json'),'utf8'))){const link=path.join(root,name);try{fs.lstatSync(link);fs.unlinkSync(link);}catch(e){if(e.code!=='ENOENT')throw e;}fs.mkdirSync(path.dirname(link),{recursive:true});fs.symlinkSync(path.join(root,target),link,'junction');}
const child=spawn(process.execPath,[path.join(root,'node_modules/vinext/dist/cli.js'),'dev','--host','127.0.0.1','--port',process.env.PORT||'3000'],{cwd:root,stdio:'inherit',env:{...process.env,PATH:path.join(root,'runtime')+path.delimiter+process.env.PATH}});child.on('exit',code=>process.exit(code||0));
