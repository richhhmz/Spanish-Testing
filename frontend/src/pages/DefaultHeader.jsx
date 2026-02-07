import React from 'react';
import { Link } from 'react-router-dom';

export const DefaultHeader = () => (
  <div className='mb-4 ml-[5.0in]'>
    <Link
      to='/spanish/home'
      className='px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400 focus:outline-none'
    >
      Home
    </Link>
  </div>
);
