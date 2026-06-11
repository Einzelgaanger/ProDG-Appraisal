/**
 * Create Supabase auth users + profiles for the ProDG appraisal roster.
 *
 * Requires in .env (or environment):
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_DEFAULT_PASSWORD
 *
 * Usage: node scripts/seed-prodg-users.mjs
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

const SUBSIDIARY = 'ProDG';

/** @type {{ email: string; name: string; role: 'admin' | 'pm' | 'developer' }[]} */
const ROSTER = [
  { email: 'wayne@prodg.studio', name: 'Wayne Asava', role: 'admin' },
  { email: 'noella@prodg.studio', name: 'Noella Spitz', role: 'admin' },
  { email: 'abdul@prodg.studio', name: 'Abdul Rehmtulla', role: 'admin' },
  { email: 'arabella@prodg.studio', name: 'Arabella Fanisheba', role: 'admin' },
  { email: 'jerome@prodg.studio', name: 'Jerome Mahia', role: 'pm' },
  { email: 'sumeiya@prodg.studio', name: 'Sumeiya Abdulle', role: 'pm' },
  { email: 'venessa@prodg.studio', name: 'Venessa Chebukwa', role: 'pm' },
  { email: 'nathan@prodg.studio', name: 'Nathan Mbugua', role: 'pm' },
  { email: 'waynewilliams2028@gmail.com', name: 'Wayne Williams', role: 'developer' },
  { email: 'ocomilj@gmail.com', name: 'Jude Ocomi', role: 'developer' },
  { email: 'munyaolance1@gmail.com', name: 'Munyao Lance', role: 'developer' },
  { email: 'stoniedev@gmail.com', name: 'Winstone Were', role: 'developer' },
  { email: 'mugambirintaugu@gmail.com', name: 'Mugambi Rintaugu', role: 'developer' },
  { email: 'kelvin.maritim0@gmail.com', name: 'Kelvin Maritim', role: 'developer' },
  { email: 'mannuehkipkirui@gmail.com', name: 'Emmanuel Langat', role: 'developer' },
  { email: 'emmanuelnomondi@gmail.com', name: 'Emmanuel N. Omondi', role: 'developer' },
  { email: 'mylesadebayo2021@gmail.com', name: 'Myles Adebayo Johnson', role: 'developer' },
  { email: 'franklinkaranja774@gmail.com', name: 'Franklin Karanja', role: 'developer' },
  { email: 'alloys@eutopiantech.com', name: 'Alloys Amasakha', role: 'developer' },
  { email: 'davengahu007@gmail.com', name: 'Dave Ngahu', role: 'developer' },
  { email: 'makenawahu@gmail.com', name: 'Makena Wahu', role: 'developer' },
  { email: 'corneliusmutisya11@gmail.com', name: 'Cornelius Mutisya', role: 'developer' },
];

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

async function upsertEmployee(subsidiaryId, person) {
  const isPM = person.role === 'pm';
  const department =
    person.role === 'admin' ? 'Admin' : person.role === 'pm' ? 'Project Management' : 'Engineering';

  const { data: existing } = await admin
    .from('employees')
    .select('id')
    .ilike('email', person.email)
    .eq('subsidiary_id', subsidiaryId)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from('employees')
      .update({ name: person.name, is_pm: isPM, department })
      .eq('id', existing.id);
    return existing.id;
  }

  const { data: created, error } = await admin
    .from('employees')
    .insert({
      name: person.name,
      email: person.email,
      subsidiary_id: subsidiaryId,
      is_pm: isPM,
      department,
    })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

async function setRoles(userId, role) {
  if (role === 'admin') {
    await admin.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
    await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'pm');
  } else if (role === 'pm') {
    await admin.from('user_roles').upsert({ user_id: userId, role: 'pm' }, { onConflict: 'user_id,role' });
    await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
  } else {
    await admin.from('user_roles').delete().eq('user_id', userId).in('role', ['admin', 'pm']);
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

  await setRoles(userId, person.role);
  return action;
}

async function main() {
  const subsidiaryId = await resolveSubsidiaryId();
  const summary = { created: 0, updated: 0, errors: [] };

  console.log(`Seeding ${ROSTER.length} users into ${SUBSIDIARY}…\n`);

  for (const person of ROSTER) {
    try {
      const action = await seedPerson(subsidiaryId, person);
      if (action === 'created') summary.created++;
      else summary.updated++;
      console.log(`  ✓ ${person.role.padEnd(9)} ${person.email}`);
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
