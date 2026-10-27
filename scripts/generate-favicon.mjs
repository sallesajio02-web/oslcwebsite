import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
// Use the sewing-machine symbol from the supplied OSLC logo for small browser tabs.
const source='public/brand/oslc-logo.webp';
const {width,height}=await sharp(source).metadata();
const crop=await sharp(source).extract({left:Math.round(width*.582),top:Math.round(height*.174),width:Math.round(width*.33),height:Math.round(height*.51)}).png().toBuffer();
const cropMeta=await sharp(crop).metadata();
const cleaned=await sharp(crop).composite([{input:{create:{width:Math.round(cropMeta.width*.078),height:Math.round(cropMeta.height*.3),channels:3,background:'#ffffff'}},left:0,top:Math.floor(cropMeta.height*.7)}]).png().toBuffer();
const symbol=await sharp(cleaned).trim().png().toBuffer();
async function icon(size){return sharp(symbol).resize({width:Math.round(size*.84),height:Math.round(size*.84),fit:'contain',background:'#ffffff'}).extend({top:Math.floor(size*.08),bottom:size-Math.round(size*.84)-Math.floor(size*.08),left:Math.floor(size*.08),right:size-Math.round(size*.84)-Math.floor(size*.08),background:'#ffffff'}).png().toBuffer();}
for(const size of [16,32,48,180,512])await writeFile(`public/${size===180?'apple-touch-icon':`favicon-${size}x${size}`}.png`,await icon(size));
const sizes=[16,32,48];const images=await Promise.all(sizes.map(icon));const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
images.forEach((bytes,i)=>{const start=6+16*i;header[start]=sizes[i];header[start+1]=sizes[i];header.writeUInt16LE(1,start+4);header.writeUInt16LE(32,start+6);header.writeUInt32LE(bytes.length,start+8);header.writeUInt32LE(offset,start+12);offset+=bytes.length;});
await writeFile('public/favicon.ico',Buffer.concat([header,...images]));
console.log('OSLC favicon and touch icons generated.');
