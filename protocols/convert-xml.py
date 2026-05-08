#!/usr/bin/env python3
"""
Convert Wayland protocol XML files to JSON for use by wayland-debug-reader.

Usage:
    python3 convert-xml.py /usr/share/wayland/wayland.xml > wayland.json
    python3 convert-xml.py /usr/share/wayland-protocols/stable/xdg-shell/xdg-shell.xml > xdg-shell.json

Output format:
{
  "interface_name": {
    "method_name": ["arg1_name", "arg2_name", ...],
    ...
  },
  ...
}

Special handling: untyped new_id args (no interface attribute, e.g. wl_registry.bind)
are expanded to 3 entries in the output to match what libwayland prints in the debug log:
  XML:  <arg name="id" type="new_id"/>
  Log:  ..., "wl_foo", 3, new wl_foo#42
  JSON: ["...", "interface", "version", "id"]
"""

import sys
import json
import xml.etree.ElementTree as ET


def convert_protocol_xml(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()

    protocols = {}

    for interface in root.findall('interface'):
        iface_name = interface.get('name')
        methods = {}

        for msg in interface.findall('request') + interface.findall('event'):
            method_name = msg.get('name')
            args = []
            for arg in msg.findall('arg'):
                arg_type = arg.get('type')
                arg_iface = arg.get('interface')
                arg_name = arg.get('name')

                # Untyped new_id (no interface attr) is expanded by libwayland
                # into 3 wire arguments: interface_name(string), version(uint), new_id
                if arg_type == 'new_id' and arg_iface is None:
                    args.append('interface')
                    args.append('version')
                    args.append(arg_name)
                else:
                    args.append(arg_name)

            methods[method_name] = args

        protocols[iface_name] = methods

    return protocols


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <protocol.xml> [protocol2.xml ...]", file=sys.stderr)
        sys.exit(1)

    merged = {}
    for path in sys.argv[1:]:
        merged.update(convert_protocol_xml(path))

    print(json.dumps(merged, indent=2))


if __name__ == '__main__':
    main()
