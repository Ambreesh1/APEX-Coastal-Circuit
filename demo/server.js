/* Optional zero-dependency development server. Directly opening index.html also works. */
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
function createServer(){
  return http.createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
    const filename=pathname==='/'?'index.html':pathname.slice(1);
    if(filename!==path.basename(filename)||filename.includes('..')||filename.includes('\\')){res.writeHead(403);res.end('Forbidden');return;}
    const ext=path.extname(filename);
    if(!types[ext]){res.writeHead(404);res.end('Not found');return;}
    fs.readFile(path.join(__dirname,filename),(error,data)=>{
      if(error){res.writeHead(404);res.end('Not found');return;}
      res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      res.end(req.method==='HEAD'?undefined:data);
    });
  });
}
if(require.main===module){
  const port=Number(process.env.PORT)||3000,host=process.env.HOST||'127.0.0.1';
  const server=createServer();server.on('error',error=>{console.error(`Could not start APEX: ${error.message}`);process.exitCode=1;});
  server.listen(port,host,()=>console.log(`APEX / Coastal Circuit\nhttp://${host}:${port}\nNo build step or external dependencies required.`));
}
module.exports={createServer};
