const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('dkdk_token') : null;
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'NETWORK_ERROR' }));
    throw new Error(err.error || 'API_ERROR');
  }
  return res.json();
}

export const api = {
  auth: {
    sendOTP:   (phone: string) =>
      apiFetch('/auth/send-otp', { method:'POST', body:JSON.stringify({ phone }) }),
    verifyOTP: (phone: string, otp: string) =>
      apiFetch('/auth/verify-otp', { method:'POST', body:JSON.stringify({ phone, otp }) }),
    register:  (data: Record<string, any>) =>
      apiFetch('/auth/register', { method:'POST', body:JSON.stringify(data) }),
    login:     (phone: string, password: string) =>
      apiFetch<{ token:string; user:any }>('/auth/login', {
        method:'POST', body:JSON.stringify({ phone, password }),
      }),
  },
  profile: {
    get:    (userId: string) => apiFetch<any>(`/users/${userId}`),
    update: (data: Record<string, any>) =>
      apiFetch('/users/me', { method:'PUT', body:JSON.stringify(data) }),
    me:     () => apiFetch<any>('/users/me'),
  },
  contests: {
    list:      () => apiFetch<any>('/contests'),
    get:       (id: string) => apiFetch<any>(`/contests/${id}`),
    create:    (data: any) =>
      apiFetch('/contests', { method:'POST', body:JSON.stringify(data) }),
    setStatus: (id: string, status: string) =>
      apiFetch(`/contests/${id}/status`, { method:'PUT', body:JSON.stringify({ status }) }),
  },
  votes: {
    cast: (contestId: string, candidateId: string) =>
      apiFetch<{ message:string; remaining:number; votesRemaining:number; new_balance:number }>(
        '/votes', { method:'POST', body:JSON.stringify({ contestId, candidateId }) }
      ),
    castGroup: (contest_id: string, group_id: string) =>
      apiFetch<{ success:boolean; new_balance:number }>(
        '/votes', { method:'POST', body:JSON.stringify({ contest_id, group_id }) }
      ),
    hasVoted: (contestId: string) =>
      apiFetch<{ voted:boolean; vote:any }>(`/votes/check/${contestId}`),
    ranking:  (contestId: string) => apiFetch<any>(`/votes/ranking/${contestId}`),
  },
  videos: {
    upload: (data: Record<string, any>) =>
      apiFetch('/videos/upload', { method:'POST', body:JSON.stringify(data) }),
    my:       () => apiFetch<{ videos:any[] }>('/videos/my'),
    pending:  () => apiFetch<{ videos:any[]; count:number }>('/videos/pending'),
    moderate: (videoId: string, decision: string, reason?: string) =>
      apiFetch(`/videos/${videoId}/moderate`, {
        method:'PUT', body:JSON.stringify({ decision, reason }),
      }),
    delete:   (videoId: string) => apiFetch(`/videos/${videoId}`, { method:'DELETE' }),
    constraints: () => apiFetch<any>('/videos/constraints'),
  },
  groups: {
    create:      (contest_id: string, name: string) =>
      apiFetch('/groups', { method:'POST', body:JSON.stringify({ contest_id, name }) }),
    join:        (groupId: string) =>
      apiFetch(`/groups/${groupId}/join`, { method:'POST' }),
    submitVideo: (groupId: string, video_id: string) =>
      apiFetch(`/groups/${groupId}/video`, { method:'PUT', body:JSON.stringify({ video_id }) }),
    ranking:     (contestId: string) => apiFetch<any>(`/groups/ranking/${contestId}`),
    mine:        () => apiFetch<{ groups:any[] }>('/groups/mine'),
  },
  wallet: {
    get: () =>
      apiFetch<{ balance:number; votesAvailable:number; canVote:boolean }>('/votes/balance'),
    initiate: (operator: string, phone: string, amount: number) =>
      apiFetch('/payment/initiate', {
        method:'POST', body:JSON.stringify({ operator, phone, amount }),
      }),
  },
  notifications: {
    getAll:      () => apiFetch<{ notifications:any[]; unread:number }>('/notifications'),
    markRead:    (id: string) => apiFetch(`/notifications/${id}/read`, { method:'PUT' }),
    markAllRead: () => apiFetch('/notifications/read-all', { method:'PUT' }),
  },
  stats: {
    global: () => apiFetch<any>('/stats'),
  },
};