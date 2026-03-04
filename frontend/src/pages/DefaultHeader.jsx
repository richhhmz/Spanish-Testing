import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/AxiosClient';

export const DefaultHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout', null, { withCredentials: true });
    } catch (err) {
      console.error('[handleLogout] logout request failed:', err);
    }

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
