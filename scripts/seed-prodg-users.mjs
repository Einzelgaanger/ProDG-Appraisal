/**
 * Create Supabase auth users + profiles for the ProDG appraisal roster.
 *
 * Roster source: scripts/prodg-roster.json (PeopleDets PDF + Alfred/Alfiema)
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_DEFAULT_PASSWORD
 *
 * Usage: npm run seed:users
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword = process.env.SEED_DEFAULT_PASSWORD;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!defaultPassword || defaultPassword.length < 8) {
  console.error('Set SEED_DEFAULT_PASSWORD in .env (min 8 characters) before running.');
  process.exit(1);
}

const ROSTER = JSON.parse(
  readFileSync(resolve(__dirname, 'prodg-roster.json'), 'utf8'),
);

const SUBSIDIARY = 'ProDG';

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resolveSubsidiaryId() {
  const { data: existing } = await admin
    .from('subsidiaries')
    .select('id')
    .ilike('name', SUBSIDIARY)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: inserted, error } = await admin
    .from('subsidiaries')
    .insert({ name: SUBSIDIARY })
    .select('id')
    .single();
  if (error) throw error;
  return inserted.id;
}

async function findUserIdByEmail(email) {
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  return profile?.id ?? null;
}

function personRoles(person) {
  return person.roles ?? [];
}

async function upsertEmployee(subsidiaryId, person) {
  const roles = personRoles(person);
  const isPM = roles.includes('pm');
  const department = roles.includes('admin')
    ? 'Admin'
    : roles.includes('pm')
      ? 'Project Management'
      : 'Engineering';

  const row = {
    name: person.name,
    email: person.email.toLowerCase().trim(),
    phone: person.phone ?? null,
    subsidiary_id: subsidiaryId,
    is_pm: isPM,
    department,
  };

  const { data: existing } = await admin
    .from('employees')
    .select('id')
    .ilike('email', person.email)
    .eq('subsidiary_id', subsidiaryId)
    .maybeSingle();

  if (existing?.id) {
    await admin.from('employees').update(row).eq('id', existing.id);
    return existing.id;
  }

  const { data: created, error } = await admin
    .from('employees')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

async function setRoles(userId, person) {
  const roles = new Set(personRoles(person));
  if (roles.has('admin')) {
    await admin.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
  } else {
    await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
  }
  if (roles.has('pm')) {
    await admin.from('user_roles').upsert({ user_id: userId, role: 'pm' }, { onConflict: 'user_id,role' });
  } else {
    await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'pm');
  }
}

async function seedPerson(subsidiaryId, person) {
  const email = person.email.toLowerCase().trim();
  let userId = await findUserIdByEmail(email);
  let action = 'updated';

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
    });
    if (error) {
      if (error.message.includes('already been registered')) {
        userId = await findUserIdByEmail(email);
        if (!userId) throw new Error(`${email}: registered but no profile found`);
      } else {
        throw error;
      }
    } else {
      userId = data.user.id;
      action = 'created';
    }
  }

  const employeeId = await upsertEmployee(subsidiaryId, person);

  await admin.from('profiles').upsert({
    id: userId,
    email,
    name: person.name,
    employee_id: employeeId,
  });

  await setRoles(userId, person);
  return action;
}

async function main() {
  const subsidiaryId = await resolveSubsidiaryId();
  const summary = { created: 0, updated: 0, errors: [] };

  console.log(`Seeding ${ROSTER.length} users into ${SUBSIDIARY} (PeopleDets roster)…\n`);

  for (const person of ROSTER) {
    try {
      const action = await seedPerson(subsidiaryId, person);
      if (action === 'created') summary.created++;
      else summary.updated++;
      console.log(`  ✓ ${person.roles.join('+').padEnd(12)} ${person.email}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`${person.email}: ${msg}`);
      console.error(`  ✗ ${person.email}: ${msg}`);
    }
  }

  console.log('\nDone:', summary);
  if (summary.errors.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
