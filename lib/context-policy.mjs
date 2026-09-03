export const PRIMARY_CONTEXT_AGENTS = Object.freeze(["plan", "build", "review", "research"])

function contextPolicyError(message) {
  return new Error(`Operational context policy: ${message}`)
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw contextPolicyError(`${label} must be a positive integer`)
  return value
}

export function validateModelContextBudget(limit, reserved, label = "model") {
  if (!limit || typeof limit !== "object" || Array.isArray(limit)) throw contextPolicyError(`${label} limit must be an object`)
  const context = positiveInteger(limit.context, `${label} limit.context`)
  const input = positiveInteger(limit.input, `${label} limit.input`)
  const output = positiveInteger(limit.output, `${label} limit.output`)
  const reserve = positiveInteger(reserved, "compaction.reserved")
  if (input + output > context) {
    throw contextPolicyError(`${label} limit.input + limit.output must not exceed limit.context`)
  }
  if (reserve >= input) {
    throw contextPolicyError(`compaction.reserved must be smaller than ${label} limit.input`)
  }
  return Object.freeze({
    contextTokens: context,
    inputTokens: input,
    outputTokens: output,
    reservedTokens: reserve,
    warningTokens: input - reserve,
    hardLimitTokens: input,
  })
}

function resolvedModel(config, agent) {
  const reference = config?.agent?.[agent]?.model ?? config?.model
  if (typeof reference !== "string" || !reference.trim()) {
    throw contextPolicyError(`${agent} must resolve a configured model through agent.${agent}.model or config.model`)
  }
  const separator = reference.indexOf("/")
  if (separator <= 0 || separator === reference.length - 1) {
    throw contextPolicyError(`${agent} model reference ${reference} must use provider/model form`)
  }
  const providerName = reference.slice(0, separator)
  const modelName = reference.slice(separator + 1)
  const model = config?.provider?.[providerName]?.models?.[modelName]
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    throw contextPolicyError(`${agent} model ${reference} is not configured under provider.${providerName}.models.${modelName}`)
  }
  return { reference, model }
}

export function derivePrimaryContextPolicy(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw contextPolicyError("live configuration must be an object")
  }
  const reserved = positiveInteger(config?.compaction?.reserved, "compaction.reserved")
  const derived = {}
  for (const agent of PRIMARY_CONTEXT_AGENTS) {
    const { reference, model } = resolvedModel(config, agent)
    derived[agent] = Object.freeze({
      model: reference,
      ...validateModelContextBudget(model.limit, reserved, `${agent} model ${reference}`),
    })
  }
  return Object.freeze(derived)
}

export function unwrapLiveConfig(response) {
  const config = response?.data ?? response
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw contextPolicyError("client.config.get() did not return a live configuration object")
  }
  return config
}
