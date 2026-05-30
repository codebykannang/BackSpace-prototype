import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {useToast} from './Toast';

export default function Navbar(){
  const{user,logout}=useAuth();
  const loc=useLocation(); const nav=useNavigate(); const toast=useToast();
  const[open,setOpen]=useState(false);

  const doLogout=async()=>{await logout();toast('Logged out','success');nav('/');setOpen(false);};
  const al=(p)=>loc.pathname===p?'nav-link active':'nav-link';
  const mal=(p)=>loc.pathname===p?'mob-link active':'mob-link';
  const close=()=>setOpen(false);

  return(
    <>
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to={user?'/dashboard':'/'} className="navbar-logo" onClick={close}>
          <img src="/assets/logo_icon.png" alt="BackSpace"/>
          <span className="navbar-logo-text">BackSpace</span>
        </Link>

        {user?(
          <>
            <div className="nav-links">
              <Link to="/dashboard" className={al('/dashboard')}><i className="fas fa-tachometer-alt"/>Dashboard</Link>
              <Link to="/files"     className={al('/files')}><i className="fas fa-folder-open"/>Files</Link>
              <Link to="/sharing"   className={al('/sharing')}><i className="fas fa-share-alt"/>Sharing</Link>
              <Link to="/trash"     className={al('/trash')}><i className="fas fa-trash-alt"/>Trash</Link>
            </div>
            <div className="nav-user">
              <Link to="/profile" style={{display:'flex',alignItems:'center',gap:'.625rem'}} onClick={close}>
                <div className="avatar">{user.username?.[0]?.toUpperCase()}</div>
                <span style={{fontSize:'.875rem',fontWeight:600,color:'var(--text)'}} className="hide-tablet">{user.username}</span>
              </Link>
              <button onClick={doLogout} className="btn-icon danger hide-tablet" title="Logout">
                <i className="fas fa-sign-out-alt"/>
              </button>
              <button className="nav-mobile-btn" onClick={()=>setOpen(v=>!v)} aria-label="Menu">
                <i className={`fas ${open?'fa-times':'fa-bars'}`} style={{fontSize:16}}/>
              </button>
            </div>
          </>
        ):(
          <div className="flex items-center gap-3">
            <Link to="/login"    className="btn btn-secondary btn-sm" onClick={close}>Sign In</Link>
            <Link to="/register" className="btn btn-primary  btn-sm hide-phone" onClick={close}>Get Started Free</Link>
            <button className="nav-mobile-btn" onClick={()=>setOpen(v=>!v)} aria-label="Menu">
              <i className={`fas ${open?'fa-times':'fa-bars'}`} style={{fontSize:16}}/>
            </button>
          </div>
        )}
      </div>
    </nav>

    {/* Mobile drawer */}
    <div className={`mobile-drawer${open?' open':''}`}>
      {user?(
        <>
          <div style={{display:'flex',alignItems:'center',gap:'1rem',padding:'.75rem 1rem 1.25rem',borderBottom:'1px solid var(--border)',marginBottom:'.375rem'}}>
            <div className="avatar" style={{width:48,height:48,fontSize:'1.125rem'}}>{user.username?.[0]?.toUpperCase()}</div>
            <div>
              <div style={{fontWeight:700,fontSize:'1rem',color:'var(--text)'}}>{user.username}</div>
              <div style={{fontSize:'.8125rem',color:'var(--text2)'}}>{user.email}</div>
            </div>
          </div>
          <Link to="/dashboard" className={mal('/dashboard')} onClick={close}><i className="fas fa-tachometer-alt"/>Dashboard</Link>
          <Link to="/files"     className={mal('/files')}     onClick={close}><i className="fas fa-folder-open"/>Files</Link>
          <Link to="/sharing"   className={mal('/sharing')}   onClick={close}><i className="fas fa-share-alt"/>Sharing</Link>
          <Link to="/trash"     className={mal('/trash')}     onClick={close}><i className="fas fa-trash-alt"/>Trash</Link>
          <Link to="/profile"   className={mal('/profile')}   onClick={close}><i className="fas fa-user"/>Profile</Link>
          <div className="mob-divider"/>
          <button className="mob-link" onClick={doLogout} style={{color:'var(--red)'}}>
            <i className="fas fa-sign-out-alt" style={{color:'var(--red)'}}/>Sign Out
          </button>
        </>
      ):(
        <>
          <Link to="/login"    className="mob-link" onClick={close}><i className="fas fa-sign-in-alt"/>Sign In</Link>
          <Link to="/register" className="mob-link" onClick={close}><i className="fas fa-user-plus"/>Create Account</Link>
        </>
      )}
    </div>
    </>
  );
}
