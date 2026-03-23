import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function QCRedirectPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/qc/production/runs/${runId}`, { replace: true });
  }, [navigate, runId]);

  return null;
}
