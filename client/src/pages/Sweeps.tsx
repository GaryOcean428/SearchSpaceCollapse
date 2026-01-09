import React, { useEffect, useState } from 'react';

interface Sweep {
  id: string;
  status: string;
  metrics: any;
}

const Sweeps: React.FC = () => {
  const [sweeps, setSweeps] = useState<Sweep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sweeps')
      .then(res => res.json())
      .then(data => {
        setSweeps(data.sweeps || []);
        setLoading(false);
      });
  }, []);

  const handleAudit = (id: string) => {
    fetch(`/api/sweeps/${id}/audit`, { method: 'GET' });
  };

  const handleApprove