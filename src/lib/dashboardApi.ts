import axios from 'axios';
import { getAuthHeaders } from './apiHelper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types
export interface DashboardStats {
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  failedCalls: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  successRate: number;
  totalAgents: number;
  activeAgents: number;
  totalCampaigns: number;
  activeCampaigns: number;
}

export interface TrendData {
  value: number;
  change: number;
  isUp: boolean;
}

export interface DashboardTrends {
  calls: TrendData;
  completed: TrendData;
  missed: TrendData;
  duration: TrendData;
  successRate: TrendData;
}

export interface RecentCall {
  id: string;
  caller: string;
  agentName: string;
  duration: string;
  durationSeconds: number;
  time: string;
  status: 'completed' | 'missed' | 'ongoing' | 'failed';
  callType: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  trends: DashboardTrends;
  recentCalls: RecentCall[];
  period: string;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalCalls: number;
  completedCalls: number;
  successRate: number;
  avgDuration: number;
}

export interface CallsByHour {
  hour: number;
  count: number;
}

export interface CallsByDay {
  date: string;
  count: number;
  completed: number;
  missed: number;
}

/**
 * Fetch complete dashboard data
 */
export async function fetchDashboard(
  period: 'today' | 'week' | 'month' = 'week'
): Promise<{ success: boolean; data?: DashboardResponse; message?: string }> {
  try {
    const headers = getAuthHeaders();
    console.log('Fetching dashboard with headers:', headers ? 'Auth present' : 'No auth');
    
    const response = await axios.get(`${API_URL}/dashboard?period=${period}`, {
      headers,
    });
    
    console.log('Dashboard response:', response.data);
    return { success: true, data: response.data?.data };
  } catch (error: any) {
    console.error('Error fetching dashboard:', {
      status: error?.response?.status,
      message: error?.response?.data?.message,
      error: error?.message,
    });
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Failed to fetch dashboard',
    };
  }
}

/**
 * Fetch only stats (lighter payload)
 */
export async function fetchDashboardStats(
  period: 'today' | 'week' | 'month' = 'week'
): Promise<{
  success: boolean;
  data?: { stats: DashboardStats; trends: DashboardTrends; period: string };
  message?: string;
}> {
  try {
    const response = await axios.get(`${API_URL}/dashboard/stats?period=${period}`, {
      headers: getAuthHeaders(),
    });
    return { success: true, data: response.data?.data };
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to fetch stats',
    };
  }
}

/**
 * Fetch agent performance
 */
export async function fetchAgentPerformance(
  limit: number = 5
): Promise<{ success: boolean; data?: AgentPerformance[]; message?: string }> {
  try {
    const response = await axios.get(`${API_URL}/dashboard/agents?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return { success: true, data: response.data?.data };
  } catch (error: any) {
    console.error('Error fetching agent performance:', error);
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to fetch agent performance',
    };
  }
}

/**
 * Fetch calls by hour
 */
export async function fetchCallsByHour(): Promise<{
  success: boolean;
  data?: CallsByHour[];
  message?: string;
}> {
  try {
    const response = await axios.get(`${API_URL}/dashboard/calls/hourly`, {
      headers: getAuthHeaders(),
    });
    return { success: true, data: response.data?.data };
  } catch (error: any) {
    console.error('Error fetching hourly calls:', error);
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to fetch hourly calls',
    };
  }
}

/**
 * Fetch calls by day
 */
export async function fetchCallsByDay(
  days: number = 7
): Promise<{ success: boolean; data?: CallsByDay[]; message?: string }> {
  try {
    const response = await axios.get(`${API_URL}/dashboard/calls/daily?days=${days}`, {
      headers: getAuthHeaders(),
    });
    return { success: true, data: response.data?.data };
  } catch (error: any) {
    console.error('Error fetching daily calls:', error);
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to fetch daily calls',
    };
  }
}
