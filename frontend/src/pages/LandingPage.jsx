import React,{useEffect,useState,useRef} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import axios from 'axios';

const FEATURES=[
  {icon:'fa-infinity',   title:'Truly Unlimited',  desc:"No storage caps ever. Powered by Telegram's infrastructure.",  color:'var(--g600)', bg:'var(--g50)'},
  {icon:'fa-bolt',       title:'Lightning Uploads', desc:'Upload files up to 5 GB with real-time progress tracking.',    color:'var(--amber)',bg:'var(--amber-bg)'},
  {icon:'fa-shield-alt', title:'Military Security', desc:'bcrypt hashing, server sessions, encrypted transit.',          color:'var(--blue)', bg:'var(--blue-bg)'},
  {icon:'fa-share-alt',  title:'Smart Sharing',     desc:'Links with expiry dates, access limits & revocation.',         color:'#7c3aed',    bg:'#f5f3ff'},
  {icon:'fa-folder-tree',title:'Folder System',     desc:'Nested folders with breadcrumbs and drag-drop upload.',        color:'#ea580c',    bg:'#fff7ed'},
  {icon:'fa-trash-restore',title:'Full Restore',    desc:'Soft-delete trash with restore or permanent deletion.',        color:'#0284c7',    bg:'#f0f9ff'},
];

