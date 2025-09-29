import React from 'react';

export function Spinner() {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="animate-spin h-6 w-6 border-2 rounded-full border-t-transparent"></div>
    </div>
  );
}

export default Spinner; 