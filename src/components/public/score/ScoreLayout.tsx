import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingSpinner } from '../../common/LoadingSpinner';

const ScoreLayout = () => (
  <div className="min-h-screen bg-gray-900 text-white">
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    }>
      <Outlet />
    </Suspense>
  </div>
);

export default ScoreLayout;
