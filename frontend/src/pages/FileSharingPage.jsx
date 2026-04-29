import React,{useEffect,useState} from 'react';
import axios from 'axios';
import Scene3D from '../components/Scene3D';
import {useToast} from '../components/Toast';
import FileIcon from '../components/FileIcon';

export default function FileSharingPage(){
  const toast=useToast();
  const[links,setLinks]=useState([]);
  const[files,setFiles]=useState([]);
  const[loading,setLoading]=useState(true);
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({file_id:'',expiry_days:'',access_limit:'',allow_download:true});
  const[creating,setCreating]=useState(false);
  const[newLink,setNewLink]=useState(null);

  const load=async()=>{
    setLoading(true);
    const[l,f]=await Promise.all([axios.get('/api/sharing/links'),axios.get('/api/files?folder_id=0')]);
    if(l.data.success)setLinks(l.data.links||[]);
    if(f.data.success)setFiles((f.data.files||[]).filter(x=>!x.is_folder));
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const createLink=async()=>{
    if(!form.file_id){toast('Please select a file','error');return;}
    setCreating(true);
    const r=await axios.post('/api/sharing/create',{file_id:parseInt(form.file_id),expiry_days:form.expiry_days?parseInt(form.expiry_days):null,access_limit:form.access_limit?parseInt(form.access_limit):null,allow_download:form.allow_download});
    if(r.data.success){setNewLink(`${window.location.origin}/share/${r.data.token}`);toast('Share link created!','success');load();}else toast(r.data.error,'error');
    setCreating(false);
  };
  const revoke=async id=>{const r=await axios.post(`/api/sharing/revoke/${id}`);if(r.data.success){toast('Link revoked','success');load();}else toast(r.data.error,'error');};
  const copy=url=>{navigator.clipboard.writeText(url);toast('Copied!','success');};
  const fmtExp=d=>{if(!d)return'Never';const dt=new Date(d);return dt<new Date()?<span style={{color:'var(--red)',fontWeight:600}}>Expired</span>:dt.toLocaleDateString();};

  return(
    <div className="scene">
      <Scene3D color="#3b82f6" density={45} speed={.3}/>
      <div className="scene-content"><div className="page-wrap">
        <div className="page-header">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem'}}>
            <div>
              <h1 className="page-title"><i className="fas fa-share-alt" style={{color:'var(--blue)'}}/>File Sharing</h1>
              <p className="page-subtitle">Create and manage secure sharing links</p>
            </div>
            <button className="btn btn-primary" onClick={()=>{setModal(true);setNewLink(null);setForm({file_id:'',expiry_days:'',access_limit:'',allow_download:true});}}>
              <i className="fas fa-plus"/>Create Link
            </button>
          </div>
        </div>

        <div className="grid-4" style={{marginBottom:'clamp(.875rem,2vw,1.25rem)'}}>
          {[{i:'fa-link',l:'Active Links',v:links.length,c:'var(--g600)',bg:'var(--g50)'},
            {i:'fa-download',l:'Allow DL',v:links.filter(l=>l.allow_download).length,c:'var(--blue)',bg:'var(--blue-bg)'},
            {i:'fa-clock',l:'With Expiry',v:links.filter(l=>l.expiry_date).length,c:'var(--amber)',bg:'var(--amber-bg)'},
            {i:'fa-infinity',l:'No Expiry',v:links.filter(l=>!l.expiry_date).length,c:'#7c3aed',bg:'#f5f3ff'}].map(s=>(
            <div key={s.l} className="card-glass" style={{padding:'clamp(.875rem,2vw,1.25rem)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                <div style={{width:40,height:40,background:s.bg,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className={`fas ${s.i}`} style={{color:s.c,fontSize:16}}/>
                </div>
                <div><div style={{fontSize:'clamp(1.25rem,3vw,1.5rem)',fontWeight:800,fontFamily:'Syne,sans-serif'}}>{s.v}</div><div style={{fontSize:'.75rem',color:'var(--text2)'}}>{s.l}</div></div>
              </div>
            </div>
          ))}
        </div>

        <div className="card-glass">
          <div style={{padding:'1.125rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'.5rem'}}>
            <h3 style={{fontWeight:700,color:'var(--g700)',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',gap:'.5rem'}}>
              <i className="fas fa-list" style={{color:'var(--text3)'}}/>Active Share Links
            </h3>
          </div>
          {loading?<div className="loading-center"><div className="spin"/></div>:
           links.length===0?<div className="empty"><i className="fas fa-share-alt empty-icon"/><h3>No share links yet</h3><p>Create your first share link above</p></div>:(
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>File</th><th>Share URL</th><th className="hide-phone">Expires</th><th className="hide-phone">Downloads</th><th className="hide-tablet">Created</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
              <tbody>{links.map(l=>{
                const url=`${window.location.origin}/share/${l.share_token}`;
                return(<tr key={l.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:'.5rem'}}><FileIcon type={l.file_type} size={13}/><span className="truncate" style={{maxWidth:'clamp(80px,18vw,180px)',fontSize:'.8125rem'}}>{l.original_name}</span></div></td>
                  <td><div style={{display:'flex',alignItems:'center',gap:.5+'rem'}}>
                    <code style={{fontSize:'.72rem',background:'var(--bg)',padding:'.2rem .5rem',borderRadius:6,color:'var(--g600)',maxWidth:'clamp(100px,20vw,180px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>{url}</code>
                    <button className="btn-icon" onClick={()=>copy(url)} style={{width:28,height:28}}><i className="fas fa-copy" style={{fontSize:11}}/></button>
                  </div></td>
                  <td className="hide-phone" style={{fontSize:'.8125rem'}}>{fmtExp(l.expiry_date)}</td>
                  <td className="hide-phone"><span className={`badge ${l.allow_download?'badge-green':'badge-gray'}`}>{l.allow_download?'Allowed':'Blocked'}</span></td>
                  <td className="hide-tablet" style={{fontSize:'.8125rem',color:'var(--text2)'}}>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td><div style={{display:'flex',gap:'.125rem',justifyContent:'flex-end'}}>
                    <button className="btn-icon" onClick={()=>copy(url)}><i className="fas fa-copy" style={{fontSize:12}}/></button>
                    <button className="btn-icon danger" onClick={()=>revoke(l.id)}><i className="fas fa-times-circle" style={{fontSize:12}}/></button>
                  </div></td>
                </tr>);
              })}</tbody>
            </table></div>
          )}
        </div>
      </div></div>

      {modal&&<div className="modal-bg" onClick={()=>setModal(false)}><div className="modal-box" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h3><i className="fas fa-share-alt" style={{marginRight:'.5rem',color:'var(--blue)'}}/>Create Share Link</h3><button className="btn-icon" onClick={()=>setModal(false)}><i className="fas fa-times"/></button></div>
        {newLink?(
          <div className="modal-body">
            <div className="alert alert-success"><i className="fas fa-check-circle"/><span>Share link created!</span></div>
            <div style={{background:'var(--bg)',borderRadius:10,padding:'1rem'}}>
              <label style={{fontSize:'.75rem',fontWeight:600,color:'var(--text2)',display:'block',marginBottom:'.375rem'}}>SHARE URL</label>
              <div style={{display:'flex',alignItems:'center',gap:'.625rem',flexWrap:'wrap'}}>
                <code style={{flex:1,fontSize:'.8rem',color:'var(--g600)',wordBreak:'break-all',minWidth:0}}>{newLink}</code>
                <button className="btn btn-primary btn-sm" onClick={()=>copy(newLink)}><i className="fas fa-copy"/>Copy</button>
              </div>
            </div>
            <button className="btn btn-secondary btn-block" style={{justifyContent:'center'}} onClick={()=>setModal(false)}>Close</button>
          </div>
        ):(
          <>
            <div className="modal-body">
              <div className="input-group"><label className="input-label">Select File</label>
                <select className="input" value={form.file_id} onChange={e=>setForm(f=>({...f,file_id:e.target.value}))}>
                  <option value="">— Choose a file —</option>
                  {files.map(f=><option key={f.id} value={f.id}>{f.original_name} ({f.size_fmt})</option>)}
                </select>
              </div>
              <div className="grid-2" style={{gap:'.875rem'}}>
                <div className="input-group"><label className="input-label">Expires (days)</label><input className="input" type="number" min={1} placeholder="No expiry" value={form.expiry_days} onChange={e=>setForm(f=>({...f,expiry_days:e.target.value}))}/></div>
                <div className="input-group"><label className="input-label">Access Limit</label><input className="input" type="number" min={1} placeholder="Unlimited" value={form.access_limit} onChange={e=>setForm(f=>({...f,access_limit:e.target.value}))}/></div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.875rem',background:'var(--bg)',borderRadius:10}}>
                <input type="checkbox" id="dl" checked={form.allow_download} onChange={e=>setForm(f=>({...f,allow_download:e.target.checked}))} style={{width:16,height:16,accentColor:'var(--g600)'}}/>
                <label htmlFor="dl" style={{fontSize:'.875rem',fontWeight:500,cursor:'pointer'}}>Allow file download</label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createLink} disabled={creating}>
                {creating?<><span className="spin spin-sm"/>Creating...</>:<><i className="fas fa-link"/>Create</>}
              </button>
            </div>
          </>
        )}
      </div></div>}
    </div>
  );
}