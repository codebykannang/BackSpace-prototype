import React,{createContext,useContext,useState,useEffect} from 'react';
import axios from 'axios';
axios.defaults.withCredentials=true;
const Ctx=createContext(null);
export function AuthProvider({children}){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    axios.get('/api/auth/me').then(r=>{if(r.data.success)setUser(r.data.user)}).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  const login=async(email,password)=>{const r=await axios.post('/api/auth/login',{email,password});if(r.data.success)setUser(r.data.user);return r.data;};
  const register=async(email,password,confirm_password)=>{const r=await axios.post('/api/auth/register',{email,password,confirm_password});if(r.data.success)setUser(r.data.user);return r.data;};
  const logout=async()=>{await axios.post('/api/auth/logout');setUser(null);};
  return <Ctx.Provider value={{user,setUser,loading,login,register,logout}}>{children}</Ctx.Provider>;
}
export const useAuth=()=>useContext(Ctx);
