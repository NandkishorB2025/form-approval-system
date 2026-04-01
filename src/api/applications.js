import { supabase } from '../config/supabaseClient.js';

const TABLE_NAME = 'applications';

export async function submitForm(formData) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([formData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit form: ${error.message}`);
  }

  return data;
}

export async function getApplications() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch applications: ${error.message}`);
  }

  return data;
}

export async function updateStatus(id, status) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }

  return data;
}
