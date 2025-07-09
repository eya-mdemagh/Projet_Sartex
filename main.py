import json
import time
from pymodbus.client.sync import ModbusTcpClient
import logging
import struct
from flask import Flask, send_from_directory, request, jsonify, session, redirect, url_for
import sqlite3
import os
from flask_bcrypt import Bcrypt
from datetime import datetime
import threading

app = Flask(__name__)
app.secret_key = '8699c47d9877bfb9589a1187aaed0afb'  # Change this to a secure random value
DB_PATH = 'sartex.db'
FRONTEND_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

bcrypt = Bcrypt(app)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Create users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    # Create alarm_history table
    c.execute('''
        CREATE TABLE IF NOT EXISTS alarm_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bassin_name TEXT NOT NULL,
            alarm_type TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# Serve index.html at root
@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

# Serve details.html
@app.route('/details.html')
def serve_details():
    return send_from_directory(FRONTEND_FOLDER, 'details.html')

# Serve login.html
@app.route('/login.html')
def serve_login():
    return send_from_directory(FRONTEND_FOLDER, 'login.html')

# Serve static files (js, css, images)
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(FRONTEND_FOLDER, filename)

# User signup
@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password required.'}), 400
    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', (email, password_hash))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'User registered successfully.'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already exists.'}), 409

# User login
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password required.'}), 400
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT id, password_hash FROM users WHERE email = ?', (email,))
    user = c.fetchone()
    conn.close()
    if user and bcrypt.check_password_hash(user[1], password):
        session['user_id'] = user[0]
        session['email'] = email
        return jsonify({'success': True, 'message': 'Logged in successfully.'})
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials.'}), 401

# User logout
@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'})

# Get all bassins and their current status from data.json
@app.route('/api/bassins', methods=['GET'])
def api_bassins():
    try:
        with open('data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        # Assume data.json has a structure with bassin names as keys
        bassins = []
        for bassin_name in ["Bassin_Osmose", "Bassin_Teinture", "Bassin_Chardiniaire", "Bassin_Lavage"]:
            if bassin_name in data:
                bassins.append({
                    'name': bassin_name,
                    'status': data[bassin_name]
                })
        return jsonify({'success': True, 'bassins': bassins})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Get alarm history for a bassin, with optional filters (date, alarm_type)
@app.route('/api/bassins/<bassin_name>/alarms', methods=['GET'])
def api_bassin_alarms(bassin_name):
    alarm_type = request.args.get('alarm_type')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    query = 'SELECT alarm_type, timestamp FROM alarm_history WHERE bassin_name = ?'
    params = [bassin_name]
    if alarm_type:
        query += ' AND alarm_type = ?'
        params.append(alarm_type)
    if date_from:
        query += ' AND timestamp >= ?'
        params.append(date_from)
    if date_to:
        query += ' AND timestamp <= ?'
        params.append(date_to)
    query += ' ORDER BY timestamp DESC'
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(query, params)
    alarms = [{'alarm_type': row[0], 'timestamp': row[1]} for row in c.fetchall()]
    conn.close()
    return jsonify({'success': True, 'alarms': alarms})

# Track last alarm states to detect rising edge
last_alarm_states = {}

ALARM_TYPES = ["Alarm_Low_Level", "Alarm_High_Level", "Alarm_Thermal_P1", "Alarm_Thermal_P2"]
BASSIN_NAMES = ["Bassin_Osmose", "Bassin_Teinture", "Bassin_Chardiniaire", "Bassin_Lavage"]

def alarm_logger():
    global last_alarm_states
    while True:
        try:
            with open('data.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
            now = datetime.now().isoformat(sep=' ', timespec='seconds')
            for bassin in BASSIN_NAMES:
                if bassin not in data:
                    continue
                if bassin not in last_alarm_states:
                    last_alarm_states[bassin] = {atype: False for atype in ALARM_TYPES}
                for alarm_type in ALARM_TYPES:
                    current = bool(data[bassin].get(alarm_type))
                    previous = last_alarm_states[bassin].get(alarm_type, False)
                    if current and not previous:
                        # Rising edge: log alarm
                        conn = sqlite3.connect(DB_PATH)
                        c = conn.cursor()
                        c.execute('INSERT INTO alarm_history (bassin_name, alarm_type, timestamp) VALUES (?, ?, ?)',
                                  (bassin, alarm_type, now))
                        conn.commit()
                        conn.close()
                    last_alarm_states[bassin][alarm_type] = current
        except Exception as e:
            print(f"Alarm logger error: {e}")
        time.sleep(5)

# Start alarm logger in background
if __name__ == '__main__':
    init_db()
    threading.Thread(target=alarm_logger, daemon=True).start()
    app.run(debug=True)

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
