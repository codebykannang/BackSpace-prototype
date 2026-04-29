import React,{useEffect,useState,useRef} from 'react';
import axios from 'axios';
import FileIcon from '../components/FileIcon';
import Scene3D from '../components/Scene3D';
import {useToast} from '../components/Toast';

export default function FileManagementPage(){
  const toast=useToast();
  const fileRef=useRef();

  // ─── STATE ────────────────────────────────────────────────────────────────
  const[files,setFiles]=useState([]);
  const[loading,setLoading]=useState(true);
  const[fid,setFid]=useState(0);
  const[bc,setBc]=useState([]);
  const[view,setView]=useState('list');
  const[q,setQ]=useState('');
  const[qRes,setQRes]=useState(null);

  // Upload: two-phase — "Sending to server" then "Uploading to Telegram"
  const[uploading,setUploading]=useState(false);
  const[uploadPhase,setUploadPhase]=useState('');   // 'server' | 'telegram'
  const[uploadPct,setUploadPct]=useState(0);
  const[uploadName,setUploadName]=useState('');

  const[drag,setDrag]=useState(false);
  const[sel,setSel]=useState(new Set());
  const[mkDir,setMkDir]=useState(false);
  const[dirName,setDirName]=useState('');
  const[rename,setRename]=useState(null);
  const[renameName,setRenameName]=useState('');

  // ─── LOAD ─────────────────────────────────────────────────────────────────
  const load=async(id=fid)=>{
    setLoading(true);
    const r=await axios.get(`/api/files?folder_id=${id}`).catch(()=>({data:{success:false}}));
    if(r.data.success){setFiles(r.data.files);setBc(r.data.breadcrumb||[]);}
    setLoading(false);
  };
  useEffect(()=>{load(fid);},[fid]);

  // ─── SEARCH ───────────────────────────────────────────────────────────────
  const search=async v=>{
    setQ(v);
    if(!v){setQRes(null);return;}
    const r=await axios.get(`/api/files/search?q=${encodeURIComponent(v)}`);
    if(r.data.success)setQRes(r.data.files);
  };

  // ─── UPLOAD ───────────────────────────────────────────────────────────────
  // Phase 1: Browser → Flask  (shown via onUploadProgress, fast on localhost)
  // Phase 2: Flask → Telegram (shown as indeterminate spinner while axios waits)
  // The proxy timeout is set to 2 hours in setupProxy.js so GB files are fine.
  const upload=async fl=>{
    setUploading(true);
    for(const f of fl){
      setUploadName(f.name);
      setUploadPhase('server');
      setUploadPct(0);
      const fd=new FormData();
      fd.append('file',f);
      fd.append('parent_folder_id',fid);
      try{
        await axios.post('/api/files/upload',fd,{
          timeout:0,  // no axios timeout — large Telegram uploads can take many minutes
          onUploadProgress:e=>{
            const pct=Math.round(e.loaded/e.total*100);
            setUploadPct(pct);
            // Once 100% received by Flask, switch to "uploading to Telegram" phase
            if(pct>=100) setUploadPhase('telegram');
          }
        });
        toast(`Uploaded: ${f.name}`,'success');
      }catch(err){
        const msg=err?.response?.data?.error||err.message||'Upload failed';
        toast(`Failed: ${f.name} — ${msg}`,'error');
      }
    }
    setUploading(false);
    setUploadPhase('');
    setUploadPct(0);
    setUploadName('');
    load(fid);
  };

  // ─── DOWNLOAD ─────────────────────────────────────────────────────────────
  // Use a hidden <a> click so the browser streams the response natively.
  // This works for ANY file size because the browser handles the stream —
  // unlike axios.get(blob) which loads the entire file into RAM first.
  // Session cookies are sent automatically (same-origin request via CRA proxy).
  const downloadFile=(fid,name)=>{
    const a=document.createElement('a');
    a.href=`/api/files/${fid}/download`;
    a.setAttribute('download',name||'download');
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>document.body.removeChild(a),500);
  };

  // ─── FOLDER / RENAME / DELETE ─────────────────────────────────────────────
  const createDir=async()=>{
    if(!dirName.trim())return;
    const r=await axios.post('/api/files/create-folder',{name:dirName,parent_folder_id:fid});
    if(r.data.success){toast('Folder created','success');setMkDir(false);setDirName('');load(fid);}
    else toast(r.data.error,'error');
  };
  const del=async id=>{
    const r=await axios.post(`/api/files/${id}/delete`);
    if(r.data.success){toast('Moved to trash','success');load(fid);}
    else toast(r.data.error,'error');
  };
  const doRename=async()=>{
    if(!renameName.trim())return;
    const r=await axios.post(`/api/files/${rename.id}/rename`,{name:renameName});
    if(r.data.success){toast('Renamed','success');setRename(null);load(fid);}
    else toast(r.data.error,'error');
  };
  const toggleSel=id=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const display=qRes!==null?qRes:files;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return(
    <div className="scene">
      <Scene3D color="#5caa96" density={50} speed={.4} lines={false}/>
      <div className="scene-content">
        <div className="page-wrap">
          {/* Header */}
          <div className="page-header">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem',marginBottom:'1rem'}}>
              <div>
                <h1 className="page-title"><i className="fas fa-folder-open fi-folder"/>My Files</h1>
                <nav style={{display:'flex',alignItems:'center',gap:'.375rem',flexWrap:'wrap',marginTop:'.5rem',fontSize:'.8125rem',color:'var(--text2)'}}>
                  <button onClick={()=>{setFid(0);setQ('');setQRes(null);}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g600)',fontWeight:600,padding:0,fontSize:'inherit',display:'flex',alignItems:'center',gap:'.25rem'}}>
                    <i className="fas fa-home" style={{fontSize:11}}/>Root
                  </button>
                  {bc.map(b=>(
                    <React.Fragment key={b.id}>
                      <i className="fas fa-chevron-right" style={{fontSize:9,color:'var(--text3)'}}/>
                      <button onClick={()=>setFid(b.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g600)',fontWeight:600,padding:0,fontSize:'inherit'}}>{b.name}</button>
                    </React.Fragment>
                  ))}
                </nav>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'.625rem',flexWrap:'wrap'}}>
                <button onClick={()=>setMkDir(true)} className="btn btn-secondary btn-sm"><i className="fas fa-folder-plus"/>New Folder</button>
                <button onClick={()=>fileRef.current.click()} className="btn btn-primary btn-sm"><i className="fas fa-upload"/>Upload</button>
                <input type="file" ref={fileRef} style={{display:'none'}} multiple onChange={e=>upload(Array.from(e.target.files))}/>
                <div style={{display:'flex',gap:'.25rem',background:'var(--bg)',borderRadius:'var(--r-sm)',padding:'.25rem',border:'1px solid var(--border)'}}>
                  {['list','grid'].map(v=>(
                    <button key={v} className={`btn-icon${view===v?' active':''}`} onClick={()=>setView(v)} style={{width:30,height:30}}>
                      <i className={`fas ${v==='list'?'fa-list':'fa-th'}`} style={{fontSize:12}}/>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{position:'relative'}}>
              <i className="fas fa-search" style={{position:'absolute',left:'.875rem',top:'50%',transform:'translateY(-50%)',color:'var(--text3)',fontSize:13,pointerEvents:'none'}}/>
              <input className="input" style={{paddingLeft:'2.5rem',paddingRight:'2.5rem'}} placeholder="Search files and folders..." value={q} onChange={e=>search(e.target.value)}/>
              {q&&<button onClick={()=>{setQ('');setQRes(null);}} style={{position:'absolute',right:'.875rem',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)'}}><i className="fas fa-times"/></button>}
            </div>
          </div>

          {/* Upload progress — two phases */}
          {uploading&&(
            <div className="card-glass" style={{padding:'1rem 1.5rem',marginBottom:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                <div className="spin spin-sm"/>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'.8125rem',marginBottom:'.375rem'}}>
                    <span style={{fontWeight:500,maxWidth:'60%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {uploadPhase==='telegram'
                        ? <><i className="fas fa-paper-plane" style={{marginRight:'.375rem',color:'var(--g500)'}}/> Uploading to Telegram: <em>{uploadName}</em></>
                        : <><i className="fas fa-upload" style={{marginRight:'.375rem'}}/> Sending to server: <em>{uploadName}</em></>
                      }
                    </span>
                    <span style={{color:'var(--g600)',fontWeight:700}}>
                      {uploadPhase==='telegram'?'Processing…':uploadPct+'%'}
                    </span>
                  </div>
                  {uploadPhase==='telegram'
                    ? <div className="progress" style={{height:5}}><div className="progress-fill" style={{width:'100%',background:'var(--g500)',animation:'indeterminate 1.5s infinite linear',backgroundSize:'200% 100%'}}/></div>
                    : <div className="progress" style={{height:5}}><div className="progress-fill" style={{width:`${uploadPct}%`,background:'var(--g500)'}}/></div>
                  }
                  {uploadPhase==='telegram'&&(
                    <p style={{fontSize:'.75rem',color:'var(--text3)',marginTop:'.375rem'}}>
                      Large files are split into chunks and uploaded to Telegram — this may take a few minutes.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div className={`drop-zone${drag?' over':''}`} style={{marginBottom:'1.125rem'}}
            onDrop={e=>{e.preventDefault();setDrag(false);upload(Array.from(e.dataTransfer.files));}}
            onDragOver={e=>{e.preventDefault();setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onClick={()=>fileRef.current.click()}>
            <i className="fas fa-cloud-upload-alt" style={{fontSize:36,color:'var(--g400)',marginBottom:'.625rem',display:'block'}}/>
            <p style={{fontWeight:600,color:'var(--text)',marginBottom:'.25rem'}}>Drag & drop files here</p>
            <p style={{fontSize:'.8125rem',color:'var(--text2)'}}>or tap to browse — any size, split & stored on Telegram</p>
          </div>

          {/* File list / grid */}
          <div className="card-glass">
            {loading?<div className="loading-center"><div className="spin"/></div>:
             display.length===0?<div className="empty"><i className="fas fa-folder-open empty-icon"/><h3>{q?'No results':'Empty folder'}</h3><p>{q?`No files match "${q}"`:'Upload files or create a folder'}</p></div>:
             view==='list'?(
              <div className="tbl-wrap"><table className="tbl">
                <thead><tr>
                  <th style={{width:36}}><input type="checkbox" onChange={e=>{if(e.target.checked)setSel(new Set(display.map(f=>f.id)));else setSel(new Set());}}/></th>
                  <th>Name</th><th className="hide-phone">Type</th><th className="hide-phone">Size</th><th className="hide-tablet">Modified</th><th style={{textAlign:'right'}}>Actions</th>
                </tr></thead>
                <tbody>{display.map(f=>(
                  <tr key={f.id}>
                    <td><input type="checkbox" checked={sel.has(f.id)} onChange={()=>toggleSel(f.id)}/></td>
                    <td><div style={{display:'flex',alignItems:'center',gap:'.625rem',cursor:f.is_folder?'pointer':undefined}} onClick={()=>f.is_folder&&setFid(f.id)}><FileIcon type={f.file_type} isFolder={f.is_folder} size={15}/><span className="truncate" style={{maxWidth:'clamp(120px,30vw,280px)',fontWeight:f.is_folder?600:400}}>{f.original_name}</span></div></td>
                    <td className="hide-phone"><span className="badge badge-gray" style={{textTransform:'capitalize'}}>{f.is_folder?'Folder':f.file_type}</span></td>
                    <td className="hide-phone" style={{color:'var(--text2)',fontSize:'.8125rem'}}>{f.is_folder?'—':f.size_fmt}</td>
                    <td className="hide-tablet" style={{color:'var(--text2)',fontSize:'.8125rem'}}>{new Date(f.updated_at||f.created_at).toLocaleDateString()}</td>
                    <td><div style={{display:'flex',gap:'.125rem',justifyContent:'flex-end'}}>
                      {!f.is_folder&&<button className="btn-icon" title="Download" onClick={()=>downloadFile(f.id,f.original_name)}><i className="fas fa-download" style={{fontSize:12}}/></button>}
                      <button className="btn-icon" title="Rename" onClick={()=>{setRename(f);setRenameName(f.original_name);}}><i className="fas fa-edit" style={{fontSize:12}}/></button>
                      <button className="btn-icon danger" title="Delete" onClick={()=>del(f.id)}><i className="fas fa-trash" style={{fontSize:12}}/></button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table></div>
             ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'1rem',padding:'1.25rem'}}>
                {display.map(f=>(
                  <div key={f.id} className="card card-hover" style={{padding:'1.125rem',textAlign:'center',border:sel.has(f.id)?'2px solid var(--g500)':undefined}} onClick={()=>f.is_folder?setFid(f.id):toggleSel(f.id)}>
                    <FileIcon type={f.file_type} isFolder={f.is_folder} size={36}/>
                    <p style={{fontSize:'.78rem',fontWeight:500,marginTop:'.5rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.original_name}</p>
                    <p style={{fontSize:'.7rem',color:'var(--text2)',marginTop:'.15rem'}}>{f.is_folder?'Folder':f.size_fmt}</p>
                    <div style={{display:'flex',gap:'.25rem',justifyContent:'center',marginTop:'.625rem'}}>
                      {!f.is_folder&&<button className="btn-icon" style={{width:28,height:28}} title="Download" onClick={e=>{e.stopPropagation();downloadFile(f.id,f.original_name);}}><i className="fas fa-download" style={{fontSize:11}}/></button>}
                      <button className="btn-icon danger" style={{width:28,height:28}} onClick={e=>{e.stopPropagation();del(f.id);}}><i className="fas fa-trash" style={{fontSize:11}}/></button>
                    </div>
                  </div>
                ))}
              </div>
             )}
          </div>
        </div>
      </div>

      {/* New Folder modal */}
      {mkDir&&<div className="modal-bg" onClick={()=>setMkDir(false)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h3><i className="fas fa-folder-plus" style={{marginRight:'.5rem',color:'var(--gold)'}}/>New Folder</h3><button className="btn-icon" onClick={()=>setMkDir(false)}><i className="fas fa-times"/></button></div>
        <div className="modal-body"><div className="input-group"><label className="input-label">Folder Name</label><input className="input" autoFocus value={dirName} onChange={e=>setDirName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createDir()} placeholder="e.g. My Documents"/></div></div>
        <div className="modal-foot"><button className="btn btn-secondary" onClick={()=>setMkDir(false)}>Cancel</button><button className="btn btn-primary" onClick={createDir}><i className="fas fa-folder-plus"/>Create</button></div>
      </div></div>}

      {/* Rename modal */}
      {rename&&<div className="modal-bg" onClick={()=>setRename(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h3><i className="fas fa-edit" style={{marginRight:'.5rem',color:'var(--g600)'}}/>Rename</h3><button className="btn-icon" onClick={()=>setRename(null)}><i className="fas fa-times"/></button></div>
        <div className="modal-body"><div className="input-group"><label className="input-label">New Name</label><input className="input" autoFocus value={renameName} onChange={e=>setRenameName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doRename()}/></div></div>
        <div className="modal-foot"><button className="btn btn-secondary" onClick={()=>setRename(null)}>Cancel</button><button className="btn btn-primary" onClick={doRename}><i className="fas fa-check"/>Rename</button></div>
      </div></div>}
    </div>
  );
}
