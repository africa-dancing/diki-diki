import { supabase } from '../../config/supabase';

export async function getAllContests() {
  const { data: contests, error } = await supabase
    .from('contests')
    .select('*');
  if (error) {
    console.error('Supabase error:', error);
    throw new Error('CONTESTS_FETCH_FAILED');
  }

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*');

  return contests?.map(c => ({
    ...c,
    candidates: candidates?.filter(cd => cd.contest_id === c.id) || [],
  }));
}

export async function getActiveContests() {
  const { data: contests, error } = await supabase
    .from('contests')
    .select('*')
    .eq('status', 'active');
  if (error) throw new Error('CONTESTS_FETCH_FAILED');

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*');

  return contests?.map(c => ({
    ...c,
    candidates: candidates?.filter(cd => cd.contest_id === c.id) || [],
  }));
}

export async function getUpcomingContests() {
  const { data: contests, error } = await supabase
    .from('contests')
    .select('*')
    .eq('status', 'open');
  if (error) throw new Error('CONTESTS_FETCH_FAILED');

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*');

  return contests?.map(c => ({
    ...c,
    candidates: candidates?.filter(cd => cd.contest_id === c.id) || [],
  }));
}

// ── CRÉER une compétition ──
export async function createContest(payload: any) {
  const { data, error } = await supabase
    .from('contests')
    .insert([{
      title:       payload.title,
      discipline:  payload.discipline,
      comp_type:   payload.comp_type,
      status:      payload.status ?? 'active',
      duration_days: payload.duration_days ?? 30,
      starts_at:   payload.starts_at ?? new Date().toISOString(),
      ends_at:     payload.ends_at,
      description: payload.description ?? null,
    }])
    .select()
    .single();
  if (error) {
    console.error('Supabase create error:', error);
    throw new Error('CONTEST_CREATE_FAILED');
  }
  return data;
}

// ── MODIFIER une compétition ──
export async function updateContest(id: string, payload: any) {
  const allowed: any = {};
  ['title','discipline','comp_type','status','starts_at','ends_at','description'].forEach(k => {
    if (payload[k] !== undefined) allowed[k] = payload[k];
  });

  const { data, error } = await supabase
    .from('contests')
    .update(allowed)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Supabase update error:', error);
    throw new Error('CONTEST_UPDATE_FAILED');
  }
  return data;
}

// ── SUPPRIMER une compétition ──
export async function deleteContest(id: string) {
  // Supprime d'abord les candidats liés
  await supabase.from('candidates').delete().eq('contest_id', id);

  const { error } = await supabase
    .from('contests')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Supabase delete error:', error);
    throw new Error('CONTEST_DELETE_FAILED');
  }
  return { id, deleted: true };
}
