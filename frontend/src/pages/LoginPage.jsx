import React,{useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {useToast} from '../components/Toast';
import Scene3D from '../components/Scene3D';

export default function LoginPage(){
  const[form,setF]=useState({email:'',password:''});
  const[showPw,setShowPw]=useState(false);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const{login}=useAuth(); const nav=useNavigate(); const toast=useToast();

  const submit=async e=>{
    e.preventDefault();setLoading(true);setError('');
    const r=await login(form.email,form.password).catch(()=>({success:false,error:'Network error'}));
    if(r.success){toast('Welcome back!','success');nav('/dashboard');}
    else setError(r.error||'Login failed');
    setLoading(false);
  };

  return(
    <div className="scene">
      <Scene3D color="#3d8a78" density={55} speed={.38}/>
      <div className="scene-content" style={{minHeight:'calc(100vh - 68px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,1.5rem)'}}>
        <div style={{width:'100%',maxWidth:920,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,380px),1fr))',gap:'clamp(1.25rem,3vw,2rem)',alignItems:'start'}}>

          {/* Login card */}
          <div className="card-glass" style={{padding:'clamp(1.5rem,4vw,2.5rem)'}}>
            <div style={{marginBottom:'1.75rem'}}>
              <img src="/assets/logo_icon.png" alt="BackSpace" style={{width:54,height:54,borderRadius:14,marginBottom:'1rem'}}/>
              <h1 style={{fontSize:'clamp(1.5rem,4vw,2rem)',color:'var(--g800)',fontFamily:'Syne,sans-serif',letterSpacing:'-.025em',marginBottom:'.375rem'}}>Welcome Back</h1>
              <p style={{color:'var(--text2)',fontSize:'.9rem'}}>Sign in to your unlimited cloud storage</p>
            </div>

            {error&&<div className="alert alert-error" style={{marginBottom:'1.25rem'}}><i className="fas fa-exclamation-circle"/><span>{error}</span></div>}

            <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:'1.125rem'}}>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div className="input-iw">
                  <i className="fas fa-envelope ii"/>
                  <input type="email" className="input" placeholder="you@example.com" required value={form.email} onChange={e=>setF(f=>({...f,email:e.target.value}))}/>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-iw">
                  <i className="fas fa-lock ii"/>
                  <input type={showPw?'text':'password'} className="input" placeholder="Your password" required value={form.password} onChange={e=>setF(f=>({...f,password:e.target.value}))} style={{paddingRight:'2.75rem'}}/>
                  <button type="button" className="ie" onClick={()=>setShowPw(v=>!v)}><i className={`fas ${showPw?'fa-eye-slash':'fa-eye'}`}/></button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{marginTop:'.25rem',justifyContent:'center'}}>
                {loading?<><span className="spin spin-sm"/>Signing in...</>:<><i className="fas fa-sign-in-alt"/>Sign In</>}
              </button>
            </form>

            <div style={{marginTop:'1.25rem',textAlign:'center',fontSize:'.875rem',color:'var(--text2)'}}>
              No account?{' '}<Link to="/register" style={{color:'var(--g600)',fontWeight:700}}>Create one free</Link>
            </div>
            <div style={{marginTop:'.625rem',textAlign:'center'}}>
              <Link to="/" style={{fontSize:'.8125rem',color:'var(--text3)',display:'inline-flex',alignItems:'center',gap:'.3rem'}}>
                <i className="fas fa-arrow-left" style={{fontSize:10}}/>Back to Home
              </Link>
            </div>
          </div>

          {/* Info panel */}
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div className="card-glass" style={{padding:'clamp(1.25rem,3vw,1.75rem)'}}>
              <h2 style={{fontSize:'1.125rem',color:'var(--g700)',marginBottom:'.75rem',fontFamily:'Syne,sans-serif'}}>Secure Access</h2>
              <p style={{color:'var(--text2)',fontSize:'.875rem',lineHeight:1.7,marginBottom:'1.25rem'}}>Your security is our top priority. Multiple layers protect your data.</p>
              {[
                {i:'fa-clock',    t:'Session Timeout',  d:'Sessions expire automatically. Stay logged in 30 days with Remember Me.'},
                {i:'fa-shield-alt',t:'Data Protection', d:'Passwords hashed with bcrypt. Secure server-side sessions.'},
                {i:'fa-headset',  t:'Need Help?',        d:'Contact: theprozenix@gmail.com'},
              ].map(s=>(
                <div key={s.t} style={{display:'flex',gap:'.75rem',marginBottom:'1rem'}}>
                  <div style={{width:40,height:40,background:'linear-gradient(135deg,var(--g600),var(--g700))',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={`fas ${s.i}`} style={{color:'#fff',fontSize:14}}/>
                  </div>
                  <div>
                    <h4 style={{fontSize:'.875rem',marginBottom:'.2rem'}}>{s.t}</h4>
                    <p style={{color:'var(--text2)',fontSize:'.8rem',lineHeight:1.6}}>{s.d}</p>
                  </div>
                </div>
              ))}
              <div style={{background:'var(--g50)',border:'1px solid var(--g100)',borderRadius:10,padding:'.875rem',display:'flex',alignItems:'center',gap:'.75rem',marginTop:'.5rem'}}>
                <div style={{width:34,height:34,background:'var(--g100)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="fas fa-check" style={{color:'var(--g600)',fontSize:12}}/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:'.8rem',fontWeight:600,color:'var(--g700)'}}>Secure connection</p>
                  <p style={{fontSize:'.75rem',color:'var(--text2)'}}>Data transmitted securely</p>
                </div>
                <div className="pulse-dot"/>
              </div>
            </div>

            <div style={{background:'linear-gradient(135deg,var(--g700),var(--g900))',borderRadius:16,padding:'1.25rem',color:'#fff'}}>
              <h3 style={{fontSize:'1rem',marginBottom:'.75rem',fontFamily:'Syne,sans-serif'}}>Why BackSpace?</h3>
              {[{i:'fa-infinity',c:'var(--g300)',t:'Truly unlimited storage'},
                {i:'fa-bolt',    c:'var(--gold)',t:'Lightning fast uploads'},
                {i:'fa-shield',  c:'var(--g300)',t:'Military-grade security'},
                {i:'fa-mobile-alt',c:'#93c5fd',t:'Any device, anytime'},
              ].map(f=>(
                <div key={f.t} style={{display:'flex',alignItems:'center',gap:'.625rem',marginBottom:'.5rem',fontSize:'.875rem'}}>
                  <i className={`fas ${f.i}`} style={{color:f.c,fontSize:13,width:16,textAlign:'center'}}/>
                  <span style={{opacity:.9}}>{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
