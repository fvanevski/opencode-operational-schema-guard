#!/usr/bin/env node
import { readFile } from "node:fs/promises"
import { parseAndValidateConfig } from "../lib/config-contract.mjs"

const argv = process.argv.slice(2)
if (argv.length !== 2 || argv[0] !== "--candidate" || !argv[1].startsWith("/")) {
  throw new Error("usage: validate-config.mjs --candidate <absolute-path>")
}
parseAndValidateConfig(await readFile(argv[1], "utf8"))
process.stdout.write(`OPERATIONAL_CONFIG_RESULT: PASS; candidate=${argv[1]}\n`)
