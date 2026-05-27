import { supabase } from '../../config/supabase';

export async function getAllContests() {
  ('📋 getAllContests appelé');
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

  ('🎯 Contests IDs:', contests?.map(c => c.id));
 ('🎯 Premier candidat complet:', JSON.stringify(candidates?.[0]));

  return contests?.map(c => ({
    ...c,
candidates: candidates?.filter(cd => {
  (`compare: "${cd.contest_id}" === "${c.id}" → ${cd.contest_id === c.id}`);
  return cd.contest_id === c.id;
}) || [],
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