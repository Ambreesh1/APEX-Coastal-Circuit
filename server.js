/* Optional zero-dependency development server. Opening index.html directly also works. */
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.md':'text/plain; charset=utf-8'};
function createServer(){
  return http.createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
    const name=pathname==='/'?'index.html':pathname.slice(1);
    // Flat project only: do not expose parent directories, dotfiles or absolute paths.
    if(name.includes('/')||name.includes('\\')||name.includes(':')||name.startsWith('.')){res.writeHead(403);res.end('Forbidden');return;}
    const filename=path.join(__dirname,name);
    fs.stat(filename,(err,stat)=>{
      if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')res.end();else fs.createReadStream(filename).pipe(res);
    });
  });
}
if(require.main===module){
  const port=Number(process.env.PORT)||3000,server=createServer();
  server.on('error',error=>{console.error(`Could not start server: ${error.message}`);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`APEX Coastal Circuit: http://localhost:${port}\nNo build step or internet connection required.`));
}
module.exports={createServer};
