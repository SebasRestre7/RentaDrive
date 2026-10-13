// Object URLs are document-session previews, never durable media references.
const selections=new Map();
export const mediaLimits={image:2*1024*1024,video:20*1024*1024};
const types={image:['image/png','image/jpeg','image/webp'],video:['video/webm','video/mp4']};
export function selectSessionMedia(vehicleId,kind,file) {
  if (!types[kind]?.includes(file?.type)||!file.size||file.size>mediaLimits[kind]) throw new Error('Imagen PNG/JPEG/WebP hasta 2 MB; video WebM/MP4 hasta 20 MB.');
  const entry=selections.get(vehicleId)??{};
  if(entry[kind])URL.revokeObjectURL(entry[kind]);
  entry[kind]=URL.createObjectURL(file);selections.set(vehicleId,entry);
  return entry[kind];
}
export function sessionMedia(vehicleId) { return selections.get(vehicleId)??{}; }
export function durableVehicle(vehicle) {
  const {packagedImage,packagedVideo,...record}=vehicle;
  if(String(record.image).startsWith('blob:'))record.image=packagedImage;
  if(String(record.video).startsWith('blob:'))record.video=packagedVideo;
  return record;
}
export function withSessionMedia(vehicle) { return {...vehicle,packagedImage:vehicle.image,packagedVideo:vehicle.video,...sessionMedia(vehicle.id)}; }
export function clearSessionMedia() { for(const entry of selections.values())for(const url of Object.values(entry))URL.revokeObjectURL(url);selections.clear(); }
if(typeof window.addEventListener==='function')window.addEventListener('pagehide',clearSessionMedia);
