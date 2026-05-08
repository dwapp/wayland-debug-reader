// ─── Protocol Argument Name Lookup ──────────────────────────────────────────
// ALL_PROTOCOL_DATA is defined by protocols/all-protocols.js, which must be
// loaded via <script> before this file. Regenerate with:
//   cd protocols && bash build-all.sh

const protocolRegistry = (typeof ALL_PROTOCOL_DATA !== 'undefined') ? ALL_PROTOCOL_DATA : {};

/**
 * Get argument names for a given interface + method.
 * @param {string} interfaceName - e.g. "wl_keyboard"
 * @param {string} methodName    - e.g. "repeat_info"
 * @returns {string[]|null}      - arg names array, or null if unknown
 */
function getArgNames(interfaceName, methodName) {
  const iface = protocolRegistry[interfaceName];
  if (!iface) return null;
  const args = iface[methodName];
  return (args && args.length) ? args : null;
}
