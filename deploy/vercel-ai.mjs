/* npm run vercel:ai: after adding or changing ANTHROPIC_API_KEY in backend/.env, update the live site.
   1. checks the key with Anthropic (a free model lookup; stops if it's rejected, so a bad key never reaches Vercel)
   2. saves it in Vercel (production + preview), without printing it
   3. redeploys the current live version so it uses the new key */
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const SITE = 'https://elevarepropertypartners.vercel.app';
const fail = msg => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

const env = readFileSync(new URL('backend/.env', ROOT), 'utf8').split(/\r?\n/);
const read = name =>
  env
    .filter(l => l.startsWith(`${name}=`))
    .pop()
    ?.slice(name.length + 1)
    .trim()
    .replace(/^["']|["']$/g, '');
const key = read('ANTHROPIC_API_KEY');
const model = read('AI_MODEL') || 'claude-opus-5-5';
if (!key) fail('backend/.env has no ANTHROPIC_API_KEY line.');

/* 1. does Anthropic accept it, and can it use the model? */
console.log(`Checking the key with Anthropic (model ${model})…`);
const res = await fetch(`https://api.anthropic.com/v1/models/${model}`, {
  headers: {'x-api-key': key, 'anthropic-version': '2023-06-01'}
}).catch(e => fail(`Could not reach Anthropic: ${e.message}`));
if (res.status === 401) fail('Anthropic rejected the key. Copy it again from platform.claude.com → API keys.');
if (res.status === 404) fail(`The key works but can't use ${model}. Check AI_MODEL in backend/.env.`);
if (!res.ok) fail(`Anthropic answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
console.log('✓ Key accepted.');

/* 2. save it in Vercel; the value goes through stdin, never onto the screen or the command line */
const vercel = (args, input) => {
  const r = spawnSync(['vercel', ...args].join(' '), {cwd: ROOT, input, encoding: 'utf8', shell: true});
  return {ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`};
};
for (const target of ['production', 'preview']) {
  const r = vercel(['env', 'add', 'ANTHROPIC_API_KEY', target, '--force'], key);
  if (!r.ok) fail(`Vercel didn't save ANTHROPIC_API_KEY for ${target}:\n${r.out.slice(-600).replaceAll(key, '***')}`);
  console.log(`✓ Saved in Vercel (${target}).`);
}

/* 3. rebuild the live version with the key */
console.log('Redeploying the live site (about 1–2 minutes)…');
const r = vercel(['redeploy', SITE.replace('https://', ''), '--target', 'production']);
if (!r.ok) fail(`Redeploy failed:\n${r.out.slice(-800)}`);
const health = await fetch(`${SITE}/api/health`).then(
  x => x.status,
  () => 0
);
if (health === 200) console.log(`✓ Live site redeployed with the AI key: ${SITE}`);
else fail(`The redeploy finished but ${SITE}/api/health answered ${health}. Check the Vercel logs.`);
