import json
import time
from pymodbus.client.sync import ModbusTcpClient
import logging
import struct

# ✅ Conversion correcte float32 pour automate Delta (little endian)
def registers_to_float(regs):
    raw = struct.pack('<HH', regs[0], regs[1])  # Little-endian
    return struct.unpack('<f', raw)[0]

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Charger la configuration JSON
with open("modbus_config.json") as f:
    config = json.load(f)

interval = config.get("interval", 5)

# Traitement des variables partagées (si @same_as_Bassin_Osmose utilisé)
def prepare_variable_sets(config):
    base_vars = None
    for automate in config["automates"]:
        if isinstance(automate["variables"], dict):
            base_vars = automate["variables"]
            break
    for automate in config["automates"]:
        if automate["variables"] == "@same_as_Bassin_Osmose":
            automate["variables"] = base_vars

prepare_variable_sets(config)

try:
    while True:
        all_data = {}

        for automate in config["automates"]:
            name = automate["name"]
            ip = automate["ip"]
            port = automate.get("port", 502)
            variables = automate["variables"]

            logging.info("🔌 Connexion à l'automate %s (%s:%s)", name, ip, port)
            client = ModbusTcpClient(ip, port=port)
            automate_data = {}

            if client.connect():
                for var_name, info in variables.items():
                    addr = info["address"]
                    var_type = info["type"]

                    try:
                        if var_type == "coil":
                            result = client.read_coils(addr, 1)
                            if result.isError():
                                raise ValueError("Erreur de lecture (coil)")
                            automate_data[var_name] = result.bits[0]

                        elif var_type == "discrete_input":
                            result = client.read_discrete_inputs(addr, 1)
                            if result.isError():
                                raise ValueError("Erreur de lecture (discrete_input)")
                            automate_data[var_name] = result.bits[0]

                        elif var_type == "holding_register":
                            if info.get("data_type") == "float32":
                                result = client.read_holding_registers(addr, 2)
                                if result.isError():
                                    raise ValueError("Erreur de lecture (float32)")
                                value = registers_to_float(result.registers)
                                automate_data[var_name] = round(value, 3)  # arrondi à 3 décimales
                            else:
                                result = client.read_holding_registers(addr, 1)
                                if result.isError():
                                    raise ValueError("Erreur de lecture (int)")
                                automate_data[var_name] = result.registers[0]
                        else:
                            raise TypeError(f"Type Modbus inconnu : {var_type}")

                    except Exception as e:
                        logging.error("%s: erreur lecture %s (%s)", name, var_name, str(e))
                        automate_data[var_name] = None

                client.close()
            else:
                logging.error("Connexion impossible à %s:%s", ip, port)
                automate_data = {var: None for var in variables}

            all_data[name] = automate_data

        # Sauvegarder les données de tous les automates
        with open("data.json", "w") as f:
            json.dump(all_data, f, indent=2)

        logging.info("✅ Données sauvegardées dans data.json")
        time.sleep(interval)

except KeyboardInterrupt:
    logging.info("🛑 Arrêt manuel du programme (Ctrl+C)")
except Exception as e:
    logging.exception("❌ Erreur critique : %s", str(e))
