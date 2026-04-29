import React,{useEffect,useRef} from 'react';

/* Reusable 3D particle canvas - unique per page via color/density props */
export default function Scene3D({color='#5caa96',density=50,speed=.4,lines=true,shapes=true}){
  const cvs=useRef();

  useEffect(()=>{
    const c=cvs.current; if(!c) return;
    const ctx=c.getContext('2d');
    let W,H,raf;
    const resize=()=>{W=c.width=c.offsetWidth;H=c.height=c.offsetHeight;};
    resize();
    window.addEventListener('resize',resize);

    const pts=Array.from({length:density},()=>({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*speed, vy:(Math.random()-.5)*speed,
      r:Math.random()*2.5+.5,
      a:Math.random()*.7+.3,
    }));

    const hex=color;
    const draw=()=>{
      ctx.clearRect(0,0,W,H);
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0;
        if(p.y<0)p.y=H; if(p.y>H)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=hex+(Math.round(p.a*80).toString(16).padStart(2,'0'));
        ctx.fill();
      });
      if(lines){
        for(let i=0;i<pts.length;i++){
          for(let j=i+1;j<pts.length;j++){
            const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
            const d=Math.sqrt(dx*dx+dy*dy);
            if(d<130){
              ctx.beginPath();
              ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
              ctx.strokeStyle=hex+Math.round((1-d/130)*.15*255).toString(16).padStart(2,'0');
              ctx.lineWidth=.7; ctx.stroke();
            }
          }
        }
      }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);};
  },[color,density,speed,lines]);

  return(
    <div className="scene-bg">
      {/* Base gradient */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#f4fbfa 0%,#eaf6f4 40%,#f7f9f8 100%)'}}/>
      {/* Grid */}
      <div className="grid-lines"/>
      {/* Particle canvas */}
      <canvas ref={cvs} className="scene-canvas" style={{opacity:.9}}/>
      {/* Morphing blobs */}
      {shapes&&<>
        <div className="shape shape-1"/>
        <div className="shape shape-2"/>
        <div className="shape shape-3"/>
        <div className="shape shape-4"/>
      </>}
    </div>
  );
}
