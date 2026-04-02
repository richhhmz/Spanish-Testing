import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isDebug } from '../globals';

const setCookie = (name, value, days = 30) => {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
};

const PartnerCapture = () => {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const partner = params.get('partner');

    if (partner) {
      if(isDebug){alert(`[PartnerCapture] partner=${partner}`)};
      setCookie('partner', partner, 30);
    }
  }, [location.search]);

  return null;
};

export default PartnerCapture;
