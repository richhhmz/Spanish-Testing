import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export const DefaultHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  const handleLogout = () => {
    // Remove the actual token your Login.jsx checks
    localStorage.removeItem('authToken');

    // Optional cleanup (safe even if unused)
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    localStorage.removeItem('effectiveUserId');
    localStorage.removeItem('realUserId');

    navigate('/login', { replace: true });
  };

  return (
    <div className="w-full mt-4 mb-4">
      <div className="ml-[0.25in] flex items-center gap-x-3">
        
        {/* Home button (hidden when already on '/') */}
        {!isHomePage && (
          <Link
            to="/"
            className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400 focus:outline-none"
          >
            Home
          </Link>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400 focus:outline-none"
        >
          Logout
        </button>

      </div>
    </div>
  );
};
