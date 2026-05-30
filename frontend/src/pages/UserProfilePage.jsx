import React,{useEffect,useState} from 'react';
import axios from 'axios';
import Scene3D from '../components/Scene3D';
import {useAuth} from '../context/AuthContext';
import {useToast} from '../components/Toast';

const TABS=[['fa-user','Profile'],['fa-lock','Security'],['fa-cog','Settings'],['fa-desktop','Sessions']];

export default function UserProfilePage(){
  const{user,setUser}=useAuth();const toast=useToast();
  const[tab,setTab]=useState(0);
  const[data,setData]=useState(null);
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[profile,setProfile]=useState({full_name:'',username:'',bio:''});
  const[pw,setPw]=useState({current_password:'',new_password:'',confirm_password:''});
  const[settings,setSettings]=useState({theme:'auto',language:'en',timezone:'UTC',email_notifications:true,push_notifications:true});

  useEffect(()=>{
    axios.get('/api/profile').then(r=>{if(r.data.success){setData(r.data);const u=r.data.user||{};setProfile({full_name:u.full_name||'',username:u.username||'',bio:u.bio||''});const s=r.data.settings||{};setSettings({theme:s.theme||'auto',language:s.language||'en',timezone:s.timezone||'UTC',email_notifications:!!s.email_notifications,push_notifications:!!s.push_notifications});}}).finally(()=>setLoading(false));
  },[]);

  const saveProfile=async()=>{setSaving(true);const r=await axios.post('/api/profile/update',profile);if(r.data.success){toast('Profile updated','success');if(setUser)setUser(u=>({...u,...profile}));}else toast(r.data.error,'error');setSaving(false);};
  const changePw=async()=>{setSaving(true);const r=await axios.post('/api/profile/change-password',pw);if(r.data.success){toast('Password changed','success');setPw({current_password:'',new_password:'',confirm_password:''});}else toast(r.data.error,'error');setSaving(false);};
  const saveSettings=async()=>{setSaving(true);const r=await axios.post('/api/profile/settings',settings);if(r.data.success)toast('Settings saved','success');else toast(r.data.error,'error');setSaving(false);};
  const stats=data?.stats||{};

  return(
    <div className="scene">
      <Scene3D color="#e8922a" density={40} speed={.3} lines={false}/>
      <div className="scene-content"><div className="page-wrap">
        {/* Hero banner */}
        <div style={{background:'linear-gradient(135deg,var(--g700),var(--g900))',borderRadius:20,padding:'clamp(1.25rem,3vw,2rem)',marginBottom:'clamp(.875rem,2vw,1.5rem)',display:'flex',alignItems:'center',gap:'clamp(.875rem,3vw,1.5rem)',flexWrap:'wrap',boxShadow:'var(--sh-xl)'}}>
          <div style={{width:'clamp(56px,8vw,72px)',height:'clamp(56px,8vw,72px)',background:'rgba(255,255,255,.15)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'clamp(1.25rem,3vw,1.75rem)',fontFamily:'Syne,sans-serif',fontWeight:700,color:'#fff',flexShrink:0,border:'2px solid rgba(255,255,255,.2)'}}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h1 style={{fontSize:'clamp(1.125rem,3vw,1.5rem)',fontFamily:'Syne,sans-serif',color:'#fff',fontWeight:800,marginBottom:'.2rem',letterSpacing:'-.02em'}}>{user?.username}</h1>
            <p style={{color:'rgba(255,255,255,.65)',fontSize:'.875rem'}}>{data?.user?.email}</p>
          </div>
          <div style={{display:'flex',gap:'clamp(.875rem,3vw,2rem)',flexWrap:'wrap'}}>
            {[{v:stats.total_files||0,l:'Files'},{v:stats.total_folders||0,l:'Folders'},{v:stats.total_storage_fmt||'0 B',l:'Used'}].map(s=>(
              <div key={s.l} style={{textAlign:'center'}}>
                <div style={{fontSize:'clamp(1rem,3vw,1.25rem)',fontWeight:800,fontFamily:'Syne,sans-serif',color:'#fff'}}>{s.v}</div>
                <div style={{fontSize:'.72rem',opacity:.6,marginTop:'.125rem'}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-layout">
          {/* Sidebar */}
          <div className="card-glass profile-sidebar" style={{padding:'.625rem'}}>
            {TABS.map(([icon,label],i)=>(
              <button key={label} onClick={()=>setTab(i)} style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.75rem .875rem',borderRadius:'var(--r)',border:'none',cursor:'pointer',textAlign:'left',fontSize:'.875rem',fontWeight:600,background:tab===i?'var(--g50)':'transparent',color:tab===i?'var(--g700)':'var(--text2)',marginBottom:'.25rem',transition:'all .15s',width:'100%'}}>
                <i className={`fas ${icon}`} style={{width:16,textAlign:'center',color:tab===i?'var(--g500)':'var(--text3)',fontSize:13}}/>
                <span className="hide-tablet">{label}</span>
                {tab===i&&<i className="fas fa-chevron-right hide-tablet" style={{marginLeft:'auto',fontSize:9,color:'var(--g400)'}}/>}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading?<div className="loading-center card-glass" style={{padding:'3rem'}}><div className="spin"/></div>:(
            <div className="card-glass" style={{padding:'clamp(1.25rem,3vw,2rem)'}}>
              {tab===0&&(
                <div>
                  <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--g700)',marginBottom:'1.375rem',paddingBottom:'.75rem',borderBottom:'1px solid var(--border)',fontFamily:'Syne,sans-serif'}}>Profile Information</h3>
                  <div style={{display:'flex',flexDirection:'column',gap:'1rem',maxWidth:460}}>
                    <div className="input-group"><label className="input-label">Username</label><input className="input" value={profile.username} onChange={e=>setProfile(p=>({...p,username:e.target.value}))}/></div>
                    <div className="input-group"><label className="input-label">Full Name</label><input className="input" value={profile.full_name} onChange={e=>setProfile(p=>({...p,full_name:e.target.value}))} placeholder="Your full name"/></div>
                    <div className="input-group"><label className="input-label">Bio</label><textarea className="input" value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} placeholder="Tell us about yourself" rows={3}/></div>
                    <div className="input-group"><label className="input-label">Email</label><input className="input" value={data?.user?.email||''} disabled/><span className="input-hint">Email cannot be changed</span></div>
                    <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={saveProfile} disabled={saving}>{saving?<><span className="spin spin-sm"/>Saving...</>:<><i className="fas fa-save"/>Save Changes</>}</button>
                  </div>
                </div>
              )}
              {tab===1&&(
                <div>
                  <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--g700)',marginBottom:'1.375rem',paddingBottom:'.75rem',borderBottom:'1px solid var(--border)',fontFamily:'Syne,sans-serif'}}>Change Password</h3>
                  <div style={{display:'flex',flexDirection:'column',gap:'1rem',maxWidth:380}}>
                    <div className="input-group"><label className="input-label">Current Password</label><input type="password" className="input" value={pw.current_password} onChange={e=>setPw(p=>({...p,current_password:e.target.value}))}/></div>
                    <div className="input-group"><label className="input-label">New Password</label><input type="password" className="input" value={pw.new_password} onChange={e=>setPw(p=>({...p,new_password:e.target.value}))} placeholder="Min. 8 characters"/></div>
                    <div className="input-group"><label className="input-label">Confirm Password</label><input type="password" className="input" value={pw.confirm_password} onChange={e=>setPw(p=>({...p,confirm_password:e.target.value}))}/></div>
                    <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={changePw} disabled={saving}>{saving?<><span className="spin spin-sm"/>Updating...</>:<><i className="fas fa-key"/>Update Password</>}</button>
                  </div>
                </div>
              )}
              {tab===2&&(
                <div>
                  <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--g700)',marginBottom:'1.375rem',paddingBottom:'.75rem',borderBottom:'1px solid var(--border)',fontFamily:'Syne,sans-serif'}}>Preferences</h3>
                  <div style={{display:'flex',flexDirection:'column',gap:'1rem',maxWidth:460}}>
                    <div className="input-group"><label className="input-label">Theme</label><select className="input" value={settings.theme} onChange={e=>setSettings(s=>({...s,theme:e.target.value}))}><option value="auto">System Default</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
                    <div className="grid-2" style={{gap:'.875rem'}}>
                      <div className="input-group"><label className="input-label">Language</label><select className="input" value={settings.language} onChange={e=>setSettings(s=>({...s,language:e.target.value}))}><option value="en">English</option><option value="ar">Arabic</option></select></div>
                      <div className="input-group"><label className="input-label">Timezone</label><select className="input" value={settings.timezone} onChange={e=>setSettings(s=>({...s,timezone:e.target.value}))}>{['UTC','America/New_York','Europe/London','Asia/Dubai','Asia/Kolkata'].map(tz=><option key={tz} value={tz}>{tz}</option>)}</select></div>
                    </div>
                    {[['email_notifications','Email Notifications'],['push_notifications','Push Notifications']].map(([k,l])=>(
                      <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.875rem 1rem',background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)'}}>
                        <span style={{fontSize:'.875rem',fontWeight:500}}>{l}</span>
                        <label style={{position:'relative',display:'inline-block',width:42,height:22,cursor:'pointer'}}>
                          <input type="checkbox" checked={settings[k]} onChange={e=>setSettings(s=>({...s,[k]:e.target.checked}))} style={{opacity:0,width:0,height:0}}/>
                          <span style={{position:'absolute',inset:0,background:settings[k]?'var(--g500)':'var(--border2)',borderRadius:22,transition:'.2s'}}>
                            <span style={{position:'absolute',left:settings[k]?21:2,top:2,width:18,height:18,background:'#fff',borderRadius:'50%',transition:'.2s',boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}/>
                          </span>
                        </label>
                      </div>
                    ))}
                    <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={saveSettings} disabled={saving}>{saving?<><span className="spin spin-sm"/>Saving...</>:<><i className="fas fa-save"/>Save Settings</>}</button>
                  </div>
                </div>
              )}
              {tab===3&&(
                <div>
                  <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--g700)',marginBottom:'1.375rem',paddingBottom:'.75rem',borderBottom:'1px solid var(--border)',fontFamily:'Syne,sans-serif'}}>Active Sessions</h3>
                  {(data?.sessions||[]).map(s=>(
                    <div key={s.id} style={{padding:'1rem',background:s.is_current?'var(--g50)':'var(--bg)',borderRadius:12,display:'flex',alignItems:'center',gap:'1rem',marginBottom:'.75rem',border:s.is_current?'1.5px solid var(--g200)':'1px solid var(--border)',flexWrap:'wrap'}}>
                      <div style={{width:40,height:40,background:s.is_current?'var(--g100)':'var(--border)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><i className="fas fa-desktop" style={{color:s.is_current?'var(--g600)':'var(--text3)'}}/></div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:'.875rem'}}>{s.browser_name||'Browser'}</div>
                        <div style={{fontSize:'.75rem',color:'var(--text2)',marginTop:'.125rem'}}>{s.ip_address}</div>
                      </div>
                      {s.is_current&&<span className="badge badge-green">Current</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div></div>
    </div>
  );
}