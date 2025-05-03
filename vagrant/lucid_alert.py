import subprocess
import re

# Regex para extraer el valor de 'DDOS%' desde una línea de salida
ddos_regex = re.compile(r"'DDOS%': '([\d\.]+)'")

# Ejecuta el script en modo live
process = subprocess.Popen(
    ["sudo", "python3", "lucid_cnn.py", "--predict_live", "eth0", "--model", "./output/10t-10n-DOS2019-LUCID.h5", "--dataset_type", "DOS2019"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

# Lee la salida línea por línea
for line in process.stdout:
    print(line, end="")  # Puedes comentar esto si no quieres toda la salida
    match = ddos_regex.search(line)
    if match:
        ddos_percent = float(match.group(1))
        print(f"DDOS%: {ddos_percent}")
        if ddos_percent > 50.0:
            print("ALERTA: Tráfico sospechoso, DDOS% =", ddos_percent)
