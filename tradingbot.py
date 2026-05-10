import yfinance as yf
import pandas as pd
import matplotlib.pyplot as plt

# 1. CONFIGURACIÓN
SYMBOL = "BTC-USD"
START_DATE = "2024-01-01"
END_DATE = "2026-05-01"

print(f"--- INICIANDO ANÁLISIS DE {SYMBOL} ---")
print("Descargando datos de mercado...")

# 2. DESCARGA DE DATOS
try:
    data = yf.download(SYMBOL, start=START_DATE, end=END_DATE, progress=False)
    if data.empty:
        print("Error: No se descargaron datos. Revisa tu conexión a internet.")
    else:
        print(f"Datos descargados exitosamente: {len(data)} registros.")

        # 3. ESTRATEGIA: CRUCE DE MEDIAS (GOLDEN CROSS)
        # Calculamos el promedio de precio de 50 días y 200 días
        data['SMA_50'] = data['Close'].rolling(window=50).mean()
        data['SMA_200'] = data['Close'].rolling(window=200).mean()

        # 4. REPORTE
        latest_price = float(data['Close'].iloc[-1])
        print(f"\nPrecio Actual {SYMBOL}: ${latest_price:,.2f}")
        
        # Lógica simple: Si la media corta > media larga = TENDENCIA ALCISTA
        last_sma_50 = data['SMA_50'].iloc[-1]
        last_sma_200 = data['SMA_200'].iloc[-1]
        
        if last_sma_50 > last_sma_200:
            print("TENDENCIA DETECTADA: 🟢 ALCISTA (Bullish) - Posible Compra")
        else:
            print("TENDENCIA DETECTADA: 🔴 BAJISTA (Bearish) - Posible Venta")

        # 5. GRÁFICO
        print("\nGenerando gráfico...")
        plt.figure(figsize=(10,5))
        plt.plot(data['Close'], label='Precio BTC', color='black', alpha=0.5)
        plt.plot(data['SMA_50'], label='SMA 50', color='green')
        plt.plot(data['SMA_200'], label='SMA 200', color='red')
        plt.title(f'Análisis Técnico: {SYMBOL} (Cruce de Medias)')
        plt.legend()
        plt.grid(True)
        plt.show()
        print("¡Análisis completado!")

except Exception as e:
    print(f"Ocurrió un error inesperado: {e}")