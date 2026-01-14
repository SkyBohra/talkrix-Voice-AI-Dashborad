import React, { useEffect, useState } from 'react';
import { fetchAgentsByUser, deleteAgent } from '../../lib/agentApi';
import { Button } from '../ui/button';

interface AgentListProps {
  userId: string;
  onEdit: (agent: any) => void;
}

export const AgentList: React.FC<AgentListProps> = ({ userId, onEdit }) => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAgentsByUser(userId)
      .then((response) => {
        if (response.success && response.data) {
          setAgents(response.data);
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDelete = async (id: string) => {
    const response = await deleteAgent(id);
    if (response.success) {
      setAgents(agents.filter(a => a._id !== id));
    }
  };

  if (loading) return <div>Loading agents...</div>;

  return (
    <div>
      <h2>Agents</h2>
      <ul>
        {agents.map(agent => (
          <li key={agent._id} className="flex items-center gap-2">
            <span>{agent.name}</span>
            <Button onClick={() => onEdit(agent)}>Edit</Button>
            <Button variant="destructive" onClick={() => handleDelete(agent._id)}>Delete</Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
