import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import FileIcon from '../components/FileIcon';
import Scene3D from '../components/Scene3D';
import axios from 'axios';

const TC={document:'var(--blue)',image:'#7c3aed',video:'var(--red)',audio:'var(--amber)',archive:'#ea580c',other:'var(--text3)'};

export default function DashboardPage(){
  const{user}=useAuth();
  const[stats,setStats]=useState(null);
  const[recent,setRecent]=useState([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{axios.get('/api/stats').then(r=>{if(r.data.success){setStats(r.data.stats);setRecent(r.data.recent_files||[]);}}).finally(()=>setLoading(false));},[]);
  const by=stats?.storage_by_type||{};

  return(
    <div className="scene">
      <Scene3D color="#3d8a78" density={60} speed={.35}/>
      <div className="scene-content">
        <div className="page-wrap">
          <div style={{background:'linear-gradient(135deg,var(--g700),var(--g800))',borderRadius:20,padding:'clamp(1.25rem,3vw,1.75rem) clamp(1rem,3vw,1.75rem)',marginBottom:'clamp(.875rem,2vw,1.5rem)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem',boxShadow:'var(--sh-lg)'}}>
            <div>
              <h1 style={{fontSize:'clamp(1.25rem,3vw,1.625rem)',fontFamily:'Syne,sans-serif',color:'#fff',fontWeight:800,letterSpacing:'-.025em',marginBottom:'.25rem'}}>
                Welcome back, <span style={{color:'var(--g300)'}}>{user?.username}</span>! 👋
              </h1>
              <p style={{color:'rgba(255,255,255,.65)',fontSize:'.875rem'}}>Here's your storage overview for today.</p>
            </div>
            <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
              <Link to="/files" className="btn btn-sm" style={{background:'rgba(255,255,255,.15)',color:'#fff',border:'1px solid rgba(255,255,255,.2)',backdropFilter:'blur(8px)'}}><i className="fas fa-upload"/>Upload Files</Link>
              <Link to="/files" className="btn btn-sm" style={{background:'var(--gold)',color:'var(--g900)',fontWeight:700}}><i className="fas fa-folder-plus"/>New Folder</Link>
            </div>
          </div>

          {loading?<div className="loading-center"><div className="spin"/></div>:(
          <>
            <div className="grid-4" style={{marginBottom:'clamp(.875rem,2vw,1.25rem)'}}>
              {[
                {i:'fa-database',bg:'var(--g50)',ic:'var(--g600)',t:'Total Storage',v:stats?.total_storage||'0 B',b:'Unlimited',bc:'var(--g600)'},
                {i:'fa-file-alt',bg:'#fffbeb',  ic:'var(--amber)', t:'Total Files',  v:stats?.total_files||0,     b:'All types',bc:'var(--amber)'},
                {i:'fa-share-alt',bg:'var(--blue-bg)',ic:'var(--blue)',t:'Shared Links',v:stats?.shared_links||0,  b:`${stats?.shared_links||0} active`,bc:'var(--blue)'},
                {i:'fa-clock',   bg:'#f5f3ff',  ic:'#7c3aed',      t:'Operations',   v:stats?.recent_activity||0, b:'Last 24h',bc:'#7c3aed'},
              ].map(s=>(
                <div key={s.t} className="card-glass card-hover" style={{padding:'clamp(1rem,2.5vw,1.5rem)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.875rem'}}>
                    <div className="stat-icon" style={{background:s.bg,width:44,height:44,borderRadius:12,fontSize:'1.125rem'}}>
                      <i className={`fas ${s.i}`} style={{color:s.ic}}/>
                    </div>
                    <span className="badge" style={{background:s.bc+'18',color:s.bc,border:'none'}}>{s.b}</span>
                  </div>
                  <div className="stat-value" style={{fontSize:'clamp(1.375rem,3vw,1.75rem)'}}>{s.v}</div>
                  <div className="stat-label">{s.t}</div>
                </div>
              ))}
            </div>

            <div className="grid-2" style={{marginBottom:'clamp(.875rem,2vw,1.25rem)'}}>
              <div className="card-glass" style={{padding:'clamp(1rem,3vw,1.5rem)'}}>
                <h3 style={{fontSize:'.9375rem',fontWeight:700,color:'var(--g700)',marginBottom:'1.125rem',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <i className="fas fa-chart-pie" style={{color:'var(--g500)'}}/>Storage Breakdown
                </h3>
                {!Object.keys(by).length?<p style={{color:'var(--text2)',fontSize:'.875rem'}}>No files yet — upload something!</p>:
                  Object.entries(by).map(([t,d])=>(
                    <div key={t} style={{marginBottom:'.875rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.375rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                          <FileIcon type={t} size={13}/><span style={{fontSize:'.8125rem',textTransform:'capitalize',fontWeight:500}}>{t}</span>
                        </div>
                        <span style={{fontSize:'.75rem',color:'var(--text2)'}}>{d.size} ({d.percentage}%)</span>
                      </div>
                      <div className="progress" style={{height:6}}><div className="progress-fill" style={{width:`${d.percentage}%`,background:TC[t]||'var(--text3)'}}/></div>
                    </div>
                  ))
                }
              </div>

              <div className="card-glass" style={{padding:'clamp(1rem,3vw,1.5rem)'}}>
                <h3 style={{fontSize:'.9375rem',fontWeight:700,color:'var(--g700)',marginBottom:'1.125rem',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <i className="fas fa-bolt" style={{color:'var(--gold)'}}/>Quick Actions
                </h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'.75rem'}}>
                  {[
                    {i:'fa-upload',l:'Upload',to:'/files',c:'var(--g600)',bg:'var(--g50)'},
                    {i:'fa-folder-plus',l:'New Folder',to:'/files',c:'var(--amber)',bg:'#fffbeb'},
                    {i:'fa-share-alt',l:'Share',to:'/sharing',c:'var(--blue)',bg:'var(--blue-bg)'},
                    {i:'fa-trash-alt',l:'Trash',to:'/trash',c:'#7c3aed',bg:'#f5f3ff'},
                  ].map(a=>(
                    <Link key={a.l} to={a.to} style={{textDecoration:'none'}}>
                      <div style={{background:a.bg,borderRadius:12,padding:'clamp(.875rem,2vw,1.125rem)',textAlign:'center',transition:'transform .2s,box-shadow .2s',border:`1px solid ${a.c}1a`}}
                        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='var(--sh)';}}
                        onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
                        <i className={`fas ${a.i}`} style={{fontSize:22,color:a.c,display:'block',marginBottom:'.5rem'}}/>
                        <span style={{fontSize:'.8125rem',fontWeight:600,color:'var(--text)'}}>{a.l}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-glass">
              <div style={{padding:'1.125rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.75rem'}}>
                <h3 style={{fontSize:'.9375rem',fontWeight:700,color:'var(--g700)',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <i className="fas fa-history" style={{color:'var(--text3)'}}/>Recent Files
                </h3>
                <Link to="/files" className="btn btn-secondary btn-sm">View All</Link>
              </div>
              {!recent.length?<div className="empty"><i className="fas fa-folder-open empty-icon"/><h3>No files yet</h3><p>Upload your first file to get started</p><Link to="/files" className="btn btn-primary" style={{marginTop:'1rem'}}><i className="fas fa-upload"/>Upload Files</Link></div>:(
                <div className="tbl-wrap"><table className="tbl">
                  <thead><tr><th>Name</th><th>Type</th><th>Size</th><th className="hide-phone">Uploaded</th></tr></thead>
                  <tbody>{recent.map(f=>(
                    <tr key={f.id}>
                      <td><div style={{display:'flex',alignItems:'center',gap:'.625rem'}}><FileIcon type={f.file_type} size={14}/><span className="truncate" style={{maxWidth:'clamp(140px,25vw,260px)'}}>{f.original_name}</span></div></td>
                      <td><span className="badge badge-gray" style={{textTransform:'capitalize'}}>{f.file_type}</span></td>
                      <td style={{color:'var(--text2)',fontSize:'.8125rem',whiteSpace:'nowrap'}}>{f.size_fmt}</td>
                      <td className="hide-phone" style={{color:'var(--text2)',fontSize:'.8125rem'}}>{new Date(f.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}