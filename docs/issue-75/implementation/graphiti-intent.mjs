/** Optional native OpenCode V2 Graphiti query admission. Pure/CPU-only. */
const forbidden=/(?:-----BEGIN .*PRIVATE KEY-----|Bearer\s+\S+|password\s*[:=]|\bsk-[A-Za-z0-9]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,})/i
const stop=new Set("a an and are as at be by do does did for from have has how i if in is it me my of on or our please so that the their them these this to us was were what when where which who why will with would you your tell explain show give more about know current previous history historical state".split(" "))
export function graphIntentQuery(text) {
  if(typeof text!=="string" || text.length<8 || text.length>256 ||
     /[\x00-\x1f\x7f]/.test(text) || forbidden.test(text)) return null
  const tokens=(text.match(/[A-Za-z0-9][A-Za-z0-9_.-]{2,}/g)??[])
    .map(s=>s.toLowerCase()).filter(s=>!stop.has(s))
  return tokens.length?text.replace(/\s+/g," ").trim():null
}
