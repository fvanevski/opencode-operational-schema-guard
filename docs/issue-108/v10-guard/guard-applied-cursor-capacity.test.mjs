// Offline contract test for the installed V2 adapter's imported V5 guard core.
// Run only against a COMPLETE, isolated, copied plugin tree with the candidate
// operation-guard-core.mjs in place (never against the live plugin import path).
//   OPERATION_GUARD_CORE_MODULE=/isolated/plugins/operational-schema-v5/lib/operation-guard-core.mjs \
//       node --test guard-applied-cursor-capacity.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const specified = process.env.OPERATION_GUARD_CORE_MODULE
if (!specified || !specified.startsWith('/')) throw new Error('OPERATION_GUARD_CORE_MODULE must be an absolute path to a DISPOSABLE COPY')
const { createOperationGuard } = await import(pathToFileURL(specified).href)
const id = (n) => `ses_candidate_${String(n).padStart(6, '0')}`
const msg = (n) => `msg_candidate_${String(n).padStart(6, '0')}`
const text = (n) => `Safe offline admission sample ${n}`
const turn = (n) => ({ sessionID: id(n), messageID: msg(n), text: text(n), agent: 'build' })

await test('v10 128-cursor state preserves replay/order and admits session #129', async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), 'ghdev-108-cursor-'))
  t.after(async () => { await rm(scratch, { recursive: true, force: true }) })
  const directory = join(scratch, 'workspace')
  const stateDirectory = join(scratch, 'states')
  const statePath = join(stateDirectory, `${createHash('sha256').update(resolve(directory)).digest('hex')}.json`)
  const guard = () => createOperationGuard({ directory, stateDirectory })
  const first = guard()

  for (let n = 0; n < 128; n++) {
    const out = await first.admitDeliveredUserTurn(turn(n))
    assert.equal(out?.applied, true, `fresh cursor ${n}`)
  }
  const pre = JSON.parse(await readFile(statePath, 'utf8'))
  assert.equal(pre.version, 10)
  assert.equal(pre.appliedTurns.length, 128)
  const preCursors = new Map(pre.appliedTurns.map(row => [row.sessionID, row]))

  const extra = await first.admitDeliveredUserTurn(turn(128))
  assert.equal(extra.applied, true, 'the prior permanent 128-cursor denial must not occur')
  const after = JSON.parse(await readFile(statePath, 'utf8'))
  assert.equal(after.version, 10, 'cap-only change must retain the persisted schema')
  assert.equal(after.appliedTurns.length, 129)
  for (const before of preCursors.values()) {
    assert.deepEqual(after.appliedTurns.find(row => row.sessionID === before.sessionID), before,
      `old authoritative cursor must survive unmodified: ${before.sessionID}`)
  }

  const restarted = guard()
  assert.deepEqual(await restarted.admitDeliveredUserTurn(turn(0)),
    { applied: false, duplicate: true }, 'replay dedup must survive process restart')
  await assert.rejects(
    restarted.admitDeliveredUserTurn({ ...turn(0), text: 'Changed content under the same message ID' }),
    /content changed|identity is invalid/i,
  )
  await assert.rejects(
    restarted.admitDeliveredUserTurn({ ...turn(0), messageID: 'msg_out_of_order', previousMessageID: 'not_the_prior_id' }),
    /order disagrees/i,
  )
  const next = await restarted.admitDeliveredUserTurn({ ...turn(0), messageID: 'msg_after_initial', previousMessageID: msg(0) })
  assert.equal(next.applied, true)
  assert.equal((await guard().deliveredCursor(id(0)))?.messageID, 'msg_after_initial')

  // Strict validation must not silently drop excess/invalid cursors.
  // The local copy can be safely altered because no application-owned state is used.
  const corrupted = JSON.parse(await readFile(statePath, 'utf8'))
  corrupted.appliedTurns[0].textSha256 = 'invalid'
  await writeFile(statePath, JSON.stringify(corrupted))
  await assert.rejects(guard().reloadSafetyStrict(), /applied-turn identity is invalid/)
})

await test('malformed v10 cursor cannot be erased by ordinary delivered-turn admission or implicit save', async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), 'ghdev-108-cursor-invalid-'))
  t.after(async () => { await rm(scratch, { recursive: true, force: true }) })
  const directory = join(scratch, 'workspace')
  const stateDirectory = join(scratch, 'states')
  const statePath = join(stateDirectory, `${createHash('sha256').update(resolve(directory)).digest('hex')}.json`)
  const guard = () => createOperationGuard({ directory, stateDirectory })
  const initial = guard()
  assert.equal((await initial.admitDeliveredUserTurn(turn(1))).applied, true)
  const intact = await readFile(statePath)
  const corrupted = JSON.parse(intact.toString())
  corrupted.appliedTurns[0].textSha256 = 'invalid'
  await writeFile(statePath, JSON.stringify(corrupted))
  const corruptBytes = await readFile(statePath)
  const restarted = guard()
  await assert.rejects(restarted.admitDeliveredUserTurn(turn(2)), /invalid persisted workspace authority state/)
  assert.deepEqual(await readFile(statePath), corruptBytes, 'rejected admission must not overwrite invalid ledger')
  await assert.rejects(restarted.reloadSafetyStrict(), /persisted applied-turn identity is invalid/)
  assert.deepEqual(await readFile(statePath), corruptBytes, 'failed strict reload must not overwrite invalid ledger')
  // An operator-authenticated restore is modeled only in disposable test state.
  await writeFile(statePath, intact)
  await restarted.reloadSafetyStrict()
  assert.equal((await restarted.admitDeliveredUserTurn(turn(2))).applied, true)
  assert.equal(JSON.parse(await readFile(statePath, 'utf8')).appliedTurns.length, 2)
})
