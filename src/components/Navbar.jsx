import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, CheckSquare, Settings } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="glass-nav">
      <div className="nav-container">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Home size={24} />
          <span>홈</span>
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Calendar size={24} />
          <span>캘린더</span>
        </NavLink>
        <NavLink to="/checklist" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <CheckSquare size={24} />
          <span>체크리스트</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Settings size={24} />
          <span>설정</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
