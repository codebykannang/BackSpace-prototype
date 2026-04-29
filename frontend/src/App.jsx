import React from 'react';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {AuthProvider,useAuth} from './context/AuthContext';
import {ToastProvider} from './components/Toast';
import Navbar from './components/Navbar';
import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import DashboardPage    from './pages/DashboardPage';
import FileManagementPage from './pages/FileManagementPage';
import FileSharingPage  from './pages/FileSharingPage';
import TrashPage        from './pages/TrashPage';
import UserProfilePage  from './pages/UserProfilePage';
import SharePage        from './pages/SharePage';

function Guard({children}){
  const{user,loading}=useAuth();
  if(loading) return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'1rem'}}>
      <img src="/assets/logo_icon.png" alt="BackSpace" style={{width:64,height:64,borderRadius:16,animation:'pulse 1.5s ease-in-out infinite'}}/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{fontFamily:'Outfit,sans-serif',fontWeight:700,color:'var(--green-700)',fontSize:'1.25rem'}}>BackSpace</div>
      <div className="spin"/>
    </div>
  );
  return user?children:<Navigate to="/login" replace/>;
}

function Layout(){
  return(
    <>
      <Navbar/>
      <Routes>
        <Route path="/"         element={<LandingPage/>}/>
        <Route path="/login"    element={<LoginPage/>}/>
        <Route path="/register" element={<RegisterPage/>}/>
        <Route path="/share/:token" element={<SharePage/>}/>
        <Route path="/dashboard" element={<Guard><DashboardPage/></Guard>}/>
        <Route path="/files"    element={<Guard><FileManagementPage/></Guard>}/>
        <Route path="/sharing"  element={<Guard><FileSharingPage/></Guard>}/>
        <Route path="/trash"    element={<Guard><TrashPage/></Guard>}/>
        <Route path="/profile"  element={<Guard><UserProfilePage/></Guard>}/>
        <Route path="*"         element={<Navigate to="/" replace/>}/>
      </Routes>
    </>
  );
}

export default function App(){
  return(
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Layout/>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
