// ─── Protocol Argument Name Lookup ──────────────────────────────────────────
// Loads Wayland protocol definitions (pre-converted from XML to JSON) and
// provides argument name lookup for rendering named parameters in log lines.
//
// Data format: { "interface_name": { "method_name": ["arg1", "arg2", ...] } }

/**
 * Global registry of protocol argument definitions.
 * Multiple protocol files can be merged into this object.
 */
const protocolRegistry = {};

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
