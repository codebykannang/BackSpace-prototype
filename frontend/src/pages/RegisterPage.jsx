import React,{useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {useToast} from '../components/Toast';
import Scene3D from '../components/Scene3D';

function strength(pw){let s=0;if(pw.length>=8)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;return s;}
const SC=['','#e84343','#e8922a','#3b82f6','#2d6b5c'];
const SL=['','Weak','Fair','Good','Strong'];

export default function RegisterPage(){
  const[form,setF]=useState({email:'',password:'',confirm_password:''});
  const[showPw,setShowPw]=useState(false);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const{register}=useAuth();const nav=useNavigate();const toast=useToast();
  const str=strength(form.password);

  const submit=async e=>{
    e.preventDefault();
    if(form.password!==form.confirm_password){setError('Passwords do not match');return;}
    setLoading(true);setError('');
    const r=await register(form.email,form.password,form.confirm_password).catch(()=>({success:false,error:'Network error'}));
    if(r.success){toast('Account created! Welcome!','success');nav('/dashboard');}
    else setError(r.error||'Registration failed');
    setLoading(false);
  };

  return(
    <div className="scene">
      <Scene3D color="#e8b84b" density={45} speed={.32}/>
      <div className="scene-content" style={{minHeight:'calc(100vh - 68px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,1.5rem)'}}>
        <div style={{width:'100%',maxWidth:920,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,380px),1fr))',gap:'clamp(1.25rem,3vw,2rem)',alignItems:'start'}}>

          <div className="card-glass" style={{padding:'clamp(1.5rem,4vw,2.5rem)'}}>
            <div style={{marginBottom:'1.75rem'}}>
              <img src="/assets/logo_icon.png" alt="BackSpace" style={{width:54,height:54,borderRadius:14,marginBottom:'1rem'}}/>
              <h1 style={{fontSize:'clamp(1.5rem,4vw,2rem)',color:'var(--g800)',fontFamily:'Syne,sans-serif',letterSpacing:'-.025em',marginBottom:'.375rem'}}>Create Account</h1>
              <p style={{color:'var(--text2)',fontSize:'.9rem'}}>Join BackSpace — free unlimited cloud storage</p>
            </div>
            {error&&<div className="alert alert-error" style={{marginBottom:'1.25rem'}}><i className="fas fa-exclamation-circle"/><span>{error}</span></div>}
            <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:'1.125rem'}}>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div className="input-iw"><i className="fas fa-envelope ii"/>
                  <input type="email" className="input" placeholder="you@example.com" required value={form.email} onChange={e=>setF(f=>({...f,email:e.target.value}))}/>
                </div>
                <span className="input-hint">Username auto-generated from your email</span>
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-iw"><i className="fas fa-lock ii"/>
                  <input type={showPw?'text':'password'} className="input" style={{paddingRight:'2.75rem'}} placeholder="Min. 8 characters" required minLength={8} value={form.password} onChange={e=>setF(f=>({...f,password:e.target.value}))}/>
                  <button type="button" className="ie" onClick={()=>setShowPw(v=>!v)}><i className={`fas ${showPw?'fa-eye-slash':'fa-eye'}`}/></button>
                </div>
                {form.password&&<>
                  <div className="progress" style={{height:5,marginTop:'.375rem'}}><div className="progress-fill" style={{width:`${str*25}%`,background:SC[str]}}/></div>
                  <span style={{fontSize:'.72rem',color:SC[str],fontWeight:600}}>{SL[str]}</span>
                </>}
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <div className="input-iw"><i className="fas fa-lock ii"/>
                  <input type="password" className="input" style={{paddingRight:'2.75rem'}} placeholder="Repeat password" required value={form.confirm_password} onChange={e=>setF(f=>({...f,confirm_password:e.target.value}))}/>
                  {form.confirm_password&&<i className={`fas ${form.password===form.confirm_password?'fa-check-circle':'fa-times-circle'} ie`} style={{pointerEvents:'none',color:form.password===form.confirm_password?'var(--g500)':'var(--red)'}}/>}
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{justifyContent:'center',marginTop:'.25rem'}}>
                {loading?<><span className="spin spin-sm"/>Creating account...</>:<><i className="fas fa-user-plus"/>Create Account</>}
              </button>
            </form>
            <div style={{marginTop:'1.25rem',textAlign:'center',fontSize:'.875rem',color:'var(--text2)'}}>
              Already have an account?{' '}<Link to="/login" style={{color:'var(--g600)',fontWeight:700}}>Sign in</Link>
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div style={{background:'linear-gradient(135deg,var(--g700),var(--g900))',borderRadius:16,padding:'clamp(1.25rem,3vw,2rem)',color:'#fff'}}>
              <h3 style={{fontSize:'1.125rem',marginBottom:'1rem',fontFamily:'Syne,sans-serif'}}>What You Get</h3>
              {[['fa-infinity','var(--g300)','Unlimited storage — no caps'],['fa-bolt','var(--gold)','Upload files up to 5 GB each'],['fa-share-alt','#93c5fd','Shareable links instantly'],['fa-folder','var(--gold)','Nested folder organisation'],['fa-trash-restore','var(--g300)','Trash with full restore'],['fa-shield-alt','#93c5fd','bcrypt security & sessions']].map(([i,c,t])=>(
                <div key={t} style={{display:'flex',alignItems:'center',gap:'.625rem',marginBottom:'.625rem',fontSize:'.875rem'}}>
                  <div style={{width:26,height:26,background:'rgba(255,255,255,.12)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={`fas ${i}`} style={{color:c,fontSize:11}}/>
                  </div>
                  <span style={{opacity:.9}}>{t}</span>
                </div>
              ))}
            </div>
            <div className="card-glass" style={{padding:'1.25rem'}}>
              <h4 style={{fontSize:'.9rem',color:'var(--g700)',marginBottom:'.75rem',fontFamily:'Syne,sans-serif'}}>Storage Facts</h4>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'.75rem'}}>
                {[['50GB+','Per user'],['Free','Forever'],['5GB','Max file'],['100%','Uptime goal']].map(([n,l])=>(
                  <div key={l} style={{background:'var(--bg)',borderRadius:10,padding:'.875rem',textAlign:'center'}}>
                    <div style={{fontSize:'1.25rem',fontWeight:800,color:'var(--g600)',fontFamily:'Syne,sans-serif'}}>{n}</div>
                    <div style={{fontSize:'.75rem',color:'var(--text2)',marginTop:'.2rem'}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}