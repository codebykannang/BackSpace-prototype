import React,{useEffect,useState} from 'react';
import {useParams,Link} from 'react-router-dom';
import axios from 'axios';
import Scene3D from '../components/Scene3D';
import FileIcon from '../components/FileIcon';

export default function SharePage(){
  const{token}=useParams();
  const[file,setFile]=useState(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[downloading,setDownloading]=useState(false);

  useEffect(()=>{
    axios.get(`/api/share/${token}`)
      .then(r=>{if(r.data.success)setFile(r.data.file);else setError(r.data.error||'Link not found');})
      .catch(()=>setError('Network error'))
      .finally(()=>setLoading(false));
  },[token]);

  /**
   * Download the shared file via a hidden <a> click.
   *
   * Why not axios.get(blob)?
   *   – axios loads the ENTIRE response into browser RAM before saving.
   *     A 2 GB file would crash the tab.
   *
   * Why not a plain <a href> without JS?
   *   – It works, but gives no loading feedback to the user.
   *
   * This approach:
   *   1. Shows a spinner on the button while the browser starts the download.
   *   2. Uses a hidden <a> click so the browser streams to disk natively —
   *      any file size works, zero extra RAM usage.
   *   3. The endpoint (/api/share/TOKEN/download) requires no session cookie,
   *      so same-origin cookies are not needed.
   */
  const handleDownload=()=>{
    setDownloading(true);
    const a=document.createElement('a');
    a.href=`/api/share/${token}/download`;
    a.setAttribute('download','');   // tells browser: save, don't navigate
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Give a short delay so the browser registers the download before re-enabling
    setTimeout(()=>setDownloading(false),3000);
  };

  return(
    <div className="scene">
      <Scene3D color="#3d8a78" density={35} speed={.25}/>
      <div className="scene-content" style={{minHeight:'calc(100vh - 68px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,1.5rem)'}}>
        <div style={{width:'100%',maxWidth:480}}>
          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:'1.75rem'}}>
            <img src="/assets/logo_icon.png" alt="BackSpace" style={{width:64,height:64,margin:'0 auto .875rem',borderRadius:16,boxShadow:'var(--sh-lg)'}}/>
            <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,color:'var(--g700)',fontSize:'1.5rem',letterSpacing:'-.025em'}}>BackSpace</h1>
            <p style={{color:'var(--text2)',fontSize:'.875rem',marginTop:'.25rem'}}>Secure Cloud Storage</p>
          </div>

          <div className="card-glass" style={{padding:'clamp(1.5rem,4vw,2.5rem)'}}>
            {loading?(
              <div className="loading-center"><div className="spin"/></div>
            ):error?(
              <div style={{textAlign:'center'}}>
                <i className="fas fa-link-slash" style={{fontSize:48,color:'var(--red)',marginBottom:'1rem',display:'block'}}/>
                <h2 style={{fontSize:'1.25rem',marginBottom:'.5rem'}}>Link Unavailable</h2>
                <p style={{color:'var(--text2)',fontSize:'.9rem',marginBottom:'1.5rem'}}>{error}</p>
                <Link to="/" className="btn btn-primary"><i className="fas fa-home"/>Go to BackSpace</Link>
              </div>
            ):(
              <div>
                {/* File info */}
                <div style={{textAlign:'center',marginBottom:'1.75rem'}}>
                  <div style={{width:76,height:76,background:'var(--g50)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto .875rem',border:'1px solid var(--g100)'}}>
                    <FileIcon type={file.type} size={36}/>
                  </div>
                  <h2 style={{fontSize:'1.125rem',fontWeight:700,marginBottom:'.5rem',wordBreak:'break-word',fontFamily:'Syne,sans-serif'}}>{file.name}</h2>
                  <div style={{display:'flex',gap:'.5rem',justifyContent:'center',flexWrap:'wrap'}}>
                    <span className="badge badge-gray" style={{textTransform:'capitalize'}}>{file.type}</span>
                    <span className="badge badge-green"><i className="fas fa-database" style={{fontSize:9}}/>{file.size}</span>
                  </div>
                </div>

                {/* Trust badge */}
                <div style={{background:'var(--g50)',border:'1px solid var(--g100)',borderRadius:12,padding:'1rem',marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
                  <i className="fas fa-shield-alt" style={{color:'var(--g600)',fontSize:18,flexShrink:0}}/>
                  <div>
                    <p style={{fontSize:'.8rem',fontWeight:600,color:'var(--g700)'}}>Shared via BackSpace</p>
                    <p style={{fontSize:'.75rem',color:'var(--text2)'}}>Securely stored and transmitted</p>
                  </div>
                </div>

                {/* Download button */}
                {file.allow_download?(
                  <button
                    className="btn btn-primary btn-block btn-lg"
                    style={{justifyContent:'center',width:'100%'}}
                    disabled={downloading}
                    onClick={handleDownload}
                  >
                    {downloading
                      ? <><div className="spin spin-sm" style={{marginRight:'.5rem',borderTopColor:'#fff'}}/>Starting download…</>
                      : <><i className="fas fa-download"/>Download File</>
                    }
                  </button>
                ):(
                  <div className="alert alert-amber"><i className="fas fa-ban"/><span>Download disabled for this link</span></div>
                )}

                <div style={{marginTop:'1.25rem',textAlign:'center'}}>
                  <Link to="/" style={{fontSize:'.8125rem',color:'var(--text3)',display:'inline-flex',alignItems:'center',gap:'.375rem'}}>
                    <img src="/assets/logo_icon.png" alt="" style={{width:14,height:14,borderRadius:3}}/>
                    Get free unlimited storage at BackSpace
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
