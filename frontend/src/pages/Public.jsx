import React from 'react';

export const Public = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow p-8">

        <h1 className="text-3xl font-bold text-gray-900 text-center">
          Progressive Spanish Learning
        </h1>

        <p className="mt-6 text-gray-700 leading-relaxed">
          This application teaches Spanish vocabulary using a progressive learning
          system which allows the user to focus more on what they are learning and
          to waste less time on the words they know well. It gives the user complete
          control of their personal learning routine.
        </p>

        <div className="mt-6 text-gray-900">
          <div className="text-lg font-semibold">
            Price: $5.00/month
          </div>

          <div className="mt-1 text-sm text-gray-600">
            Cancel anytime.
          </div>
        </div>
      </div>
    </div>
  );
};
