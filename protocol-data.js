// ─── Protocol Argument Name Lookup ──────────────────────────────────────────
// Loads Wayland protocol definitions (pre-converted from XML to JSON) and
// provides argument name lookup for rendering named parameters in log lines.
//
// Data format: { "interface_name": { "method_name": ["arg1", "arg2", ...] }
//
// Two loading modes:
//   1. Sync: include all-protocols.js via <script> before this file.
//      The global ALL_PROTOCOL_DATA will be auto-merged on load.
//   2. Async: call loadProtocolJSON(url) to fetch a JSON file.

/**
 * Global registry of protocol argument definitions.
 * Multiple protocol files can be merged into this object.
 */
const protocolRegistry = {};

// Auto-merge embedded data if present (loaded via <script src="protocols/all-protocols.js">)
if (typeof ALL_PROTOCOL_DATA !== 'undefined') {
  Object.assign(protocolRegistry, ALL_PROTOCOL_DATA);
  console.log(`[protocol-data] Loaded ${Object.keys(ALL_PROTOCOL_DATA).length} interfaces (embedded)`);
}

/**
 * Load a protocol JSON file and merge it into the global registry.
 * @param {string} url - path to the JSON file (e.g. "protocols/wayland.json")
 * @returns {Promise<void>}
 */
function loadProtocolJSON(url) {
  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
      return res.json();
    })
    .then(data => {
      Object.assign(protocolRegistry, data);
      console.log(`[protocol-data] Loaded ${Object.keys(data).length} interfaces from ${url}`);
    })
    .catch(err => {
      console.warn(`[protocol-data] ${err.message}`);
    });
}

/**
 * Get argument names for a given interface + method.
 * @param {string} interfaceName - e.g. "wl_keyboard"
 * @param {string} methodName - e.g. "repeat_info"
 * @returns {string[]|null} - array of arg names, or null if not found
 */
function getArgNames(interfaceName, methodName) {
  const iface = protocolRegistry[interfaceName];
  if (!iface) return null;
  const args = iface[methodName];
  if (!args || args.length === 0) return null;
  return args;
}