export default function LandingPage(){
  const{user}=useAuth(); const nav=useNavigate();
  const[stats,setStats]=useState({total_users:0,total_files:0});
  const cvs=useRef(); const mouse=useRef({x:.5,y:.5});

  useEffect(()=>{ if(user) nav('/dashboard'); },[user,nav]);
  useEffect(()=>{ axios.get('/api/public/stats').then(r=>setStats(r.data)).catch(()=>{}); },[]);

  useEffect(()=>{
    const c=cvs.current; if(!c) return;
    const ctx=c.getContext('2d');
    let W,H,raf;
    const resize=()=>{W=c.width=c.offsetWidth;H=c.height=c.offsetHeight;};
    resize(); window.addEventListener('resize',resize);
    const pts=Array.from({length:75},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,r:Math.random()*2.5+.8}));
    const onMove=e=>{const rect=c.getBoundingClientRect();const t=e.touches?e.touches[0]:e;mouse.current.x=(t.clientX-rect.left)/W;mouse.current.y=(t.clientY-rect.top)/H;};
    c.addEventListener('mousemove',onMove);c.addEventListener('touchmove',onMove,{passive:true});
    const draw=()=>{
      ctx.clearRect(0,0,W,H);
      const mx=mouse.current.x*W,my=mouse.current.y*H;
      pts.forEach(p=>{
        const dx=p.x-mx,dy=p.y-my,d=Math.sqrt(dx*dx+dy*dy);
        const rep=d<100?(100-d)/100:0;
        p.vx+=dx/(d||1)*rep*.6;p.vy+=dy/(d||1)*rep*.6;
        p.vx*=.97;p.vy*=.97;p.x+=p.vx;p.y+=p.vy;
        if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fill();
      });
      for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<130){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(255,255,255,${(1-d/130)*.15})`;ctx.lineWidth=.7;ctx.stroke();}
      }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);};
  },[]);

  return(
    <div>
      <style>{`
        @keyframes heroIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blobFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-18px) rotate(4deg)}}
        @keyframes blobFloat2{0%,100%{transform:translateY(0)}50%{transform:translateY(12px)}}
        .feat-card{transition:transform .25s,box-shadow .25s}
        .feat-card:hover{transform:translateY(-5px);box-shadow:var(--sh-lg)}
        .feat-card:hover .feat-icon-wrap{transform:scale(1.1) rotate(-5deg)}
        .feat-icon-wrap{transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
      `}</style>

      {/* ─── HERO ─────────────────────────────────────────── */}
      <section style={{position:'relative',overflow:'hidden',minHeight:'100svh',display:'flex',alignItems:'center',
        background:'linear-gradient(155deg,var(--g950) 0%,var(--g900) 30%,var(--g800) 65%,var(--g700) 100%)'}}>
        <canvas ref={cvs} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.85}}/>

        {/* Spinning rings */}
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:1}}>
          {[560,400,280].map((s,i)=>(
            <div key={s} style={{position:'absolute',width:s,height:s,top:-s/2,left:-s/2,borderRadius:'50%',
              border:`1px solid rgba(255,255,255,${.05-i*.01})`,
              animation:`spinRing ${38+i*18}s linear infinite${i%2?' reverse':''}`,
            }}/>
          ))}
        </div>

        {/* Floating blobs */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1}}>
          {[{s:220,t:'6%',r:'5%',col:'rgba(255,255,255,.03)',an:'blobFloat',br:'60% 40% 30% 70%/60% 30% 70% 40%'},
            {s:150,b:'8%',l:'4%',col:'rgba(232,184,75,.05)',an:'blobFloat2',br:'30% 70% 70% 30%/30% 30% 70% 70%'},
            {s:110,t:'52%',r:'15%',col:'rgba(93,170,150,.07)',an:'blobFloat',br:'50% 50% 30% 70%/50% 70% 30% 50%'},
          ].map((b,i)=>(
            <div key={i} style={{position:'absolute',width:b.s,height:b.s,top:b.t,bottom:b.b,left:b.l,right:b.r,
              background:b.col,borderRadius:b.br,animation:`${b.an} ${7+i*2}s ease-in-out infinite`,
              backdropFilter:'blur(2px)',boxShadow:'0 20px 50px rgba(0,0,0,.1)',
            }}/>
          ))}
        </div>

        <div style={{maxWidth:1360,margin:'0 auto',padding:'clamp(4rem,10vw,5rem) clamp(1rem,5vw,2rem)',position:'relative',zIndex:2,width:'100%'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,460px),1fr))',gap:'clamp(2.5rem,6vw,4rem)',alignItems:'center'}}>
            {/* Text */}
            <div style={{animation:'heroIn .8s ease both'}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(255,255,255,.1)',backdropFilter:'blur(14px)',borderRadius:9999,padding:'.375rem 1rem',marginBottom:'clamp(1rem,3vw,1.75rem)',border:'1px solid rgba(255,255,255,.18)'}}>
                <div className="pulse-dot" style={{background:'var(--g300)'}}/>
                <span style={{fontSize:'.8125rem',fontWeight:600,color:'rgba(255,255,255,.9)'}}>Unlimited Storage · Zero Cost</span>
              </div>
              <h1 style={{fontSize:'clamp(2rem,6vw,4.25rem)',fontFamily:'Syne,sans-serif',fontWeight:800,color:'#fff',lineHeight:1.1,marginBottom:'clamp(1rem,3vw,1.5rem)',letterSpacing:'-.03em'}}>
                Store Everything,<br/>
                <span style={{background:'linear-gradient(90deg,var(--g300),#c2e8e1)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Pay Nothing</span>
              </h1>
              <p style={{fontSize:'clamp(.9rem,2vw,1.125rem)',color:'rgba(255,255,255,.72)',lineHeight:1.8,marginBottom:'clamp(1.5rem,4vw,2rem)',maxWidth:480}}>
                Break free from storage limits. BackSpace uses Telegram's infrastructure for truly unlimited cloud storage with enterprise-grade security — free forever.
              </p>
              <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',marginBottom:'clamp(1.5rem,4vw,2.5rem)'}}>
                <Link to="/register" className="btn btn-xl" style={{background:'#fff',color:'var(--g800)',fontWeight:800,boxShadow:'0 8px 32px rgba(255,255,255,.2)',minWidth:200,justifyContent:'center'}}>
                  <i className="fas fa-rocket"/>Get Started Free
                </Link>
                <a href="#features" className="btn btn-xl" style={{background:'rgba(255,255,255,.1)',color:'#fff',border:'2px solid rgba(255,255,255,.25)',backdropFilter:'blur(8px)',minWidth:160,justifyContent:'center'}}>
                  <i className="fas fa-play-circle"/>Learn More
                </a>
              </div>
              <div style={{display:'flex',gap:'clamp(1rem,4vw,2.5rem)',flexWrap:'wrap',paddingTop:'1.5rem',borderTop:'1px solid rgba(255,255,255,.1)'}}>
                {[{n:`${stats.total_users}+`,l:'Users'},{n:`${stats.total_files}+`,l:'Files stored'},{n:'50 GB+',l:'Per account'}].map(s=>(
                  <div key={s.l}>
                    <div style={{fontSize:'clamp(1.1rem,3vw,1.5rem)',fontWeight:800,color:'#fff',fontFamily:'Syne,sans-serif'}}>{s.n}</div>
                    <div style={{fontSize:'.8rem',color:'rgba(255,255,255,.5)',marginTop:'.15rem'}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3D card mockup */}
            <div style={{animation:'heroIn .8s .2s ease both'}}>
              <div className="card-3d" style={{
                background:'rgba(255,255,255,.07)',backdropFilter:'blur(24px)',borderRadius:24,
                border:'1px solid rgba(255,255,255,.14)',padding:'clamp(1.25rem,3vw,1.75rem)',
                boxShadow:'40px 40px 80px rgba(0,0,0,.5),-4px -4px 20px rgba(255,255,255,.04)',
              }}
                onMouseEnter={e=>e.currentTarget.style.transform='perspective(1000px) rotateY(-1deg) rotateX(1deg) scale(1.02)'}
                onMouseLeave={e=>e.currentTarget.style.transform='perspective(1000px) rotateY(-6deg) rotateX(3deg)'}
              >
                <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'1.25rem'}}>
                  <img src="/assets/logo_icon.png" alt="" style={{width:26,height:26,borderRadius:6}}/>
                  <span style={{fontFamily:'Syne,sans-serif',fontWeight:700,color:'rgba(255,255,255,.9)',fontSize:'.875rem'}}>BackSpace Dashboard</span>
                  <div style={{marginLeft:'auto',display:'flex',gap:'.3rem'}}>
                    {['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{width:9,height:9,borderRadius:'50%',background:c}}/>)}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'.625rem',marginBottom:'1rem'}}>
                  {[{i:'fa-database',l:'Storage',v:'2.4 GB',c:'#6ab8a2'},{i:'fa-file',l:'Files',v:'147',c:'#fcd34d'},{i:'fa-share',l:'Shared',v:'8',c:'#93c5fd'},{i:'fa-clock',l:'Actions',v:'23',c:'#f9a8d4'}].map(s=>(
                    <div key={s.l} style={{background:'rgba(255,255,255,.07)',borderRadius:10,padding:'.625rem'}}>
                      <i className={`fas ${s.i}`} style={{color:s.c,fontSize:12,marginBottom:'.3rem',display:'block'}}/>
                      <div style={{fontSize:'clamp(.875rem,2vw,1rem)',fontWeight:800,color:'#fff',fontFamily:'Syne,sans-serif',lineHeight:1}}>{s.v}</div>
                      <div style={{fontSize:'.68rem',color:'rgba(255,255,255,.45)',marginTop:'.175rem'}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:'.875rem',padding:'.625rem',background:'rgba(255,255,255,.04)',borderRadius:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.375rem'}}>
                    <span style={{fontSize:'.72rem',color:'rgba(255,255,255,.55)'}}>Storage</span>
                    <span style={{fontSize:'.72rem',color:'var(--g300)',fontWeight:700}}>4.8%</span>
                  </div>
                  <div style={{height:4,background:'rgba(255,255,255,.1)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:'4.8%',background:'linear-gradient(90deg,var(--g300),var(--g200))',borderRadius:99}}/>
                  </div>
                </div>
                {['Project_Report.pdf','vacation_2025.jpg','data_backup.zip'].map((f,i)=>(
                  <div key={f} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.4rem .5rem',borderRadius:7,background:'rgba(255,255,255,.04)',marginBottom:'.25rem'}}>
                    <i className={`fas ${['fa-file-pdf','fa-image','fa-file-archive'][i]}`} style={{color:['#f87171','#c084fc','#fb923c'][i],fontSize:11,flexShrink:0}}/>
                    <span style={{fontSize:'.72rem',color:'rgba(255,255,255,.7)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f}</span>
                    <span style={{fontSize:'.65rem',color:'rgba(255,255,255,.3)',flexShrink:0}}>{['2.1MB','4.8MB','12MB'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────── */}
      <section id="features" style={{padding:'clamp(3rem,8vw,6rem) clamp(1rem,4vw,2rem)',background:'#fff'}}>
        <div style={{maxWidth:1360,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'clamp(2rem,5vw,3.5rem)'}}>
            <span style={{display:'inline-block',background:'var(--g50)',color:'var(--g700)',fontSize:'.72rem',fontWeight:800,padding:'.375rem 1rem',borderRadius:9999,marginBottom:'.875rem',letterSpacing:'.08em',textTransform:'uppercase',border:'1px solid var(--g100)'}}>FEATURES</span>
            <h2 style={{fontSize:'clamp(1.625rem,4vw,2.75rem)',fontFamily:'Syne,sans-serif',fontWeight:800,letterSpacing:'-.025em',marginBottom:'.875rem'}}>Everything You Need</h2>
            <p style={{color:'var(--text2)',fontSize:'clamp(.875rem,2vw,1.0625rem)',maxWidth:500,margin:'0 auto',lineHeight:1.75}}>Powerful tools for personal and professional file management, built for reliability.</p>
          </div>
          <div className="grid-3">
            {FEATURES.map(f=>(
              <div key={f.title} className="card feat-card" style={{padding:'clamp(1.25rem,3vw,1.875rem)'}}>
                <div className="feat-icon-wrap" style={{width:54,height:54,background:f.bg,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1.125rem',boxShadow:`0 4px 16px ${f.color}22`}}>
                  <i className={`fas ${f.icon}`} style={{fontSize:22,color:f.color}}/>
                </div>
                <h3 style={{fontSize:'1rem',marginBottom:'.5rem'}}>{f.title}</h3>
                <p style={{color:'var(--text2)',lineHeight:1.7,fontSize:'.875rem'}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ───────────────────────────────────── */}
      <section id="comparison" style={{padding:'clamp(3rem,8vw,6rem) clamp(1rem,4vw,2rem)',background:'var(--bg)'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'clamp(2rem,5vw,3rem)'}}>
            <span style={{display:'inline-block',background:'var(--g50)',color:'var(--g700)',fontSize:'.72rem',fontWeight:800,padding:'.375rem 1rem',borderRadius:9999,marginBottom:'.875rem',letterSpacing:'.08em',textTransform:'uppercase',border:'1px solid var(--g100)'}}>PRICING</span>
            <h2 style={{fontSize:'clamp(1.5rem,4vw,2.5rem)',fontFamily:'Syne,sans-serif',fontWeight:800,letterSpacing:'-.025em'}}>BackSpace vs The Rest</h2>
          </div>
          <div className="grid-3" style={{alignItems:'start'}}>
            {[{n:'Google Drive',s:'15 GB',    p:'$2.99/mo for 100GB',star:false},
              {n:'BackSpace',   s:'Unlimited',p:'100% Free, Forever', star:true},
              {n:'Dropbox',     s:'2 GB',     p:'$9.99/mo for 2TB',  star:false}].map(c=>(
              <div key={c.n} style={{background:c.star?'linear-gradient(135deg,var(--g700),var(--g900))':'#fff',borderRadius:20,padding:'clamp(1.25rem,3vw,1.75rem)',textAlign:'center',position:'relative',overflow:'hidden',transform:c.star?'scale(1.04)':undefined,boxShadow:c.star?'0 24px 64px rgba(26,61,52,.35)':'var(--sh-sm)',border:c.star?'none':'1px solid var(--border)'}}>
                {c.star&&<div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,var(--gold),var(--gold-dim))'}}/>}
                {c.star&&<div style={{position:'absolute',top:10,right:10,background:'var(--gold)',color:'var(--g900)',fontSize:'.65rem',fontWeight:800,padding:'.2rem .625rem',borderRadius:99,letterSpacing:'.05em',textTransform:'uppercase'}}>BEST</div>}
                <h3 style={{fontSize:'1rem',marginBottom:'.625rem',marginTop:c.star?'.5rem':'0',color:c.star?'#fff':'var(--text)'}}>{c.n}</h3>
                <div style={{fontSize:'clamp(1.5rem,4vw,2rem)',fontWeight:800,fontFamily:'Syne,sans-serif',margin:'.875rem 0',color:c.star?'var(--g300)':'var(--g600)'}}>{c.s}</div>
                <p style={{fontSize:'.8125rem',color:c.star?'rgba(255,255,255,.65)':'var(--text2)',marginBottom:'1rem'}}>{c.p}</p>
                {c.star&&<Link to="/register" className="btn btn-block" style={{background:'#fff',color:'var(--g700)',fontWeight:700,justifyContent:'center',marginBottom:'.875rem'}}><i className="fas fa-rocket"/>Start Free</Link>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section style={{padding:'clamp(3rem,8vw,5rem) clamp(1rem,4vw,2rem)',background:'linear-gradient(155deg,var(--g900),var(--g700))',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,opacity:.04,backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'38px 38px'}}/>
        <div style={{position:'relative',zIndex:1,maxWidth:580,margin:'0 auto'}}>
          <img src="/assets/logo_icon.png" alt="" style={{width:72,height:72,margin:'0 auto 1.25rem',borderRadius:18,boxShadow:'0 12px 40px rgba(0,0,0,.4)'}}/>
          <h2 style={{fontSize:'clamp(1.625rem,5vw,3rem)',fontFamily:'Syne,sans-serif',fontWeight:800,color:'#fff',marginBottom:'.875rem',letterSpacing:'-.025em'}}>Ready to Start?</h2>
          <p style={{fontSize:'clamp(.875rem,2vw,1.0625rem)',color:'rgba(255,255,255,.72)',marginBottom:'1.75rem',lineHeight:1.75}}>Join thousands who trust BackSpace for unlimited, secure cloud storage — completely free.</p>
          <div style={{display:'flex',gap:'1rem',justifyContent:'center',flexWrap:'wrap'}}>
            <Link to="/register" className="btn btn-xl" style={{background:'#fff',color:'var(--g800)',fontWeight:800}}><i className="fas fa-rocket"/>Create Free Account</Link>
            <Link to="/login"    className="btn btn-xl" style={{background:'rgba(255,255,255,.1)',color:'#fff',border:'2px solid rgba(255,255,255,.2)'}}><i className="fas fa-sign-in-alt"/>Sign In</Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────── */}
      <footer style={{background:'var(--g950)',color:'rgba(255,255,255,.45)',padding:'clamp(1.25rem,3vw,2rem) clamp(1rem,4vw,2rem)'}}>
        <div style={{maxWidth:1360,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'.625rem'}}>
            <img src="/assets/logo_icon.png" alt="" style={{width:28,height:28,borderRadius:7}}/>
            <span style={{color:'#fff',fontWeight:700,fontFamily:'Syne,sans-serif'}}>BackSpace</span>
          </div>
          <p style={{fontSize:'.8rem'}}>© 2026 BackSpace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
