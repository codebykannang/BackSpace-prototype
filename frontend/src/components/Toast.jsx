import React,{createContext,useContext,useState,useCallback} from 'react';
const TC=createContext(null);
export function ToastProvider({children}){
  const[toasts,set]=useState([]);
  const add=useCallback((msg,type='info',ms=3500)=>{
    const id=Date.now();
    set(p=>[...p,{id,msg,type}]);
    setTimeout(()=>set(p=>p.filter(t=>t.id!==id)),ms);
  },[]);
  const icons={success:'fa-check-circle',error:'fa-times-circle',info:'fa-info-circle'};
  return <TC.Provider value={add}>{children}
    <div className="toast-wrap">
      {toasts.map(t=><div key={t.id} className={`toast ${t.type}`}>
        <i className={`fas ${icons[t.type]||icons.info}`}></i><span>{t.msg}</span>
      </div>)}
    </div>
  </TC.Provider>;
}
export const useToast=()=>useContext(TC);
