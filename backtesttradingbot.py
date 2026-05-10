import ccxt
import pandas as pd
import numpy as np
import time

SYMBOL = 'BTC/USDT'
TIMEFRAME = '1d'  # Probamos con velas diarias
SMA_SHORT = 10    # Media móvil rápida
SMA_LONG = 50     # Media móvil lenta
INITIAL_CAPITAL = 1000 # Capital elegido para la simulación

print(f"--- INICIANDO BACKTEST PARA {SYMBOL} ---")
print(f"Capital Inicial: ${INITIAL_CAPITAL}")

# Usamos Binance como fuente de datos (no requiere API Key para datos públicos)
exchange = ccxt.binance()

print("Descargando datos históricos... (esto puede tardar unos segundos)")
# Descargamos las últimas 365 velas (1 año aprox)
ohlcv = exchange.fetch_ohlcv(SYMBOL, TIMEFRAME, limit=365)

# Convertimos a DataFrame de Pandas
df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')

# 2. CALCULAR INDICADORES
# Calculamos las medias móviles sobre el precio de cierre ('close')
df['SMA_Short'] = df['close'].rolling(window=SMA_SHORT).mean()
df['SMA_Long'] = df['close'].rolling(window=SMA_LONG).mean()

# 3. LÓGICA DE LA ESTRATEGIA (SIMULACIÓN)
# Signal = 1 (Comprar), Signal = -1 (Vender), Signal = 0 (Mantener)
df['Signal'] = 0
# Donde la media corta sea MAYOR que la larga, marcamos señal de compra (1)
df.loc[df['SMA_Short'] > df['SMA_Long'], 'Signal'] = 1
# Calculamos la "Posición" (si compramos ayer, hoy seguimos comprados)
df['Position'] = df['Signal'].diff()

# 4. CALCULAR RESULTADOS (RETORNO)
# Calculamos el retorno diario del activo (Bitcoin)
df['Market_Return'] = df['close'].pct_change()
# Nuestro retorno es: El retorno del mercado * Si estábamos comprados ayer (shift 1)
df['Strategy_Return'] = df['Market_Return'] * df['Signal'].shift(1)

# Acumulamos las ganancias
df['Cumulative_Market_Return'] = (1 + df['Market_Return']).cumprod() * INITIAL_CAPITAL
df['Cumulative_Strategy_Return'] = (1 + df['Strategy_Return']).cumprod() * INITIAL_CAPITAL

# 5. REPORTE FINAL
final_market_value = df.iloc[-1]['Cumulative_Market_Return']
final_strategy_value = df.iloc[-1]['Cumulative_Strategy_Return']

print("\n" + "="*40)
print(" RESULTADOS DEL BACKTEST")
print("="*40)
print(f"Estrategia: Cruce de Medias ({SMA_SHORT}/{SMA_LONG})")
print(f"Periodo: {df.iloc[0]['timestamp'].date()} hasta {df.iloc[-1]['timestamp'].date()}")
print("-" * 30)
print(f"Capital Final (Buy & Hold BTC): ${final_market_value:.2f}")
print(f"Capital Final (Tu Bot):         ${final_strategy_value:.2f}")
print("-" * 30)

# Comparativa
if final_strategy_value > final_market_value:
    print("✅ ¡TU BOT VENCIÓ AL MERCADO!")
else:
    print("❌ El mercado ganó (Buy & Hold fue mejor).")
    print("   -> Tip: Intenta ajustar los valores de SMA_SHORT y SMA_LONG.")

# Opcional: Guardar datos en CSV para revisar en Excel
# df.to_csv("backtest_results.csv")
# 6. VISUALIZACIÓN GRÁFICA (NUEVO)
import matplotlib.pyplot as plt

plt.figure(figsize=(12, 6))
plt.plot(df['timestamp'], df['Cumulative_Market_Return'], label='Buy & Hold (BTC)', color='gray', linestyle='--')
plt.plot(df['timestamp'], df['Cumulative_Strategy_Return'], label='Tu Bot (Cruce Medias)', color='green')

plt.title(f'Backtest: Bot vs Mercado ({SYMBOL})')
plt.xlabel('Fecha')
plt.ylabel('Capital Acumulado ($)')
plt.legend()
plt.grid(True, alpha=0.3)

# Guardar el gráfico en un archivo
plt.savefig('backtest_chart.png')
print("\n📊 Gráfico guardado como 'backtest_chart.png'. ¡Revísalo!")

# Mostrar el gráfico (si estás en entorno local)
# plt.show()