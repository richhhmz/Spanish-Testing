import React from 'react';
import { DefaultHeader } from './DefaultHeader.jsx';
import { DefaultFooter } from './DefaultFooter.jsx';

export default function WaitingForEmail() {
  return (
    <div>
      <div className="ml-[0.25in] mt-8 max-w-lg">
        <h2 className="text-2xl font-semibold">Check your email</h2>
        <p className="mt-2">
          If that email exists, we sent a sign-in link. Click it to finish logging in.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          The link expires in about 10 minutes.
        </p>
      </div>
    </div>
  );
}
