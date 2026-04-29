import React,{useEffect,useState} from 'react';
import axios from 'axios';
import Scene3D from '../components/Scene3D';
import {useToast} from '../components/Toast';
import FileIcon from '../components/FileIcon';

export default function TrashPage(){
  const toast=useToast();
  const[files,setFiles]=useState([]);
  const[loading,setLoading]=useState(true);
  const[sel,setSel]=useState(new Set());
  const[emptyModal,setEmptyModal]=useState(false);

  const load=async()=>{setLoading(true);const r=await axios.get('/api/trash');if(r.data.success)setFiles(r.data.files||[]);setLoading(false);};
  useEffect(()=>{load();},[]);

  const restore=async id=>{const r=await axios.post(`/api/trash/restore/${id}`);if(r.data.success){toast('File restored','success');load();}else toast(r.data.error,'error');};
  const delPerm=async id=>{if(!window.confirm('Permanently delete?'))return;const r=await axios.post(`/api/trash/delete-permanently/${id}`);if(r.data.success){toast('Deleted permanently','success');load();}else toast(r.data.error,'error');};
  const empty=async()=>{const r=await axios.post('/api/trash/empty');if(r.data.success){toast('Trash emptied','success');setEmptyModal(false);load();}else toast(r.data.error,'error');};
  const restoreSel=async()=>{if(!sel.size)return;const r=await axios.post('/api/trash/restore-selected',{file_ids:[...sel]});if(r.data.success){toast(`Restored ${sel.size}`,'success');setSel(new Set());load();}else toast(r.data.error,'error');};
  const delSel=async()=>{if(!sel.size||!window.confirm(`Delete ${sel.size} items?`))return;const r=await axios.post('/api/trash/delete-selected',{file_ids:[...sel]});if(r.data.success){toast(`Deleted ${sel.size}`,'success');setSel(new Set());load();}else toast(r.data.error,'error');};
  const toggleSel=id=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  return(
    <div className="scene">
      <Scene3D color="#7c3aed" density={40} speed={.28}/>
      <div className="scene-content"><div className="page-wrap">
        <div className="page-header">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem'}}>
            <div>
              <h1 className="page-title"><i className="fas fa-trash-alt" style={{color:'var(--red)'}}/>Trash</h1>
              <p className="page-subtitle">{files.length} item{files.length!==1?'s':''} — auto-deleted after 30 days</p>
            </div>
            <div style={{display:'flex',gap:'.625rem',flexWrap:'wrap'}}>
              {sel.size>0&&<>
                <button className="btn btn-success btn-sm" onClick={restoreSel}><i className="fas fa-trash-restore"/>Restore ({sel.size})</button>
                <button className="btn btn-danger btn-sm" onClick={delSel}><i className="fas fa-times"/>Delete ({sel.size})</button>
              </>}
              {files.length>0&&<button className="btn btn-danger btn-sm" onClick={()=>setEmptyModal(true)}><i className="fas fa-trash"/>Empty Trash</button>}
            </div>
          </div>
        </div>

        <div className="alert alert-amber" style={{marginBottom:'1.125rem'}}>
          <i className="fas fa-info-circle"/>
          <span>Files in trash will be permanently deleted after 30 days. Restore any file before it expires.</span>
        </div>

        <div className="card-glass">
          {loading?<div className="loading-center"><div className="spin"/></div>:
           files.length===0?<div className="empty"><i className="fas fa-trash-alt empty-icon"/><h3>Trash is empty</h3><p>Deleted files appear here</p></div>:(
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr>
                <th style={{width:36}}><input type="checkbox" checked={files.length>0&&sel.size===files.length} onChange={e=>{if(e.target.checked)setSel(new Set(files.map(f=>f.id)));else setSel(new Set());}}/></th>
                <th>Name</th><th className="hide-phone">Type</th><th className="hide-phone">Size</th><th className="hide-tablet">Deleted</th><th style={{textAlign:'right'}}>Actions</th>
              </tr></thead>
              <tbody>{files.map(f=>(
                <tr key={f.id}>
                  <td><input type="checkbox" checked={sel.has(f.id)} onChange={()=>toggleSel(f.id)}/></td>
                  <td><div style={{display:'flex',alignItems:'center',gap:'.625rem',opacity:.8}}><FileIcon type={f.file_type} isFolder={f.is_folder} size={14}/><span className="truncate" style={{maxWidth:'clamp(120px,30vw,260px)'}}>{f.original_name}</span></div></td>
                  <td className="hide-phone"><span className="badge badge-gray" style={{textTransform:'capitalize'}}>{f.is_folder?'Folder':f.file_type}</span></td>
                  <td className="hide-phone" style={{color:'var(--text2)',fontSize:'.8125rem'}}>{f.is_folder?'—':f.size_fmt}</td>
                  <td className="hide-tablet" style={{color:'var(--text2)',fontSize:'.8125rem'}}>{new Date(f.updated_at||f.created_at).toLocaleDateString()}</td>
                  <td><div style={{display:'flex',gap:'.125rem',justifyContent:'flex-end'}}>
                    <button className="btn-icon" title="Restore" onClick={()=>restore(f.id)} style={{color:'var(--g600)'}}><i className="fas fa-trash-restore" style={{fontSize:12}}/></button>
                    <button className="btn-icon danger" title="Delete permanently" onClick={()=>delPerm(f.id)}><i className="fas fa-times-circle" style={{fontSize:12}}/></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div></div>

      {emptyModal&&<div className="modal-bg" onClick={()=>setEmptyModal(false)}><div className="modal-box" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h3 style={{color:'var(--red)'}}><i className="fas fa-exclamation-triangle" style={{marginRight:'.5rem'}}/>Empty Trash</h3><button className="btn-icon" onClick={()=>setEmptyModal(false)}><i className="fas fa-times"/></button></div>
        <div className="modal-body"><div className="alert alert-error"><i className="fas fa-exclamation-circle"/><span><strong>Cannot be undone.</strong> All {files.length} item{files.length!==1?'s':''} will be permanently deleted.</span></div></div>
        <div className="modal-foot"><button className="btn btn-secondary" onClick={()=>setEmptyModal(false)}>Cancel</button><button className="btn btn-danger" onClick={empty}><i className="fas fa-trash"/>Empty Trash</button></div>
      </div></div>}
    </div>
  );
}