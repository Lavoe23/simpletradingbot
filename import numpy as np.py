import numpy as np
import matplotlib.pyplot as plt

# --- Parámetros Físicos ---
gamma = 2.675e8    # rad/s/T (Protón)
dt = 5e-12         # Paso de tiempo fino para evitar errores numéricos
t_max = 5e-8       # 50 nanosegundos
steps = int(t_max / dt)
time = np.linspace(0, t_max, steps)

def simular_precesion(B_val):
    mu = np.array([0.0, 1.0, 1.0])
    mu = mu / np.linalg.norm(mu)
    hist_x, hist_y = np.zeros(steps), np.zeros(steps)
    
    for i in range(steps):
        hist_x[i], hist_y[i] = mu[0], mu[1]
        torque = gamma * np.cross(mu, np.array([0, 0, B_val]))
        mu = mu + torque * dt
        mu = mu / np.linalg.norm(mu) # Conservación de la magnitud
    return hist_x, hist_y

# Ejecución de simulaciones
x15, y15 = simular_precesion(1.5)
x75, y75 = simular_precesion(7.5)

# --- Gráfico ---
plt.figure(figsize=(12, 7))

# Caso 1.5 T: Paleta de Azules (Líneas sólidas)
plt.plot(time*1e9, x15, color='#1f77b4', label='$\mu_x$ (1.5 T)', linestyle='-', linewidth=2.5)
plt.plot(time*1e9, y15, color='#aec7e8', label='$\mu_y$ (1.5 T)', linestyle='-', linewidth=2.5)

# Caso 7.5 T: Paleta de Rojos/Naranjas (Líneas punteadas para mayor contraste)
plt.plot(time*1e9, x75, color='#d62728', label='$\mu_x$ (7.5 T)', linestyle='--', linewidth=1.5)
plt.plot(time*1e9, y75, color='#ff9896', label='$\mu_y$ (7.5 T)', linestyle='--', linewidth=1.5)

plt.title("Comparación de Precesión: 1.5 T vs 7.5 T")
plt.xlabel("Tiempo (nanosegundos)")
plt.ylabel("Componente $\mu_x$")
plt.legend()
plt.grid(True)
plt.show()