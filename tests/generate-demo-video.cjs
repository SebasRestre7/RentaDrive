// Generates clearly fictional 1-second local video fixtures from the existing car photographs.
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const page=await browser.newPage();
    for(const name of ['toyota','mazda','sandero']){
      const src=fs.readFileSync(path.join(__dirname,'../assets/catalog',`${name}-card.png`)).toString('base64');
      const result=await page.evaluate(async source=>{
        const image=new Image();image.src=`data:image/png;base64,${source}`;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
        const context=canvas.getContext('2d');context.fillStyle='#f6f9fc';context.fillRect(0,0,640,360);
        const scale=Math.min(580/image.width,300/image.height);const width=image.width*scale,height=image.height*scale;
        context.drawImage(image,(640-width)/2,(360-height)/2,width,height);
        const stream=canvas.captureStream(10);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
        const chunks=[];recorder.ondataavailable=event=>chunks.push(event.data);
        const complete=new Promise(resolve=>recorder.onstop=resolve);recorder.start();await new Promise(resolve=>setTimeout(resolve,1200));recorder.stop();await complete;
        const blob=new Blob(chunks,{type:'video/webm'});const reader=new FileReader();
        return await new Promise(resolve=>{reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
      },src);
      fs.writeFileSync(path.join(__dirname,'../assets/catalog',`${name}-demo.webm`),Buffer.from(result,'base64'));
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
