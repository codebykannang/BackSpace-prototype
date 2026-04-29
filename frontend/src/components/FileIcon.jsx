import React from 'react';
const MAP={image:{i:'fa-image',c:'fi-image'},video:{i:'fa-film',c:'fi-video'},audio:{i:'fa-music',c:'fi-audio'},
  document:{i:'fa-file-alt',c:'fi-document'},archive:{i:'fa-file-archive',c:'fi-archive'},
  folder:{i:'fa-folder',c:'fi-folder'},other:{i:'fa-file',c:'fi-other'}};
export default function FileIcon({type,isFolder,size=18,className=''}){
  const k=isFolder?'folder':(type||'other');
  const{i,c}=MAP[k]||MAP.other;
  return <i className={`fas ${i} ${c} ${className}`} style={{fontSize:size}}/>;
}
