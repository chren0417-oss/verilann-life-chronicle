import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {Plugin} from 'vite';

function localSavePlugin():Plugin{
  return {
    name:'verilann-local-save',
    configureServer(server){
      server.middlewares.use('/api/save-local',(req,res,next)=>{
        if(req.method!=='POST'){next();return}
        const chunks:Buffer[]=[];
        req.on('data',(c:Buffer)=>chunks.push(c));
        req.on('end',()=>{
          try{
            const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const g=body&&typeof body==='object'&&body.game?body.game:body;
            if(!g||typeof g!=='object'||typeof g.day!=='number'){
              res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'存档无效'}));return;
            }
            const dir=join(process.cwd(),'cundang');
            mkdirSync(dir,{recursive:true});
            const text=JSON.stringify(g,null,2);
            writeFileSync(join(dir,'latest.json'),text,'utf8');
            res.statusCode=200;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:true,day:g.day}));
          }catch(e){
            res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:String((e as Error)?.message||e)}));
          }
        });
      });
    }
  };
}

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      localSavePlugin(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
