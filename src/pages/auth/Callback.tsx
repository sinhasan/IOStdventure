import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    setTimeout(() => navigate('/dashboard'), 1000);
  }, [navigate]);
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
}
